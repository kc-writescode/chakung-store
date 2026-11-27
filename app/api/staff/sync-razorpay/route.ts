import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAllOrders, saveOrder, StoredOrder } from "@/lib/orders";

const STAFF_COOKIE_NAME = "chakung_staff_auth";

async function isStaffAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  const expectedPin = (process.env.STAFF_PIN || "1400").trim();
  return token === `staff_auth_${expectedPin}`;
}

function parseAddress(notes: Record<string, string>) {
  const rawAddress = notes.address || "";
  // Extract 6-digit pincode from address if not in notes
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
  // Try recovering compact items stored at order creation
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

  // Fallback: single generic line item
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

export async function POST() {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Razorpay credentials not configured" }, { status: 500 });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const headers = { Authorization: `Basic ${auth}` };

    // ── Paginate through ALL payments (up to 1000 max via batches of 100) ──
    const allPayments: any[] = [];
    let skip = 0;
    const batchSize = 100;
    const maxBatches = 10;

    for (let batch = 0; batch < maxBatches; batch++) {
      const res = await fetch(
        `https://api.razorpay.com/v1/payments?count=${batchSize}&skip=${skip}`,
        { headers }
      );
      const data = await res.json();

      if (!res.ok) {
        return NextResponse.json(
          { error: data.error?.description || "Failed to fetch Razorpay payments" },
          { status: 500 }
        );
      }

      const items: any[] = data.items || [];
      allPayments.push(...items);

      // If we got fewer items than requested, we've reached the end
      if (items.length < batchSize) break;
      skip += batchSize;
    }

    const currentOrders = await getAllOrders();
    let importedCount = 0;
    let skippedCount = 0;

    for (const payment of allPayments) {
      // Only import successful payments
      if (payment.status !== "captured") {
        skippedCount++;
        continue;
      }

      const paymentId = payment.id;
      const orderRef = payment.order_id || paymentId;

      // Skip if already in our system
      const alreadyExists = currentOrders.some(
        (o) => o.id === orderRef || o.paymentId === paymentId
      );
      if (alreadyExists) {
        skippedCount++;
        continue;
      }

      // ── Fetch expanded notes from the Razorpay ORDER (more complete than payment notes) ──
      let notes: Record<string, string> = payment.notes || {};

      if (payment.order_id) {
        try {
          const orderRes = await fetch(
            `https://api.razorpay.com/v1/orders/${payment.order_id}`,
            { headers }
          );
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            // Merge order notes with payment notes (order notes take priority for address/items)
            notes = { ...(payment.notes || {}), ...(orderData.notes || {}) };
          }
        } catch {}
      }

      const amountTotal = Math.round(payment.amount / 100);

      // Determine shipping and subtotal (use stored values from notes if available)
      const storedSubtotal = notes.subtotal ? parseInt(notes.subtotal) : null;
      const storedShipping = notes.shipping ? parseInt(notes.shipping) : null;
      const shipping = storedShipping ?? (amountTotal >= 500 ? 50 : 70);
      const subtotal = storedSubtotal ?? Math.max(0, amountTotal - shipping);

      const customerName = notes.customer_name || notes.name || payment.description || "Online Customer";
      const customerPhone = notes.customer_phone || payment.contact?.replace(/^\+91/, "") || "";
      const customerEmail = notes.customer_email || payment.email || "";

      const { address, city, state, pincode } = parseAddress(notes);
      const items = parseItems(notes, subtotal);

      const newOrder: StoredOrder = {
        id: orderRef,
        orderId: orderRef,
        paymentId,
        createdAt: new Date(payment.created_at * 1000).toISOString(),
        status: "Paid / Pending Pack",
        customer: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          address,
          city,
          state,
          pincode,
        },
        items,
        subtotal,
        shipping,
        total: amountTotal,
      };

      await saveOrder(newOrder);
      importedCount++;
    }

    const updatedOrders = await getAllOrders();
    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      totalPaymentsFetched: allPayments.length,
      totalOrders: updatedOrders.length,
      orders: updatedOrders,
    });
  } catch (err: any) {
    console.error("Razorpay sync error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
