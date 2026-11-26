import { NextResponse } from "next/server";
import crypto from "crypto";
import { saveOrder, StoredOrder } from "@/lib/orders";
import { sendPushNotificationToAll } from "@/lib/push";
import { sendStoreOwnerNotification, sendCustomerConfirmation } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    // Optional signature verification if webhook secret is set
    if (signature && secret) {
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (event === "payment.captured" || event === "order.paid") {
      const payment = payload.payload?.payment?.entity || {};
      const notes = payment.notes || {};
      const amountTotal = Math.round(payment.amount / 100);
      const orderRef = payment.order_id || payment.id;

      const rawAddress = notes.address || "";
      const pincodeMatch = rawAddress.match(/\b\d{6}\b/) || [notes.pincode || "737121"];

      const customerName =
        notes.customer_name || notes.name || payment.description || "Online Customer";
      const customerPhone = notes.customer_phone || payment.contact || "";
      const customerEmail = payment.email || "";

      const shipping = amountTotal >= 500 ? 50 : 70;
      const subtotal = Math.max(0, amountTotal - shipping);

      const orderData: StoredOrder = {
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
          pincode: pincodeMatch[0],
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

      await saveOrder(orderData);

      // Trigger push notification to staff devices
      await sendPushNotificationToAll({
        title: `🏔️ New Order #${orderRef.slice(-6)} · ₹${amountTotal}`,
        body: `${customerName} paid ₹${amountTotal}. Tap to pack in Chakung.`,
        url: "/staff",
      });

      // Send emails
      await Promise.allSettled([
        sendStoreOwnerNotification(orderData as any),
        sendCustomerConfirmation(orderData as any),
      ]);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
