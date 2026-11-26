"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function OrderFailureContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const reason = searchParams.get("reason") || "Payment could not be processed by your bank or payment gateway.";

  const whatsappMessage = `Hello Chakung Store, my online payment was unsuccessful.\nOrder ID: ${orderId || "N/A"}\nReason: ${reason}\nCould you please help me complete the order via direct UPI QR?`;
  const whatsappUrl = `https://wa.me/916295034036?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <main className="order-result-page">
      <div className="store-wrap">
        <div className="order-result-card failure-card">
          <div className="result-badge failure-icon">✕</div>
          <p className="result-kicker failure-kicker">Payment Unsuccessful</p>
          <h1 className="result-title">Payment could not be completed.</h1>
          <p className="result-lede">
            Don&apos;t worry — no funds were deducted from your account. If amount was debited, your bank will automatically refund it within 3-5 business days.
          </p>

          <div className="result-meta-box failure-meta-box">
            <div className="meta-row">
              <span className="meta-label">Reported Reason:</span>
              <span className="meta-value failure-value">{reason}</span>
            </div>
            {orderId && (
              <div className="meta-row">
                <span className="meta-label">Order Reference:</span>
                <span className="meta-value code-font">{orderId}</span>
              </div>
            )}
          </div>

          <div className="failure-help-box">
            <h4>Common ways to resolve this:</h4>
            <ul>
              <li>Check if your UPI app or netbanking session timed out.</li>
              <li>Ensure your card has online domestic transactions enabled.</li>
              <li>Or simply pay directly via Google Pay / PhonePe UPI QR on WhatsApp!</li>
            </ul>
          </div>

          <div className="result-actions">
            <Link href="/checkout" className="store-btn-solid store-btn-large">
              Try Checkout Again
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="store-btn-ghost"
            >
              Complete Order on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function OrderFailurePage() {
  return (
    <Suspense fallback={<div className="store-wrap py-20 text-center">Loading...</div>}>
      <OrderFailureContent />
    </Suspense>
  );
}
