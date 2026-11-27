/**
 * Razorpay-backed persistent order store.
 *
 * Since Vercel serverless /tmp is ephemeral, we use Razorpay itself as the
 * source of truth for order data. Status updates are written back to Razorpay
 * order notes so they survive cold starts.
 *
 * Order status key in Razorpay notes: chakung_status
 * Tracking number key:                chakung_tracking
 * Shiprocket order id key:            chakung_sr_order
 * Shiprocket shipment id key:         chakung_sr_ship
 */

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

function getAuth() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

function parseAddress(notes: Record<string, string>) {
  const rawAddress = notes.address || "";
  const pincodeMatch = rawAddress.match(/\b\d{6}\b/);
  const pincode = notes.pincode || (pincodeMatch ? pincodeMatch[0] : "737121");
  return {
    address: rawAddress || "Address provided during checkout",
    city: notes.city || "West Sikkim",
    state: notes.state || "Sikkim",
    pincode,
  };
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

export async function getAllOrders(): Promise<StoredOrder[]> {
  const auth = getAuth();
  const headers = { Authorization: auth };

  const allPayments: any[] = [];
  let skip = 0;
  for (let batch = 0; batch < 10; batch++) {
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
  }

  const orders: StoredOrder[] = [];

  for (const payment of allPayments) {
    if (payment.status !== "captured") continue;

    const paymentId = payment.id;
    const orderRef = payment.order_id || paymentId;

    // Merge payment notes + order notes
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

    // Read status/tracking written back via updateOrderStatus
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

export async function saveOrder(order: StoredOrder): Promise<void> {
  // For new orders created via our checkout, persist customer data
  // into Razorpay order notes so they survive in getAllOrders()
  if (!order.orderId) return;
  const auth = getAuth();
  const notes: Record<string, string> = {
    store: "Chakung Store, West Sikkim",
    order_type: "Village Produce Dispatch",
  };
  if (order.customer.name) notes.customer_name = order.customer.name.slice(0, 40);
  if (order.customer.phone) notes.customer_phone = order.customer.phone.slice(0, 15);
  if (order.customer.email) notes.customer_email = order.customer.email.slice(0, 60);
  if (order.customer.address) notes.address = order.customer.address.slice(0, 100);
  if (order.customer.city) notes.city = order.customer.city.slice(0, 40);
  if (order.customer.state) notes.state = order.customer.state.slice(0, 40);
  if (order.customer.pincode) notes.pincode = order.customer.pincode;
  notes.subtotal = String(order.subtotal);
  notes.shipping = String(order.shipping);

  try {
    const compact = order.items.map((i) => ({
      s: i.slug, n: i.name, w: i.weight, q: i.quantity, p: i.unitPrice, t: i.itemTotal,
    }));
    const itemsJson = JSON.stringify(compact);
    if (itemsJson.length <= 256) notes.items_json = itemsJson;
  } catch {}

  if (order.status && order.status !== "Paid / Pending Pack") {
    notes.chakung_status = order.status;
  }
  if (order.trackingNumber) notes.chakung_tracking = order.trackingNumber;
  if (order.shiprocketOrderId) notes.chakung_sr_order = String(order.shiprocketOrderId);
  if (order.shiprocketShipmentId) notes.chakung_sr_ship = String(order.shiprocketShipmentId);

  try {
    await fetch(`https://api.razorpay.com/v1/orders/${order.orderId}`, {
      method: "PATCH",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  } catch (err) {
    console.error("Failed to patch Razorpay order notes:", err);
  }
}

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
  const auth = getAuth();
  const notes: Record<string, string> = {};

  if (updates.status) notes.chakung_status = updates.status;
  if (updates.trackingNumber !== undefined) notes.chakung_tracking = updates.trackingNumber.trim();
  if (updates.shiprocketOrderId !== undefined) notes.chakung_sr_order = String(updates.shiprocketOrderId);
  if (updates.shiprocketShipmentId !== undefined) notes.chakung_sr_ship = String(updates.shiprocketShipmentId);

  if (Object.keys(notes).length === 0) return null;

  try {
    const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      method: "PATCH",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error("Razorpay order PATCH error:", err);
      return null;
    }
  } catch (err) {
    console.error("Failed to update Razorpay order:", err);
    return null;
  }

  // Return a stub — caller re-fetches getAllOrders() anyway
  return null;
}
