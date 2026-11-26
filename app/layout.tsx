import type { Metadata } from "next";
import Script from "next/script";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/context/cart-context";
import { CartDrawer } from "@/components/cart-drawer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://store.chakung.com"),
  title: {
    default: "Chakung Store · Sikkim Organic Village Produce",
    template: "%s · Chakung Store",
  },
  description:
    "Authentic organic produce from Chakung, West Sikkim. GI-tagged Dalle Khursani chillies, pure hill turmeric, Gundruk, Tartary buckwheat, roasted Bhatmas, and heritage pulses. Shipped directly from the mountain ridge.",
  openGraph: {
    title: "Chakung Store · Organic Village Produce from West Sikkim",
    description:
      "GI-tagged Himalayan chillies, heirloom grains, fermented mountain greens, and pure spices grown in India's first 100% organic state.",
    url: "https://store.chakung.com",
    siteName: "Chakung Store",
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CartProvider>
          <Header />
          {children}
          <CartDrawer />
          <Footer />
        </CartProvider>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
