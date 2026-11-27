import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/products-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const products = await getAllProducts();
    const publicProducts = products.map((p) => ({
      slug: p.slug,
      name: p.name,
      localName: p.localName,
      tagline: p.tagline,
      description: p.description,
      category: p.category,
      price: p.price,
      weight: p.weight,
      image: p.image,
      giTag: p.giTag,
      organic: p.organic,
      featured: p.featured,
      altitude: p.altitude,
      harvestSeason: p.harvestSeason,
      tastingNotes: p.tastingNotes,
      traditionalUses: p.traditionalUses,
      pairingSuggestions: p.pairingSuggestions,
    }));

    return NextResponse.json(
      { products: publicProducts },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load products" },
      { status: 500 }
    );
  }
}
