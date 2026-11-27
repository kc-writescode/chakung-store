import Link from "next/link";

export default function NotFound() {
  return (
    <main className="store-wrap" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 20px" }}>
      <span style={{ fontSize: "52px", marginBottom: "16px" }}>🏔️</span>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: "36px", color: "var(--forest)", marginBottom: "12px" }}>
        Produce Not Found
      </h1>
      <p style={{ color: "var(--earth)", maxWidth: "440px", lineHeight: "1.6", marginBottom: "32px", fontSize: "16px" }}>
        This seasonal harvest or product item is no longer available in the Chakung Store catalogue.
      </p>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/" className="store-btn-solid">
          ← Return to Store Home
        </Link>
        <Link href="/#products" className="cta-add-cart">
          Browse All Products
        </Link>
      </div>
    </main>
  );
}
