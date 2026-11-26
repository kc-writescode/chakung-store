"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/cart-context";
import { getPriceNumber } from "@/content/products";

export function CartDrawer() {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    subtotal,
    isCartOpen,
    setIsCartOpen,
  } = useCart();
  const router = useRouter();

  if (!isCartOpen) return null;

  const shippingDiscountThreshold = 500;
  const shippingDiscountMet = subtotal >= shippingDiscountThreshold;
  const shippingDiscountRemaining = Math.max(0, shippingDiscountThreshold - subtotal);
  const shippingFee = items.length === 0 ? 0 : shippingDiscountMet ? 50 : 70;
  const grandTotal = subtotal + shippingFee;

  const handleCheckout = () => {
    setIsCartOpen(false);
    router.push("/checkout");
  };

  return (
    <div className="cart-drawer-overlay" onClick={() => setIsCartOpen(false)}>
      <div
        className="cart-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Your Himalayan Harvest Cart"
      >
        {/* Drawer Header */}
        <div className="cart-drawer-header">
          <div className="cart-title-wrap">
            <h2 className="cart-title">Your Cart</h2>
            <span className="cart-item-count">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </span>
          </div>
          <button
            type="button"
            className="cart-close-btn"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* Shipping Discount Banner */}
        <div className="cart-shipping-banner">
          {shippingDiscountMet ? (
            <div className="free-shipping-tag success">
              <span>🎉 You unlocked <strong>discounted ₹50 Speed Post Delivery</strong> across India!</span>
            </div>
          ) : (
            <div className="free-shipping-tag progress">
              <span>
                Add <strong>₹{shippingDiscountRemaining}</strong> more for discounted <strong>₹50 shipping</strong> (normally ₹70)
              </span>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(100, (subtotal / shippingDiscountThreshold) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="cart-items-container">
          {items.length === 0 ? (
            <div className="cart-empty-state">
              <span className="cart-empty-icon">🏔️</span>
              <h3>Your basket is empty</h3>
              <p>Fresh organic produce straight from Chakung village terraces awaits.</p>
              <button
                type="button"
                className="store-btn-solid"
                onClick={() => setIsCartOpen(false)}
              >
                Browse Ridge Harvest
              </button>
            </div>
          ) : (
            <ul className="cart-items-list">
              {items.map(({ product, quantity }) => {
                const priceNum = getPriceNumber(product.price);
                const itemTotal = priceNum * quantity;

                return (
                  <li key={product.slug} className="cart-item-row">
                    <div className="cart-item-thumb-wrap">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={64}
                          height={64}
                          className="cart-item-thumb"
                        />
                      ) : (
                        <div className="cart-item-placeholder">🌱</div>
                      )}
                    </div>

                    <div className="cart-item-info">
                      <div className="cart-item-top">
                        <Link
                          href={`/${product.slug}`}
                          className="cart-item-name"
                          onClick={() => setIsCartOpen(false)}
                        >
                          {product.name}
                        </Link>
                        <button
                          type="button"
                          className="cart-item-remove"
                          onClick={() => removeItem(product.slug)}
                          aria-label={`Remove ${product.name}`}
                        >
                          ✕
                        </button>
                      </div>
                      <span className="cart-item-weight">{product.weight}</span>

                      <div className="cart-item-bottom">
                        <div className="quantity-stepper">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.slug, quantity - 1)}
                            className="stepper-btn"
                            aria-label="Decrease quantity"
                          >
                            –
                          </button>
                          <span className="stepper-value">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.slug, quantity + 1)}
                            className="stepper-btn"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <span className="cart-item-price">₹{itemTotal}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-summary-line">
              <span>Subtotal</span>
              <span className="summary-val">₹{subtotal}</span>
            </div>
            <div className="cart-summary-line">
              <span>Speed Post Shipping</span>
              <span className="summary-val">
                {shippingDiscountMet && (
                  <span style={{ textDecoration: "line-through", color: "var(--muted)", marginRight: "6px" }}>₹70</span>
                )}
                ₹{shippingFee}
              </span>
            </div>
            <div className="cart-summary-line cart-total-line">
              <span>Total Amount</span>
              <span className="summary-total">₹{grandTotal}</span>
            </div>

            <div className="cart-action-buttons">
              <button
                type="button"
                onClick={handleCheckout}
                className="store-btn-solid checkout-cta-btn"
              >
                Proceed to Checkout · ₹{grandTotal}
              </button>
              <button
                type="button"
                onClick={clearCart}
                className="cart-clear-link"
              >
                Clear cart
              </button>
            </div>

            <p className="cart-footer-guarantee">
              🔒 Secure payment via Razorpay (UPI, Cards, Netbanking) · Direct from Chakung, Sikkim
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
