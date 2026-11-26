"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/content/products";
import { useCart } from "@/context/cart-context";

interface AddToCartButtonProps {
  product: Product;
  variant?: "solid" | "outline" | "compact" | "buy-now";
  showBuyNow?: boolean;
  className?: string;
}

export function AddToCartButton({
  product,
  variant = "solid",
  showBuyNow = false,
  className = "",
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    router.push("/checkout");
  };

  if (showBuyNow) {
    return (
      <div className={`action-buttons-group ${className}`}>
        <button
          type="button"
          onClick={handleAddToCart}
          className="store-btn-ghost store-btn-large"
          aria-label={`Add ${product.name} to cart`}
        >
          {added ? "✓ Added to Cart" : "Add to Cart"}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className="store-btn-solid store-btn-large"
          aria-label={`Buy ${product.name} now`}
        >
          Buy Now · {product.price}
        </button>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleAddToCart}
        className={`row-order-btn ${added ? "btn-added" : ""} ${className}`}
        aria-label={`Add ${product.name} to cart`}
      >
        {added ? "✓ In Cart" : "+ Add to Cart"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      className={`order-btn ${added ? "btn-added" : ""} ${className}`}
      aria-label={`Add ${product.name} to cart`}
    >
      {added ? "✓ Added" : "+ Add"}
    </button>
  );
}
