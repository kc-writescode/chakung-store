import Link from "next/link";
import Image from "next/image";
import { products, featuredProducts } from "@/content/products";

export default function StoreHomePage() {
  const whatsappAll = "https://wa.me/916295034036?text=Hello%20Chakung%20Store%2C%20I%20would%20like%20to%20order%20organic%20produce.";

  return (
    <main>
      {/* ── Hero ── */}
      <section className="store-hero">
        <div className="store-wrap">
          <div className="store-hero-content">
            <p className="store-kicker">Soreng District · West Sikkim · 1,400m</p>
            <h1>From the Himalayan ridge to your kitchen.</h1>
            <p className="store-lede">
              Chakung is a mountain village above the clouds in Sikkim — India&apos;s first 100% certified organic state.
              These heirloom seeds, sun-dried chillies, ancient millets, and fermented greens are grown without chemical inputs on terraced family farms.
            </p>
            <div className="store-hero-actions">
              <a href="#products" className="store-btn-solid">
                Explore the Catalogue
              </a>
              <a href={whatsappAll} target="_blank" rel="noopener noreferrer" className="store-btn-ghost">
                Order via WhatsApp
              </a>
            </div>
            <div className="store-pills-row">
              <span className="store-pill">🌱 100% Certified Organic State</span>
              <span className="store-pill">🏷️ Official GI-Tagged Produce</span>
              <span className="store-pill">🏔️ Harvested at 1,200m – 1,800m</span>
              <span className="store-pill">📦 Direct Village Despatch</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="store-section" id="featured">
        <div className="store-wrap">
          <div className="store-head">
            <p className="store-subheading">Seasonal Harvest</p>
            <h2>The ridge&apos;s celebrated staples.</h2>
            <p className="store-head-desc">
              Small-batch harvests from smallholder terraces in Chakung and surrounding West Sikkim villages.
            </p>
          </div>

          <div className="featured-grid">
            {featuredProducts.map((product) => (
              <article key={product.slug} className="featured-card">
                {product.image && (
                  <Link href={`/${product.slug}`} className="featured-card-photo-wrap">
                    <Image
                      src={product.image}
                      alt={`${product.name} (${product.localName})`}
                      width={600}
                      height={600}
                      className="featured-card-photo"
                    />
                  </Link>
                )}

                <div className="featured-card-header">
                  <div className="featured-badges">
                    <span className="badge category-badge">{product.category}</span>
                    {product.giTag && <span className="badge gi-badge">GI Tagged</span>}
                    {product.organic && <span className="badge organic-badge">Organic</span>}
                  </div>
                  <span className="card-price">{product.price}</span>
                </div>

                <div className="featured-card-body">
                  <h3 className="card-title">
                    <Link href={`/${product.slug}`}>{product.name}</Link>
                  </h3>
                  <p className="card-local-name">{product.localName}</p>
                  <p className="card-tagline">{product.tagline}</p>
                  <p className="card-desc">{product.description}</p>

                  <div className="card-notes">
                    <span className="note-label">Tasting notes:</span>
                    <span className="note-items">{product.tastingNotes.join(" · ")}</span>
                  </div>
                </div>

                <div className="featured-card-footer">
                  <span className="weight-tag">{product.weight}</span>
                  <div className="card-buttons">
                    <Link href={`/${product.slug}`} className="view-link">
                      Details →
                    </Link>
                    <a
                      href={`https://wa.me/916295034036?text=${encodeURIComponent(`Hello, I would like to order ${product.name} (${product.weight} - ${product.price}) from Chakung Store.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="order-btn"
                    >
                      Order
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Village Products Catalogue ── */}
      <section className="store-section store-section-alt" id="products">
        <div className="store-wrap">
          <div className="store-head">
            <p className="store-subheading">Complete Collection</p>
            <h2>Village harvest collection.</h2>
            <p className="store-head-desc">
              Heirloom grains, native pulses, pure hill spices, cold-climate seeds, and traditional ferments.
            </p>
          </div>

          <div className="catalogue-table">
            {products.map((product, idx) => (
              <div key={product.slug} className="catalogue-row">
                <div className="row-col-num">
                  {product.image ? (
                    <Link href={`/${product.slug}`} className="catalogue-thumb-wrap">
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={44}
                        height={44}
                        className="catalogue-thumb"
                      />
                    </Link>
                  ) : (
                    <span>0{idx + 1}</span>
                  )}
                </div>
                <div className="row-col-main">
                  <div className="row-title-wrap">
                    <Link href={`/${product.slug}`} className="row-title">
                      {product.name}
                    </Link>
                    <span className="row-local">{product.localName}</span>
                  </div>
                  <p className="row-tagline">{product.tagline}</p>
                </div>
                <div className="row-col-badges">
                  <span className="badge category-badge">{product.category}</span>
                  {product.giTag && <span className="badge gi-badge">GI Tag</span>}
                </div>
                <div className="row-col-price">
                  <span className="price-val">{product.price}</span>
                  <span className="weight-val">{product.weight}</span>
                </div>
                <div className="row-col-action">
                  <a
                    href={`https://wa.me/916295034036?text=${encodeURIComponent(`Hello, I would like to order ${product.name} (${product.price} - ${product.weight}) from Chakung Store.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="row-order-btn"
                  >
                    Order on WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sikkim 100% Organic State Story ── */}
      <section className="store-story" id="sikkim-organic">
        <div className="store-wrap">
          <div className="story-grid">
            <div className="story-copy">
              <p className="store-subheading" style={{ color: "#e7b08a" }}>
                The Sikkim Standard
              </p>
              <h2>India&apos;s first 100% organic state.</h2>
              <p>
                In 2016, Sikkim made global agricultural history by becoming the world&apos;s first state to transition completely to organic farming. Over 75,000 hectares of agricultural land were certified chemical-free, banning synthetic fertilisers, toxic pesticides, and GMO seeds across the state.
              </p>
              <p>
                Because of Chakung&apos;s elevation (1,400m), cool Himalayan microclimate, and terraced mountain topography, crops grow slowly with deep roots in mineral-rich soil irrigated by clear mountain springs.
              </p>
              <p>
                Products like <strong>Dalle Khursani</strong>, <strong>Sikkim Turmeric</strong>, <strong>Large Cardamom</strong>, and <strong>Gundruk</strong> carry official Geographical Indication (GI) tags from the Government of India, legally protecting the unique biodiversity and culinary heritage of this ridge.
              </p>
            </div>

            <div className="story-stats">
              <div className="stat-card">
                <span className="stat-num">2016</span>
                <p className="stat-title">Year Certified Organic</p>
                <p className="stat-sub">Recognised by the UN FAO Future Policy Gold Award</p>
              </div>
              <div className="stat-card">
                <span className="stat-num">100%</span>
                <p className="stat-title">Zero Chemical Residue</p>
                <p className="stat-sub">Banned artificial fertilisers, pesticides, and GMO crops</p>
              </div>
              <div className="stat-card">
                <span className="stat-num">4+</span>
                <p className="stat-title">Protected GI Products</p>
                <p className="stat-sub">Geographical Indication status protecting local seed cultivars</p>
              </div>
              <div className="stat-card">
                <span className="stat-num">1,400m</span>
                <p className="stat-title">Chakung Ridge Altitude</p>
                <p className="stat-sub">Terraced fields fed by Himalayan rainfall and glacial mist</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How to Order ── */}
      <section className="store-order-info">
        <div className="store-wrap">
          <div className="order-box">
            <h2>Direct village orders.</h2>
            <p>
              We do not use complicated checkout carts or automated warehouses. Tell us what you need, and we pack directly from the ridge, weighed and sealed with care.
            </p>
            <div className="order-steps">
              <div className="step">
                <span className="step-num">1</span>
                <h4>Pick your items</h4>
                <p>Browse our products and select what your kitchen needs.</p>
              </div>
              <div className="step">
                <span className="step-num">2</span>
                <h4>Message on WhatsApp</h4>
                <p>Send your list and delivery address to +91 62950 34036.</p>
              </div>
              <div className="step">
                <span className="step-num">3</span>
                <h4>Dispatched from Chakung</h4>
                <p>Shipped via India Post Speed Post or courier to any pincode in India.</p>
              </div>
            </div>
            <a href={whatsappAll} target="_blank" rel="noopener noreferrer" className="store-btn-solid store-btn-large">
              Message the Village Store
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

