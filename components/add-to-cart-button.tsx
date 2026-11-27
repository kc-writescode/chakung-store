"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Product, getPriceNumber } from "@/content/products";
import { useCart } from "@/context/cart-context";

interface AddToCartButtonProps {
  product: Product;
  variant?: "solid" | "outline" | "compact" | "buy-now" | "card";
  showBuyNow?: boolean;
  className?: string;
}

export function AddToCartButton({
  product,
  variant = "card",
  showBuyNow = false,
  className = "",
}: AddToCartButtonProps) {
  const { addItem, setIsCartOpen } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const unitPrice = getPriceNumber(product.price);
  const totalPrice = unitPrice > 0 ? `₹${unitPrice * quantity}` : product.price;

  const handleAddToCart = (e: React.MouseEvent, qty = 1) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, qty, true);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const handleBuyNow = (e: React.MouseEvent, qty = 1) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, qty, false);
    setIsCartOpen(false);
    router.push("/checkout");
  };

  if (showBuyNow) {
    return (
      <>
        <div className={`detail-purchase-controls ${className}`}>
          <div className="detail-qty-row">
            <span className="detail-qty-label">Select Quantity</span>
            <div className="detail-qty-stepper" role="group" aria-label="Product quantity">
              <button
                type="button"
                className="detail-qty-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
              >
                -
              </button>
              <span className="detail-qty-val">{quantity}</span>
              <button
                type="button"
                className="detail-qty-btn"
                onClick={() => setQuantity((q) => Math.min(25, q + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <div className="action-buttons-group">
            <button
              type="button"
              onClick={(e) => handleBuyNow(e, quantity)}
              className="cta-buy-now cta-buy-now-large"
              aria-label={`Buy ${quantity} ${product.name} now for ${totalPrice}`}
            >
              <span>Buy Now · {totalPrice}</span>
              <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              onClick={(e) => handleAddToCart(e, quantity)}
              className={`cta-add-cart cta-add-cart-large ${added ? "btn-added" : ""}`}
              aria-label={`Add ${quantity} ${product.name} to cart`}
            >
              {added ? "✓ Added to Cart" : "+ Add to Cart"}
            </button>
          </div>
        </div>

        {/* Mobile Sticky Purchase Bar */}
        <div className="mobile-sticky-cta" role="region" aria-label="Quick purchase actions">
          <div className="mobile-sticky-price">
            <span className="mobile-sticky-amount">{totalPrice}</span>
            <span className="mobile-sticky-weight">{quantity} x {product.weight}</span>
          </div>
          <div className="mobile-sticky-btns">
            <button
              type="button"
              onClick={(e) => handleAddToCart(e, quantity)}
              className={`cta-add-cart ${added ? "btn-added" : ""}`}
              aria-label={`Add ${product.name} to cart`}
            >
              {added ? "✓ Added" : "Add to Cart"}
            </button>
            <button
              type="button"
              onClick={(e) => handleBuyNow(e, quantity)}
              className="cta-buy-now"
              aria-label={`Buy ${product.name} now`}
            >
              Buy Now
            </button>
          </div>
        </div>
      </>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`row-action-buttons ${className}`}>
        <button
          type="button"
          onClick={(e) => handleAddToCart(e, 1)}
          className={`row-order-btn ${added ? "btn-added" : ""}`}
          aria-label={`Add ${product.name} to cart`}
        >
          {added ? "✓ In Cart" : "+ Add to Cart"}
        </button>
        <button
          type="button"
          onClick={(e) => handleBuyNow(e, 1)}
          className="row-buy-btn"
          aria-label={`Buy ${product.name} now`}
        >
          Buy Now
        </button>
      </div>
    );
  }

  return (
    <div className={`card-action-buttons ${className}`}>
      <button
        type="button"
        onClick={(e) => handleAddToCart(e, 1)}
        className={`order-btn-outline ${added ? "btn-added" : ""}`}
        aria-label={`Add ${product.name} to cart`}
      >
        {added ? "✓ Added" : "+ Add to Cart"}
      </button>
      <button
        type="button"
        onClick={(e) => handleBuyNow(e, 1)}
        className="order-btn"
        aria-label={`Buy ${product.name} now`}
      >
        Buy Now
      </button>
    </div>
  );
}
