import Link from "next/link";

export function Footer() {
  return (
    <footer className="store-site-footer">
      <div className="store-wrap">
        <div className="store-footer-grid">
          <div>
            <p className="store-footer-brand">Chakung Store</p>
            <p className="store-footer-desc">
              Heirloom seeds, mountain spices, ancient grains, and traditional ferments from Chakung village, Soreng district, West Sikkim.
            </p>
            <p className="store-footer-meta">
              Part of Chakung Bamboo Homestay & View Point.
            </p>
          </div>
          <div>
            <h4 className="store-footer-heading">Sikkim Organic State</h4>
            <ul className="store-footer-links">
              <li>100% Certified Chemical-Free Agriculture</li>
              <li>Official GI-Tagged Produce (Dalle, Turmeric, Ginger, Gundruk)</li>
              <li>Smallholder Village Farmer Co-operative</li>
              <li>Direct from Himalayan Terraces (1,200m – 1,800m)</li>
            </ul>
          </div>
          <div>
            <h4 className="store-footer-heading">Orders & Enquiries</h4>
            <p className="store-footer-contact">
              All parcels ship directly from West Sikkim via India Post Speed Post & air couriers across India.
            </p>
            <a
              href="https://wa.me/916295034036?text=Hello%20Chakung%20Store%2C%20I%20would%20like%20to%20place%20an%20order."
              className="store-footer-wa-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              Order on WhatsApp (+91 62950 34036)
            </a>
          </div>
        </div>
        <div className="store-footer-bottom">
          <p>© {new Date().getFullYear()} Chakung Store · store.chakung.com</p>
          <div className="store-footer-sublinks">
            <Link href="https://chakung.com">chakung.com</Link>
            <span>·</span>
            <Link href="https://restro.chakung.com">restro.chakung.com</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

