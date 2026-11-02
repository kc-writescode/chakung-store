import Link from "next/link";

export function Header() {
  return (
    <header className="store-header">
      <div className="store-wrap store-header-inner">
        <Link href="/" className="store-brand">
          <span className="store-brand-main">Chakung</span>
          <span className="store-brand-sub">Store</span>
        </Link>
        <nav className="store-nav">
          <Link href="/#products">Catalogue</Link>
          <Link href="/#sikkim-organic">Why Organic</Link>
          <a
            href="https://chakung.com"
            target="_blank"
            rel="noopener noreferrer"
            className="store-homestay-link"
          >
            The Homestay ↗
          </a>
        </nav>
      </div>
    </header>
  );
}

