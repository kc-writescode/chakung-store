"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCart } from "@/context/cart-context";
import { getPriceNumber } from "@/content/products";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function CheckoutPage() {
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const router = useRouter();

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "Sikkim",
    pincode: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [razorpayReady, setRazorpayReady] = useState(false);

  // Check if Razorpay script is already loaded
  useEffect(() => {
    if (typeof window !== "undefined" && window.Razorpay) {
      setRazorpayReady(true);
    }
  }, []);

  const freeShippingThreshold = 500;
  const freeShippingMet = subtotal >= freeShippingThreshold;
  const shippingFee = items.length === 0 ? 0 : freeShippingMet ? 0 : 70;
  const grandTotal = subtotal + shippingFee;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage("");
  };

  const validateForm = () => {
    if (!customer.name.trim()) return "Please enter your full name.";
    if (!customer.phone.trim() || customer.phone.replace(/[^0-9]/g, "").length < 10) {
      return "Please enter a valid 10-digit mobile number for dispatch updates.";
    }
    if (!customer.email.trim() || !customer.email.includes("@")) {
      return "Please enter a valid email address for your payment receipt.";
    }
    if (!customer.address.trim()) {
      return "Please enter your street / village / delivery address.";
    }
    if (!customer.city.trim()) return "Please enter your city / town.";
    if (!customer.pincode.trim() || customer.pincode.length < 6) {
      return "Please enter a valid 6-digit postal pincode.";
    }
    return null;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      setErrorMessage("Your cart is empty. Please add items before checking out.");
      return;
    }

    const validationErr = validateForm();
    if (validationErr) {
      setErrorMessage(validationErr);
      return;
    }

    if (!window.Razorpay) {
      setErrorMessage("Razorpay payment gateway is still loading. Please try again in a moment.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // 1. Create order on backend
      const orderPayload = {
        items: items.map((item) => ({
          slug: item.product.slug,
          quantity: item.quantity,
        })),
        customer,
      };

      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await res.json();

      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to initiate payment order.");
      }

      // Save order context temporarily in sessionStorage for success page reference
      const pendingOrderContext = {
        orderId: orderData.orderId,
        items: orderData.items,
        subtotal: orderData.subtotal,
        shipping: orderData.shipping,
        total: orderData.total,
        customer,
        date: new Date().toISOString(),
      };
      sessionStorage.setItem("last_order_details", JSON.stringify(pendingOrderContext));

      // Clean phone number for Razorpay (clean 10 digits for Indian mobile numbers)
      const rawDigits = customer.phone.replace(/[^0-9]/g, "");
      const cleanContact = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;

      // 2. Configure and open Razorpay Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Chakung Store",
        description: "Himalayan Village Organic Produce",
        image: "https://store.chakung.com/products/dalle-khursani.jpg",
        order_id: orderData.orderId,
        prefill: {
          name: customer.name.trim(),
          email: customer.email.trim(),
          contact: cleanContact,
        },
        notes: {
          address: `${customer.address}, ${customer.city}, ${customer.state} - ${customer.pincode}`,
        },
        theme: {
          color: "#1a3328", // Chakung brand forest green
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
          },
        },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            // 3. Verify payment signature on backend and trigger order confirmation emails
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                orderDetails: pendingOrderContext,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              // Clear cart upon successful payment
              clearCart();
              // Update session storage with payment ID
              pendingOrderContext.orderId = response.razorpay_order_id;
              sessionStorage.setItem(
                "last_order_details",
                JSON.stringify({
                  ...pendingOrderContext,
                  paymentId: response.razorpay_payment_id,
                })
              );

              // Redirect to success page
              router.push(
                `/order-success?order_id=${encodeURIComponent(
                  response.razorpay_order_id
                )}&payment_id=${encodeURIComponent(response.razorpay_payment_id)}`
              );
            } else {
              router.push(
                `/order-failure?order_id=${encodeURIComponent(
                  response.razorpay_order_id
                )}&reason=${encodeURIComponent(
                  verifyData.error || "Payment verification failed"
                )}`
              );
            }
          } catch (err: any) {
            router.push(
              `/order-failure?order_id=${encodeURIComponent(
                response.razorpay_order_id
              )}&reason=${encodeURIComponent(err.message || "Network error during verification")}`
            );
          } finally {
            setIsSubmitting(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setIsSubmitting(false);
        const failReason = response.error?.description || "Payment was declined or failed";
        router.push(
          `/order-failure?order_id=${encodeURIComponent(
            orderData.orderId
          )}&reason=${encodeURIComponent(failReason)}`
        );
      });

      rzp.open();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    }
  };

  const whatsappBackupLink = `https://wa.me/916295034036?text=${encodeURIComponent(
    `Hello Chakung Store, I would like to place an order directly:\nItems: ${items
      .map((i) => `${i.product.name} x${i.quantity}`)
      .join(", ")}\nTotal: ₹${grandTotal}\nDelivery to: ${customer.name || "Customer"}, ${customer.pincode || ""}`
  )}`;

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayReady(true)}
      />

      <main className="checkout-page">
        <div className="store-wrap">
          {/* Breadcrumb */}
          <div className="product-breadcrumb">
            <Link href="/">← Store Home</Link>
            <span>/</span>
            <Link href="/#products">Catalogue</Link>
            <span>/</span>
            <span>Secure Checkout</span>
          </div>

          <div className="checkout-header-title">
            <h1>Himalayan Produce Checkout</h1>
            <p className="checkout-subtitle">
              Shipped directly from Chakung ridge, West Sikkim via India Post Speed Post.
            </p>
          </div>

          {items.length === 0 ? (
            <div className="checkout-empty-box">
              <span className="empty-icon">🏔️</span>
              <h2>Your basket is empty</h2>
              <p>Add fresh organic chillies, spices, or heritage grains from our village catalogue.</p>
              <Link href="/#products" className="store-btn-solid">
                Explore the Catalogue
              </Link>
            </div>
          ) : (
            <div className="checkout-grid">
              {/* Left Column: Delivery Form */}
              <div className="checkout-form-panel">
                <form onSubmit={handlePayment} className="checkout-form">
                  <div className="form-section">
                    <h3 className="section-title">1. Delivery Contact</h3>
                    <div className="form-row two-col">
                      <div className="form-group">
                        <label htmlFor="name">Full Name *</label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          placeholder="e.g. Tenzing Norbu"
                          required
                          value={customer.name}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="phone">Mobile Number *</label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          placeholder="10-digit mobile (for delivery SMS)"
                          required
                          value={customer.phone}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">Email Address *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="For Razorpay receipt & tracking"
                        required
                        value={customer.email}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-section">
                    <h3 className="section-title">2. Shipping Address</h3>
                    <div className="form-group">
                      <label htmlFor="address">Flat / House No. / Street Address *</label>
                      <textarea
                        id="address"
                        name="address"
                        rows={2}
                        placeholder="House / Apartment, Street, Landmark"
                        required
                        value={customer.address}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-row three-col">
                      <div className="form-group">
                        <label htmlFor="city">City / Town *</label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          placeholder="City"
                          required
                          value={customer.city}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="state">State *</label>
                        <input
                          type="text"
                          id="state"
                          name="state"
                          placeholder="State"
                          required
                          value={customer.state}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="pincode">Pincode *</label>
                        <input
                          type="text"
                          id="pincode"
                          name="pincode"
                          maxLength={6}
                          placeholder="6-digit PIN"
                          required
                          value={customer.pincode}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="checkout-error-banner" role="alert">
                      ⚠️ {errorMessage}
                    </div>
                  )}

                  <div className="checkout-submit-area">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="store-btn-solid store-btn-large checkout-pay-btn"
                    >
                      {isSubmitting ? (
                        <span>Connecting to Razorpay...</span>
                      ) : (
                        <span>Pay ₹{grandTotal} with Razorpay</span>
                      )}
                    </button>

                    <div className="payment-security-badges">
                      <span>🔒 256-Bit SSL Encryption</span>
                      <span>💳 UPI · Cards · Netbanking</span>
                      <span>🏔️ 100% Organic Sikkim Guarantee</span>
                    </div>

                    <div className="or-whatsapp-box">
                      <span>Prefer manual payment via UPI QR or WhatsApp?</span>
                      <a
                        href={whatsappBackupLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="whatsapp-alt-link"
                      >
                        Order via WhatsApp instead →
                      </a>
                    </div>
                  </div>
                </form>
              </div>

              {/* Right Column: Order Summary */}
              <div className="checkout-summary-panel">
                <div className="summary-card">
                  <h3 className="summary-card-title">Order Summary</h3>

                  <ul className="checkout-items-list">
                    {items.map(({ product, quantity }) => {
                      const unitPrice = getPriceNumber(product.price);
                      const itemTotal = unitPrice * quantity;
                      return (
                        <li key={product.slug} className="checkout-item-row">
                          <div className="item-thumb-col">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                width={54}
                                height={54}
                                className="item-thumb"
                              />
                            ) : (
                              <div className="item-placeholder">🌱</div>
                            )}
                          </div>
                          <div className="item-details-col">
                            <span className="item-name">{product.name}</span>
                            <span className="item-meta">
                              {product.weight} · ₹{unitPrice} each
                            </span>
                            <div className="item-stepper-mini">
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.slug, quantity - 1)}
                                className="mini-btn"
                              >
                                –
                              </button>
                              <span className="mini-qty">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.slug, quantity + 1)}
                                className="mini-btn"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(product.slug)}
                                className="mini-remove"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="item-price-col">
                            <span>₹{itemTotal}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="summary-calculations">
                    <div className="calc-row">
                      <span>Items Subtotal</span>
                      <span className="calc-val">₹{subtotal}</span>
                    </div>
                    <div className="calc-row">
                      <span>
                        Speed Post Shipping
                        {freeShippingMet && (
                          <span className="free-badge-pill">Free shipping applied</span>
                        )}
                      </span>
                      <span className="calc-val">
                        {shippingFee === 0 ? (
                          <span className="text-free">FREE</span>
                        ) : (
                          `₹${shippingFee}`
                        )}
                      </span>
                    </div>
                    <div className="calc-row total-row">
                      <span>Total Due</span>
                      <span className="total-val">₹{grandTotal}</span>
                    </div>
                  </div>

                  <div className="ridge-guarantee-box">
                    <p className="guarantee-title">🌱 From Chakung Ridge</p>
                    <p className="guarantee-text">
                      We hand-pack your harvest directly in West Sikkim. Shipped via India Post Speed Post with tracking updates sent to your mobile.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
