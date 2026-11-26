import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendStoreOwnerNotification, sendCustomerConfirmation } from "@/lib/email";

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

    // Trigger email notifications asynchronously if order details were provided
    if (orderDetails && orderDetails.customer && orderDetails.items) {
      const emailPayload = {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        customer: orderDetails.customer,
        items: orderDetails.items,
        subtotal: orderDetails.subtotal,
        shipping: orderDetails.shipping,
        total: orderDetails.total,
      };

      // We await or dispatch in background with error catching so an email error doesn't break verified checkout
      try {
        await Promise.allSettled([
          sendStoreOwnerNotification(emailPayload),
          sendCustomerConfirmation(emailPayload),
        ]);
      } catch (mailErr) {
        console.error("Order notification email dispatch error:", mailErr);
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
