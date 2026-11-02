import type { Metadata } from "next";
import { Fraunces, Familjen_Grotesk } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-display",
  display: "swap",
});

const sans = Familjen_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

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
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
