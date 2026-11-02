import Link from "next/link";

export function Header() {
  const whatsappAll =
    "https://wa.me/916295034036?text=Hello%20Chakung%20Store%2C%20I%20would%20like%20to%20order%20organic%20produce.";

  return (
    <header className="store-header">
      <div className="store-wrap store-header-inner">
        <Link href="/" className="store-brand" aria-label="Chakung Store Home">
          <span className="store-brand-main">Chakung</span>
          <span className="store-brand-sub">Store</span>
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
            Order
          </a>
          <a
            href="https://chakung.com"
            target="_blank"
            rel="noopener noreferrer"
            className="store-homestay-link"
          >
            The Homestay ↗
          </a>
        </nav>

        {/* Mobile Navigation */}
        <div className="store-mobile-nav">
          <a
            href={whatsappAll}
            target="_blank"
            rel="noopener noreferrer"
            className="store-mobile-wa-btn"
          >
            Order
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
                  <span className="menu-sub">8 ridge products</span>
                </Link>
                <Link href="/#sikkim-organic" className="menu-link-item">
                  <span>Why Organic</span>
                  <span className="menu-sub">100% Certified State</span>
                </Link>
                <a
                  href={whatsappAll}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="menu-link-item menu-link-highlight"
                >
                  <span>Order on WhatsApp</span>
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
