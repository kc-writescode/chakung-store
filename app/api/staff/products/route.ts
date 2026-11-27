import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  getAllProducts,
  saveProduct,
  deleteProduct,
  syncAllProductsWithRazorpay,
  StoredProduct,
} from "@/lib/products-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STAFF_COOKIE_NAME = "chakung_staff_auth";

async function isStaffAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  const expectedPin = (process.env.STAFF_PIN || "1400").trim();
  return token === `staff_auth_${expectedPin}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET() {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const products = await getAllProducts(false);
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET);

    return NextResponse.json(
      {
        products,
        razorpay: {
          configured: Boolean(keyId && hasSecret),
          keyIdMasked: keyId ? `${keyId.slice(0, 12)}...${keyId.slice(-4)}` : "",
          mode: keyId.startsWith("rzp_live_") ? "LIVE" : keyId.startsWith("rzp_test_") ? "TEST" : "UNKNOWN",
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.action === "sync-razorpay") {
      const result = await syncAllProductsWithRazorpay();
      return NextResponse.json({
        success: true,
        synced: result.synced,
        products: result.products,
      });
    }

    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const slug = (body.slug ? slugify(body.slug) : slugify(name)) || `product-${Date.now()}`;
    const rawPrice = String(body.price || "0").replace(/[^0-9]/g, "");
    const priceNum = parseInt(rawPrice, 10) || 0;
    if (priceNum <= 0) {
      return NextResponse.json({ error: "Valid price in ₹ is required" }, { status: 400 });
    }

    const existing = await getAllProducts(false);
    if (existing.some((p) => p.slug === slug)) {
      return NextResponse.json(
        { error: `A product with slug "${slug}" already exists.` },
        { status: 409 }
      );
    }

    const newProduct: StoredProduct = {
      slug,
      name,
      localName: (body.localName || name).trim(),
      tagline: (body.tagline || `${name} from Chakung, West Sikkim`).trim(),
      description: (body.description || `${name} harvested organically in West Sikkim.`).trim(),
      category: body.category || "Grain",
      price: `₹${priceNum}`,
      weight: (body.weight || "500g pack").trim(),
      image: (body.image || "").trim(),
      giTag: Boolean(body.giTag),
      organic: body.organic !== false,
      featured: body.featured !== false,
      altitude: (body.altitude || "1,200m – 1,800m").trim(),
      harvestSeason: (body.harvestSeason || "October – December").trim(),
      tastingNotes: Array.isArray(body.tastingNotes)
        ? body.tastingNotes
        : String(body.tastingNotes || "Authentic mountain harvest")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
      traditionalUses: Array.isArray(body.traditionalUses)
        ? body.traditionalUses
        : String(body.traditionalUses || "Traditional Sikkimese kitchen preparation")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
      pairingSuggestions: Array.isArray(body.pairingSuggestions)
        ? body.pairingSuggestions
        : String(body.pairingSuggestions || "Steamed mountain rice")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
      active: true,
    };

    const saved = await saveProduct(newProduct, body.syncRazorpay !== false);
    try {
      revalidatePath("/", "layout");
      revalidatePath("/", "page");
      revalidatePath(`/${saved.slug}`, "page");
      revalidatePath(`/${saved.slug}`, "layout");
      revalidatePath("/staff", "page");
      revalidatePath("/api/products");
    } catch {}
    return NextResponse.json({ success: true, product: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add product" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const slug = (body.slug || "").trim();
    if (!slug) {
      return NextResponse.json({ error: "Product slug is required" }, { status: 400 });
    }

    const existingList = await getAllProducts(true);
    const existing = existingList.find((p) => p.slug === slug);
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const rawPrice =
      body.price !== undefined ? String(body.price).replace(/[^0-9]/g, "") : undefined;
    const priceStr =
      rawPrice && parseInt(rawPrice, 10) > 0 ? `₹${parseInt(rawPrice, 10)}` : existing.price;

    const updated: StoredProduct = {
      ...existing,
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      localName: body.localName !== undefined ? String(body.localName).trim() : existing.localName,
      tagline: body.tagline !== undefined ? String(body.tagline).trim() : existing.tagline,
      description:
        body.description !== undefined ? String(body.description).trim() : existing.description,
      category: body.category !== undefined ? body.category : existing.category,
      price: priceStr,
      weight: body.weight !== undefined ? String(body.weight).trim() : existing.weight,
      image: body.image !== undefined ? String(body.image).trim() : existing.image,
      giTag: body.giTag !== undefined ? Boolean(body.giTag) : existing.giTag,
      organic: body.organic !== undefined ? Boolean(body.organic) : existing.organic,
      featured: body.featured !== undefined ? Boolean(body.featured) : existing.featured,
      altitude: body.altitude !== undefined ? String(body.altitude).trim() : existing.altitude,
      harvestSeason:
        body.harvestSeason !== undefined ? String(body.harvestSeason).trim() : existing.harvestSeason,
      tastingNotes:
        body.tastingNotes !== undefined
          ? Array.isArray(body.tastingNotes)
            ? body.tastingNotes
            : String(body.tastingNotes)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
          : existing.tastingNotes,
      traditionalUses:
        body.traditionalUses !== undefined
          ? Array.isArray(body.traditionalUses)
            ? body.traditionalUses
            : String(body.traditionalUses)
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
          : existing.traditionalUses,
      pairingSuggestions:
        body.pairingSuggestions !== undefined
          ? Array.isArray(body.pairingSuggestions)
            ? body.pairingSuggestions
            : String(body.pairingSuggestions)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
          : existing.pairingSuggestions,
      active: body.active !== undefined ? Boolean(body.active) : true,
    };

    const saved = await saveProduct(updated, body.syncRazorpay !== false);
    try {
      revalidatePath("/", "layout");
      revalidatePath("/", "page");
      revalidatePath(`/${saved.slug}`, "page");
      revalidatePath(`/${saved.slug}`, "layout");
      revalidatePath("/staff", "page");
      revalidatePath("/api/products");
    } catch {}
    return NextResponse.json({ success: true, product: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let slug = searchParams.get("slug") || "";

    if (!slug) {
      try {
        const body = await request.json();
        slug = body.slug || "";
      } catch {}
    }

    if (!slug) {
      return NextResponse.json({ error: "Product slug is required" }, { status: 400 });
    }

    const removed = await deleteProduct(slug);
    if (!removed) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    try {
      revalidatePath("/", "layout");
      revalidatePath("/", "page");
      revalidatePath(`/${slug}`, "page");
      revalidatePath(`/${slug}`, "layout");
      revalidatePath("/staff", "page");
      revalidatePath("/api/products");
    } catch {}
    return NextResponse.json({ success: true, slug });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to remove product" }, { status: 500 });
  }
}
