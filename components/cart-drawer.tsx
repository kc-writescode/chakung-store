"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart, CartItem } from "@/context/cart-context";
import { Product, getPriceNumber, products as seedProducts } from "@/content/products";

const SHIPPING_DISCOUNT_THRESHOLD = 500;

interface RankedSuggestion {
  product: Product;
  reason: string;
}

function getCategoryEmoji(category: Product["category"]): string {
  switch (category) {
    case "Grain":
      return "🌾";
    case "Legume":
      return "🫘";
    case "Spice":
      return "🌶️";
    case "Ferment":
      return "🥬";
    default:
      return "🌻";
  }
}

function getRankedSuggestions(
  catalog: Product[],
  cartItems: CartItem[],
  subtotal: number
): RankedSuggestion[] {
  const inCartSlugs = new Set(cartItems.map((i) => i.product.slug));
  const inCartCategories = new Set(cartItems.map((i) => i.product.category));
  const candidates = catalog.filter((p) => !inCartSlugs.has(p.slug));

  if (candidates.length === 0) return [];

  if (cartItems.length === 0) {
    const featuredFirst = [...candidates].sort(
      (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))
    );
    return featuredFirst.slice(0, 3).map((product) => ({
      product,
      reason: product.giTag ? "GI Tagged" : product.category,
    }));
  }

  const remainingForDiscount = Math.max(0, SHIPPING_DISCOUNT_THRESHOLD - subtotal);
  const cartPairingText = cartItems
    .flatMap((i) => [...(i.product.pairingSuggestions || []), i.product.name, i.product.localName])
    .join(" ")
    .toLowerCase();

  const scored = candidates.map((candidate) => {
    let score = 0;
    let reason: string = candidate.category;

    const candidateKeywords = [
      candidate.name,
      ...candidate.name.split(/[\s()/]+/),
      candidate.localName.split(" ")[0],
    ]
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length >= 4);

    const candidatePairingText = (candidate.pairingSuggestions || []).join(" ").toLowerCase();
    const cartMatchesCandidate = candidateKeywords.some((kw) => cartPairingText.includes(kw));
    const candidateMatchesCart = cartItems.some((ci) =>
      ci.product.name
        .toLowerCase()
        .split(/[\s()/]+/)
        .some((kw) => kw.length >= 4 && candidatePairingText.includes(kw))
    );

    if (cartMatchesCandidate || candidateMatchesCart) {
      score += 4;
      reason = "Pairs well";
    }

    const priceNum = getPriceNumber(candidate.price);
    if (remainingForDiscount > 0 && priceNum > 0) {
      if (priceNum >= remainingForDiscount && priceNum <= remainingForDiscount + 180) {
        score += 3;
        reason = "Unlocks ₹50 delivery";
      } else if (priceNum <= 200) {
        score += 1.5;
      }
    }

    if (!inCartCategories.has(candidate.category)) {
      score += 1.5;
    }

    if (candidate.giTag) {
      score += 1;
    }

    if (candidate.featured) {
      score += 0.5;
    }

    return { product: candidate, score, reason };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(({ product, reason }) => ({ product, reason }));
}

export function CartDrawer() {
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    subtotal,
    isCartOpen,
    setIsCartOpen,
  } = useCart();
  const router = useRouter();
  const [catalog, setCatalog] = useState<Product[]>(seedProducts);
  const [justAddedSlug, setJustAddedSlug] = useState<string | null>(null);

  // Sync live product list whenever drawer opens so deletions & staff edits reflect
  useEffect(() => {
    if (!isCartOpen) return;
    let cancelled = false;
    fetch("/api/products", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.products)) {
          setCatalog(data.products);
        }
      })
      .catch(() => {
        // Keep current catalog fallback
      });
    return () => {
      cancelled = true;
    };
  }, [isCartOpen]);

  const suggestions = useMemo(
    () => getRankedSuggestions(catalog, items, subtotal),
    [catalog, items, subtotal]
  );

  if (!isCartOpen) return null;

  const shippingDiscountMet = subtotal >= SHIPPING_DISCOUNT_THRESHOLD;
  const shippingDiscountRemaining = Math.max(0, SHIPPING_DISCOUNT_THRESHOLD - subtotal);
  const shippingFee = items.length === 0 ? 0 : shippingDiscountMet ? 50 : 70;
  const grandTotal = subtotal + shippingFee;

  const handleCheckout = () => {
    setIsCartOpen(false);
    router.push("/checkout");
  };

  const handleQuickAddSuggestion = (product: Product) => {
    addItem(product, 1, false);
    setJustAddedSlug(product.slug);
    setTimeout(() => setJustAddedSlug((curr) => (curr === product.slug ? null : curr)), 1200);
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
                  style={{ width: `${Math.min(100, (subtotal / SHIPPING_DISCOUNT_THRESHOLD) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Cart Items List + Suggestions */}
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
                          unoptimized={product.image.startsWith("data:")}
                          className="cart-item-thumb"
                        />
                      ) : (
                        <div className="cart-item-placeholder">
                          {getCategoryEmoji(product.category)}
                        </div>
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
                            -
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

          {/* Product Suggestions Section */}
          {suggestions.length > 0 && (
            <div className="cart-suggestions" aria-label="Recommended ridge produce">
              <div className="cart-suggestions-header">
                <h3 className="cart-suggestions-heading">
                  {items.length === 0 ? "Popular from Chakung Ridge" : "You might also like"}
                </h3>
                <span className="cart-suggestions-sub">
                  {items.length > 0 && !shippingDiscountMet
                    ? "Pair with your harvest to unlock ₹50 delivery"
                    : "Small-batch mountain pairings"}
                </span>
              </div>

              <ul className="cart-suggestions-list">
                {suggestions.map(({ product, reason }) => {
                  const isAdded = justAddedSlug === product.slug;
                  return (
                    <li key={product.slug} className="cart-suggestion-item">
                      <Link
                        href={`/${product.slug}`}
                        className="cart-suggestion-thumb-wrap"
                        onClick={() => setIsCartOpen(false)}
                      >
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={48}
                            height={48}
                            unoptimized={product.image.startsWith("data:")}
                            className="cart-suggestion-thumb"
                          />
                        ) : (
                          <div className="cart-suggestion-placeholder">
                            {getCategoryEmoji(product.category)}
                          </div>
                        )}
                      </Link>

                      <div className="cart-suggestion-info">
                        <div className="cart-suggestion-top">
                          <Link
                            href={`/${product.slug}`}
                            className="cart-suggestion-name"
                            onClick={() => setIsCartOpen(false)}
                          >
                            {product.name}
                          </Link>
                          <span className="cart-suggestion-tag">{reason}</span>
                        </div>
                        <span className="cart-suggestion-meta">
                          {product.price} · {product.weight}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleQuickAddSuggestion(product)}
                        className={`cart-suggestion-add-btn ${isAdded ? "added" : ""}`}
                        aria-label={`Add ${product.name} (${product.price}) to cart`}
                      >
                        {isAdded ? "✓" : "+ Add"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
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
