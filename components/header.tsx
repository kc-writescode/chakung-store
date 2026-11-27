"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/cart-context";

export function Header() {
  const { totalItems, setIsCartOpen } = useCart();
  const whatsappAll =
    "https://wa.me/916295034036?text=Hello%20Chakung%20Store%2C%20I%20have%20an%20enquiry%20regarding%20organic%20produce.";

  return (
    <header className="store-header">
      <div className="store-wrap store-header-inner">
        <Link href="/" className="store-brand" aria-label="Chakung Store Home">
          <Image
            src="/chakung-logo.png"
            alt="Chakung Mountain Emblem"
            width={44}
            height={44}
            className="store-brand-logo"
            priority
          />
          <div className="store-brand-text">
            <span className="store-brand-main">Chakung</span>
            <span className="store-brand-sub">Store</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="store-nav-desktop" aria-label="Main Navigation">
          <Link href="/#products">Catalogue</Link>
          <Link href="/#sikkim-organic">Why Organic</Link>
          <a
            href={whatsappAll}
            target="_blank"
            rel="noopener noreferrer"
            className="store-order-link"
          >
            Enquiries
          </a>
          <a
            href="https://chakung.com"
            target="_blank"
            rel="noopener noreferrer"
            className="store-homestay-link"
          >
            The Homestay ↗
          </a>

          {/* Cart Button */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="store-cart-btn"
            aria-label={`Open shopping cart (${totalItems} items)`}
          >
            <span className="cart-icon">🛒</span>
            <span>Cart</span>
            {totalItems > 0 && (
              <span className="cart-badge">{totalItems}</span>
            )}
          </button>
        </nav>

        {/* Mobile Navigation */}
        <div className="store-mobile-nav">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="store-cart-btn store-mobile-cart-btn"
            aria-label={`Open shopping cart (${totalItems} items)`}
          >
            <span className="cart-icon">🛒</span>
            {totalItems > 0 && (
              <span className="cart-badge">{totalItems}</span>
            )}
          </button>

          <a
            href={whatsappAll}
            target="_blank"
            rel="noopener noreferrer"
            className="store-mobile-wa-btn"
          >
            Enquiries
          </a>

          <details className="store-menu">
            <summary className="store-menu-btn" aria-label="Toggle navigation menu">
              <span className="menu-icon-bar" />
              <span className="menu-icon-bar" />
            </summary>
            <div className="store-menu-dropdown">
              <nav className="store-menu-links">
                <Link href="/#products" className="menu-link-item">
                  <span>Catalogue</span>
                  <span className="menu-sub">12 ridge products</span>
                </Link>
                <Link href="/#sikkim-organic" className="menu-link-item">
                  <span>Why Organic</span>
                  <span className="menu-sub">100% Certified State</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="menu-link-item"
                  style={{ textAlign: "left", width: "100%", background: "none", border: "none", cursor: "pointer", font: "inherit" }}
                >
                  <span>Shopping Cart</span>
                  <span className="menu-sub">{totalItems} {totalItems === 1 ? "item" : "items"}</span>
                </button>
                <a
                  href={whatsappAll}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="menu-link-item menu-link-highlight"
                >
                  <span>Enquiries on WhatsApp</span>
                  <span className="menu-sub">+91 62950 34036</span>
                </a>
                <a
                  href="https://chakung.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="menu-link-item"
                >
                  <span>The Homestay</span>
                  <span className="menu-sub">chakung.com ↗</span>
                </a>
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
