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

    // Fetch payments from Razorpay
    const res = await fetch("https://api.razorpay.com/v1/payments?count=100", {
      headers: { Authorization: `Basic ${auth}` },
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.description || "Failed to fetch Razorpay payments" }, { status: 500 });
    }

    const payments = data.items || [];
    const currentOrders = await getAllOrders();
    let importedCount = 0;

    for (const payment of payments) {
      if (payment.status !== "captured") continue;

      const orderRef = payment.order_id || payment.id;
      const alreadyExists = currentOrders.some(
        (o) => o.id === orderRef || o.paymentId === payment.id
      );

      if (!alreadyExists) {
        const notes = payment.notes || {};
        const amountTotal = Math.round(payment.amount / 100);

        // Parse address components
        const rawAddress = notes.address || "";
        const pincodeMatch = rawAddress.match(/\b\d{6}\b/) || [notes.pincode || "737121"];
        const pincode = pincodeMatch[0];

        const customerName =
          notes.customer_name || notes.name || payment.description || "Online Customer";
        const customerPhone =
          notes.customer_phone || payment.contact || "";
        const customerEmail =
          payment.email || "";

        // Determine shipping and subtotal
        const shipping = amountTotal >= 500 ? 50 : 70;
        const subtotal = Math.max(0, amountTotal - shipping);

        const newOrder: StoredOrder = {
          id: orderRef,
          orderId: orderRef,
          paymentId: payment.id,
          createdAt: new Date(payment.created_at * 1000).toISOString(),
          status: "Paid / Pending Pack",
          customer: {
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
            address: rawAddress || "Address provided during checkout",
            city: notes.city || "West Sikkim",
            state: notes.state || "Sikkim",
            pincode,
          },
          items: [
            {
              name: "Sikkim Village Organic Harvest",
              weight: "Mountain Pack",
              quantity: 1,
              unitPrice: subtotal,
              itemTotal: subtotal,
            },
          ],
          subtotal,
          shipping,
          total: amountTotal,
        };

        await saveOrder(newOrder);
        importedCount++;
      }
    }

    const updatedOrders = await getAllOrders();
    return NextResponse.json({
      success: true,
      importedCount,
      totalOrders: updatedOrders.length,
      orders: updatedOrders,
    });
  } catch (err: any) {
    console.error("Razorpay sync error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
