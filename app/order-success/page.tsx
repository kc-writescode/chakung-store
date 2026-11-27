"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const paymentId = searchParams.get("payment_id");

  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("last_order_details");
      if (saved) {
        setOrderDetails(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  const whatsappMessage = `Hello Chakung Store! I have completed payment for my order.\nOrder ID: ${orderId || orderDetails?.orderId || "N/A"}\nPayment ID: ${paymentId || orderDetails?.paymentId || "N/A"}\nPlease share dispatch & Speed Post tracking details.`;
  const whatsappUrl = `https://wa.me/916295034036?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <main className="order-result-page">
      <div className="store-wrap">
        <div className="order-result-card success-card">
          <div className="result-badge success-icon">✓</div>
          <p className="result-kicker">Payment Received · West Sikkim Dispatch</p>
          <h1 className="result-title">Tashi Delek! Your harvest order is confirmed.</h1>
          <p className="result-lede">
            Thank you for supporting smallholder organic farmers in Chakung village. Your items are being hand-packed and prepared for India Post Speed Post dispatch.
          </p>

          <div className="result-meta-box">
            <div className="meta-row">
              <span className="meta-label">Razorpay Payment ID:</span>
              <span className="meta-value code-font">{paymentId || "Confirmed"}</span>
            </div>
            {orderId && (
              <div className="meta-row">
                <span className="meta-label">Order Reference:</span>
                <span className="meta-value code-font">{orderId}</span>
              </div>
            )}
            {orderDetails?.customer && (
              <>
                <div className="meta-row">
                  <span className="meta-label">Delivering To:</span>
                  <span className="meta-value">
                    {orderDetails.customer.name} ({orderDetails.customer.phone})
                  </span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Shipping Address:</span>
                  <span className="meta-value">
                    {[
                      orderDetails.customer.address,
                      orderDetails.customer.city,
                      orderDetails.customer.state,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    {orderDetails.customer.pincode ? ` - ${orderDetails.customer.pincode}` : ""}
                  </span>
                </div>
              </>
            )}
          </div>

          {orderDetails?.items && (
            <div className="result-items-box">
              <h3>Items in this harvest:</h3>
              <ul className="confirmed-items-list">
                {orderDetails.items.map((item: any, i: number) => (
                  <li key={i} className="confirmed-item-row">
                    <span>
                      {item.name} ({item.weight}) × {item.quantity}
                    </span>
                    <span className="item-price">₹{item.itemTotal}</span>
                  </li>
                ))}
              </ul>
              <div className="confirmed-total-row">
                <span>Total Amount Paid</span>
                <span className="total-price">₹{orderDetails.total}</span>
              </div>
            </div>
          )}

          <div className="dispatch-timeline-box">
            <h4>📦 What happens next?</h4>
            <div className="timeline-steps">
              <div className="timeline-step">
                <span className="step-circle">1</span>
                <div>
                  <strong>Packed at Chakung Ridge</strong>
                  <p>Sun-dried, freshly ground, or airtight sealed in Soreng district.</p>
                </div>
              </div>
              <div className="timeline-step">
                <span className="step-circle">2</span>
                <div>
                  <strong>Dispatched via Speed Post</strong>
                  <p>Handed over to the local post office with India Post tracking.</p>
                </div>
              </div>
              <div className="timeline-step">
                <span className="step-circle">3</span>
                <div>
                  <strong>Delivered to your doorstep</strong>
                  <p>Usually reaches across metro & tier-1/2 cities within 4 to 7 business days.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="result-actions">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="store-btn-solid store-btn-large"
            >
              Get Dispatch Tracking on WhatsApp
            </a>
            <Link href="/#products" className="store-btn-ghost">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="store-wrap py-20 text-center">Loading order confirmation...</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
