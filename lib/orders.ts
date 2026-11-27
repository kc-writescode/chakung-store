/**
 * Razorpay-backed persistent order store.
 *
 * Since Vercel serverless /tmp is ephemeral, Razorpay is used as the
 * source of truth. Status/tracking are written back to Razorpay order notes
 * and read back on every getAllOrders() call.
 *
 * Notes keys written by this app:
 *   chakung_status    – order workflow status
 *   chakung_tracking  – Speed Post consignment number
 *   chakung_sr_order  – Shiprocket order ID
 *   chakung_sr_ship   – Shiprocket shipment ID
 *   customer_name, customer_phone, customer_email, address, city, state, pincode
 *   items_json        – compact cart items (set at checkout)
 *   subtotal, shipping
 */

import fs from "fs";
import path from "path";
import { parseAddressFromNotes } from "./indian-address";

export interface StoredOrder {
  id: string;
  orderId?: string;
  paymentId: string;
  createdAt: string;
  status: "Paid / Pending Pack" | "Packed" | "Dispatched via Speed Post" | "Delivered";
  trackingNumber?: string;
  shiprocketOrderId?: number | string;
  shiprocketShipmentId?: number | string;
  shiprocketAwb?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: Array<{
    slug?: string;
    name: string;
    localName?: string;
    weight: string;
    quantity: number;
    unitPrice?: number;
    itemTotal?: number;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
}

// ─── Razorpay helpers ────────────────────────────────────────────────────────

function getRazorpayAuth(): string | null {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

function parseAddress(notes: Record<string, string>) {
  return parseAddressFromNotes(notes);
}

function parseItems(notes: Record<string, string>, subtotal: number) {
  if (notes.items_json) {
    try {
      const compact = JSON.parse(notes.items_json);
      if (Array.isArray(compact) && compact.length > 0) {
        return compact.map((i: any) => ({
          slug: i.s,
          name: i.n,
          weight: i.w,
          quantity: i.q,
          unitPrice: i.p,
          itemTotal: i.t,
        }));
      }
    } catch {}
  }
  return [
    {
      name: "Chakung Village Organic Harvest",
      weight: "Mountain Pack",
      quantity: 1,
      unitPrice: subtotal,
      itemTotal: subtotal,
    },
  ];
}

/** Merge-patch Razorpay order notes without overwriting unrelated keys. */
async function patchRazorpayOrderNotes(
  orderId: string,
  newNotes: Record<string, string>,
  auth: string
): Promise<void> {
  // Fetch existing notes first so we don't overwrite them
  let existingNotes: Record<string, string> = {};
  try {
    const r = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      headers: { Authorization: auth },
    });
    if (r.ok) {
      const d = await r.json();
      existingNotes = d.notes || {};
    }
  } catch {}

  const merged = { ...existingNotes, ...newNotes };

  try {
    await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      method: "PATCH",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ notes: merged }),
    });
  } catch (err) {
    console.error("Failed to patch Razorpay order notes:", err);
  }
}

// ─── Fallback: local JSON file (dev / if Razorpay creds missing) ─────────────

let memoryOrdersCache: StoredOrder[] = [];

function getOrdersFilePath(): string {
  const localDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
    return path.join(localDir, "orders.json");
  } catch {
    return path.join("/tmp", "chakung_orders.json");
  }
}

function readLocalOrders(): StoredOrder[] {
  try {
    const filePath = getOrdersFilePath();
    if (fs.existsSync(filePath)) {
      const list = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (Array.isArray(list)) return list;
    }
  } catch {}
  return memoryOrdersCache;
}

function writeLocalOrders(orders: StoredOrder[]): void {
  try {
    memoryOrdersCache = orders;
    fs.writeFileSync(getOrdersFilePath(), JSON.stringify(orders, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write orders locally:", err);
    memoryOrdersCache = orders;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch all captured orders.
 * - In production: pulls directly from Razorpay (always fresh).
 * - Fallback: local JSON file (dev environment / no creds).
 */
export async function getAllOrders(): Promise<StoredOrder[]> {
  const auth = getRazorpayAuth();
  if (!auth) {
    return readLocalOrders().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  const headers = { Authorization: auth };
  const allPayments: any[] = [];
  let skip = 0;

  for (let batch = 0; batch < 10; batch++) {
    try {
      const res = await fetch(
        `https://api.razorpay.com/v1/payments?count=100&skip=${skip}`,
        { headers }
      );
      if (!res.ok) break;
      const data = await res.json();
      const items: any[] = data.items || [];
      allPayments.push(...items);
      if (items.length < 100) break;
      skip += 100;
    } catch {
      break;
    }
  }

  const orders: StoredOrder[] = [];

  for (const payment of allPayments) {
    if (payment.status !== "captured") continue;

    const paymentId = payment.id;
    const orderRef = payment.order_id || paymentId;

    // Merge payment.notes + order.notes (order notes hold our chakung_* keys)
    let notes: Record<string, string> = { ...(payment.notes || {}) };
    if (payment.order_id) {
      try {
        const orderRes = await fetch(
          `https://api.razorpay.com/v1/orders/${payment.order_id}`,
          { headers }
        );
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          notes = { ...notes, ...(orderData.notes || {}) };
        }
      } catch {}
    }

    const amountTotal = Math.round(payment.amount / 100);
    const storedSubtotal = notes.subtotal ? parseInt(notes.subtotal) : null;
    const storedShipping = notes.shipping ? parseInt(notes.shipping) : null;
    const shipping = storedShipping ?? (amountTotal >= 500 ? 50 : 70);
    const subtotal = storedSubtotal ?? Math.max(0, amountTotal - shipping);

    const customerName = notes.customer_name || notes.name || "Online Customer";
    const customerPhone = (notes.customer_phone || payment.contact || "").replace(/^\+91/, "");
    const customerEmail = notes.customer_email || payment.email || "";

    const { address, city, state, pincode } = parseAddress(notes);
    const items = parseItems(notes, subtotal);

    const status = (notes.chakung_status as StoredOrder["status"]) || "Paid / Pending Pack";
    const trackingNumber = notes.chakung_tracking || undefined;
    const shiprocketOrderId = notes.chakung_sr_order || undefined;
    const shiprocketShipmentId = notes.chakung_sr_ship || undefined;

    orders.push({
      id: orderRef,
      orderId: orderRef,
      paymentId,
      createdAt: new Date(payment.created_at * 1000).toISOString(),
      status,
      trackingNumber,
      shiprocketOrderId,
      shiprocketShipmentId,
      customer: { name: customerName, phone: customerPhone, email: customerEmail, address, city, state, pincode },
      items,
      subtotal,
      shipping,
      total: amountTotal,
    });
  }

  return orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Persist a new order after checkout payment verification.
 * Writes customer + item data to Razorpay order notes so they survive restarts.
 * Also saves locally as backup.
 */
export async function saveOrder(order: StoredOrder): Promise<void> {
  const auth = getRazorpayAuth();

  if (auth && order.orderId) {
    const notes: Record<string, string> = {
      store: "Chakung Store, West Sikkim",
      order_type: "Village Produce Dispatch",
    };
    if (order.customer.name) notes.customer_name = order.customer.name.slice(0, 40);
    if (order.customer.phone) notes.customer_phone = order.customer.phone.slice(0, 15);
    if (order.customer.email) notes.customer_email = order.customer.email.slice(0, 60);
    if (order.customer.address) notes.address = order.customer.address.slice(0, 250);
    if (order.customer.city) notes.city = order.customer.city.slice(0, 50);
    if (order.customer.state) notes.state = order.customer.state.slice(0, 50);
    if (order.customer.pincode) notes.pincode = order.customer.pincode.slice(0, 10);
    notes.subtotal = String(order.subtotal);
    notes.shipping = String(order.shipping);

    try {
      const compact = order.items.map((i) => ({
        s: i.slug, n: i.name, w: i.weight, q: i.quantity, p: i.unitPrice, t: i.itemTotal,
      }));
      const j = JSON.stringify(compact);
      if (j.length <= 256) notes.items_json = j;
    } catch {}

    await patchRazorpayOrderNotes(order.orderId, notes, auth);
  }

  // Also persist locally (useful for dev, and as a secondary backup)
  const localOrders = readLocalOrders();
  const idx = localOrders.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    localOrders[idx] = { ...localOrders[idx], ...order };
  } else {
    localOrders.unshift(order);
  }
  writeLocalOrders(localOrders);
}

/**
 * Update order workflow status, tracking, or Shiprocket IDs.
 * Writes the update to Razorpay order notes (merge-safe) so it persists.
 */
export async function updateOrderStatus(
  orderId: string,
  updates: {
    status?: StoredOrder["status"];
    trackingNumber?: string;
    shiprocketOrderId?: number | string;
    shiprocketShipmentId?: number | string;
    shiprocketAwb?: string;
  }
): Promise<StoredOrder | null> {
  const auth = getRazorpayAuth();

  const notesToPatch: Record<string, string> = {};
  if (updates.status) notesToPatch.chakung_status = updates.status;
  if (updates.trackingNumber !== undefined) notesToPatch.chakung_tracking = updates.trackingNumber.trim();
  if (updates.shiprocketOrderId !== undefined) notesToPatch.chakung_sr_order = String(updates.shiprocketOrderId);
  if (updates.shiprocketShipmentId !== undefined) notesToPatch.chakung_sr_ship = String(updates.shiprocketShipmentId);

  if (auth && Object.keys(notesToPatch).length > 0) {
    await patchRazorpayOrderNotes(orderId, notesToPatch, auth);
  }

  // Also update locally
  const localOrders = readLocalOrders();
  const order = localOrders.find((o) => o.id === orderId);
  if (order) {
    if (updates.status) order.status = updates.status;
    if (updates.trackingNumber !== undefined) order.trackingNumber = updates.trackingNumber.trim();
    if (updates.shiprocketOrderId !== undefined) order.shiprocketOrderId = updates.shiprocketOrderId;
    if (updates.shiprocketShipmentId !== undefined) order.shiprocketShipmentId = updates.shiprocketShipmentId;
    if (updates.shiprocketAwb !== undefined) order.shiprocketAwb = updates.shiprocketAwb;
    writeLocalOrders(localOrders);
    return order;
  }

  return null;
}
