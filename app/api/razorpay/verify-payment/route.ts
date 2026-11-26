import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendStoreOwnerNotification, sendCustomerConfirmation } from "@/lib/email";
import { saveOrder } from "@/lib/orders";
import { sendPushNotificationToAll } from "@/lib/push";

export async function POST(request: Request) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { error: "Razorpay key secret not configured on server" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required Razorpay payment verification fields" },
        { status: 400 }
      );
    }

    // Verify HMAC SHA-256 signature
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { success: false, error: "Payment verification failed: Signature mismatch" },
        { status: 400 }
      );
    }

    // Save order & trigger notifications if order details were provided
    if (orderDetails && orderDetails.customer && orderDetails.items) {
      const orderPayload = {
        id: razorpay_order_id,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        createdAt: new Date().toISOString(),
        status: "Paid / Pending Pack" as const,
        customer: orderDetails.customer,
        items: orderDetails.items,
        subtotal: orderDetails.subtotal,
        shipping: orderDetails.shipping,
        total: orderDetails.total,
      };

      // 1. Save order to persistent store for staff dashboard tracking
      try {
        await saveOrder(orderPayload);
      } catch (saveErr) {
        console.error("Order save error:", saveErr);
      }

      // 2. Dispatch email alerts and web push notifications in parallel
      try {
        await Promise.allSettled([
          sendStoreOwnerNotification(orderPayload),
          sendCustomerConfirmation(orderPayload),
          sendPushNotificationToAll({
            title: `🏔️ New Order #${razorpay_order_id.slice(-6)} · ₹${orderPayload.total}`,
            body: `${orderPayload.customer.name} ordered ${orderPayload.items.length} items. Tap to view packing list.`,
            url: "/staff",
          }),
        ]);
      } catch (notifyErr) {
        console.error("Notification dispatch error:", notifyErr);
      }
    }

    return NextResponse.json({
      success: true,
      verified: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
