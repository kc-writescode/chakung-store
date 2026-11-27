import { NextResponse } from "next/server";
import crypto from "crypto";
import { saveOrder, StoredOrder } from "@/lib/orders";
import { parseAddressFromNotes } from "@/lib/indian-address";
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

      const { address, city, state, pincode } = parseAddressFromNotes(notes);

      const customerName =
        notes.customer_name || notes.name || payment.description || "Online Customer";
      const customerPhone = (notes.customer_phone || payment.contact || "").replace(/^\+91/, "");
      const customerEmail = notes.customer_email || payment.email || "";

      const storedSubtotal = notes.subtotal ? parseInt(notes.subtotal, 10) : null;
      const storedShipping = notes.shipping ? parseInt(notes.shipping, 10) : null;
      const shipping = storedShipping ?? (amountTotal >= 500 ? 50 : 70);
      const subtotal = storedSubtotal ?? Math.max(0, amountTotal - shipping);

      let parsedItems: StoredOrder["items"] = [
        {
          name: "Sikkim Village Organic Harvest",
          weight: "Mountain Pack",
          quantity: 1,
          unitPrice: subtotal,
          itemTotal: subtotal,
        },
      ];
      if (notes.items_json) {
        try {
          const compact = JSON.parse(notes.items_json);
          if (Array.isArray(compact) && compact.length > 0) {
            parsedItems = compact.map((i: any) => ({
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
          address,
          city,
          state,
          pincode,
        },
        items: parsedItems,
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
