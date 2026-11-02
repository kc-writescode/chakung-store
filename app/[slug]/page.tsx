import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProduct, products } from "@/content/products";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) return {};

  return {
    title: `${product.name} (${product.localName}) · Chakung Store`,
    description: `${product.tagline} Organic mountain produce from Chakung, West Sikkim. ${product.price} (${product.weight}).`,
  };
}

export default async function ProductDetailPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) notFound();

  const waOrderLink = `https://wa.me/916295034036?text=${encodeURIComponent(
    `Hello Chakung Store, I would like to order ${product.name} (${product.localName}) - ${product.price} for ${product.weight}. Please share payment details and dispatch time to my pincode.`
  )}`;

  return (
    <main className="product-page">
      <div className="store-wrap">
        {/* Breadcrumb */}
        <div className="product-breadcrumb">
          <Link href="/">← Store Home</Link>
          <span>/</span>
          <Link href="/#products">Products</Link>
          <span>/</span>
          <span>{product.name}</span>
        </div>

        <div className="product-detail-layout">
          {/* Visual Panel */}
          <div className="product-visual-panel">
            <div className="product-visual-inner">
              <div className="visual-badge-group">
                <span className="badge category-badge">{product.category}</span>
                {product.giTag && <span className="badge gi-badge">GI Tag</span>}
                {product.organic && <span className="badge organic-badge">100% Organic</span>}
              </div>

              <div className="visual-graphic">
                <span className="graphic-icon">
                  {product.category === "Spice" ? "🌶️" :
                   product.category === "Ferment" ? "🥬" :
                   product.category === "Grain" ? "🌾" :
                   product.category === "Legume" ? "🫘" :
                   product.category === "Seed" ? "🌻" : "🫚"}
                </span>
                <p className="graphic-name">{product.name}</p>
                <p className="graphic-local">{product.localName}</p>
              </div>

              <div className="visual-origin-meta">
                <div className="meta-point">
                  <span className="meta-lbl">Altitude</span>
                  <span className="meta-val">{product.altitude || "1,400m"}</span>
                </div>
                <div className="meta-point">
                  <span className="meta-lbl">Harvest</span>
                  <span className="meta-val">{product.harvestSeason || "Autumn"}</span>
                </div>
                <div className="meta-point">
                  <span className="meta-lbl">Origin</span>
                  <span className="meta-val">Soreng, West Sikkim</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Info Panel */}
          <div className="product-info-panel">
            <p className="product-pretitle">Sikkim Organic Heritage</p>
            <h1 className="product-main-title">{product.name}</h1>
            <p className="product-main-local">{product.localName}</p>

            <div className="product-price-bar">
              <span className="product-detail-price">{product.price}</span>
              <span className="product-detail-weight">per {product.weight}</span>
            </div>

            <p className="product-tagline-lead">&ldquo;{product.tagline}&rdquo;</p>
            <p className="product-full-desc">{product.description}</p>

            {/* Tasting Notes */}
            <div className="detail-section">
              <h4 className="detail-subhead">Aroma & Tasting Profile</h4>
              <div className="pill-tags">
                {product.tastingNotes.map((note) => (
                  <span key={note} className="flavor-pill">
                    {note}
                  </span>
                ))}
              </div>
            </div>

            {/* Traditional Kitchen Uses */}
            <div className="detail-section">
              <h4 className="detail-subhead">Traditional Kitchen Preparation</h4>
              <ul className="traditional-list">
                {product.traditionalUses.map((use, i) => (
                  <li key={i}>{use}</li>
                ))}
              </ul>
            </div>

            {/* Pairings */}
            <div className="detail-section">
              <h4 className="detail-subhead">Pairs Best With</h4>
              <div className="pairing-tags">
                {product.pairingSuggestions.map((item) => (
                  <span key={item} className="pairing-pill">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Order Action */}
            <div className="product-action-box">
              <a
                href={waOrderLink}
                target="_blank"
                rel="noopener noreferrer"
                className="store-btn-solid store-btn-large"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Order on WhatsApp · {product.price}
              </a>
              <p className="order-guarantee-note">
                🌿 Certified organic origin. Direct from village farmers in Chakung. We ship across India via Speed Post and express courier.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
