import fs from "fs";
import path from "path";
import { products as initialProducts, Product, getPriceNumber } from "@/content/products";

export interface StoredProduct extends Product {
  razorpayItemId?: string;
  active?: boolean;
  updatedAt?: string;
}

const CHAKUNG_TAG_PREFIX = "[chakung:";

function getRazorpayAuth(): string | null {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

// In-memory cache to guarantee instant read-your-own-writes consistency across async turns
let inMemoryProducts: StoredProduct[] | null = null;

function getLocalProductsPath(): string {
  return path.join(process.cwd(), "data", "products.json");
}

function getTmpProductsPath(): string {
  return path.join("/tmp", "chakung_products.json");
}

function seedProducts(): StoredProduct[] {
  return initialProducts.map((p) => ({
    ...p,
    active: true,
  }));
}

function readLocalProducts(): StoredProduct[] | null {
  if (inMemoryProducts && inMemoryProducts.length > 0) {
    return [...inMemoryProducts];
  }

  const map = new Map<string, StoredProduct>();

  // 1. Try reading committed / persistent repo file
  try {
    const filePath = getLocalProductsPath();
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          if (p.slug) map.set(p.slug, p);
        }
      }
    }
  } catch {}

  // 2. Try reading /tmp file (handles serverless ephemeral writes)
  try {
    const tmpPath = getTmpProductsPath();
    if (fs.existsSync(tmpPath)) {
      const tmpParsed = JSON.parse(fs.readFileSync(tmpPath, "utf-8"));
      if (Array.isArray(tmpParsed)) {
        for (const p of tmpParsed) {
          if (p.slug) {
            const existing = map.get(p.slug);
            if (!existing || (p.updatedAt && (!existing.updatedAt || p.updatedAt > existing.updatedAt))) {
              map.set(p.slug, p);
            }
          }
        }
      }
    }
  } catch {}

  if (map.size > 0) {
    const list = Array.from(map.values());
    inMemoryProducts = list;
    return list;
  }

  return null;
}

function writeLocalProducts(list: StoredProduct[]): void {
  inMemoryProducts = [...list];

  // Attempt write to data/products.json
  try {
    const localDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
    fs.writeFileSync(getLocalProductsPath(), JSON.stringify(list, null, 2), "utf-8");
  } catch {
    // Read-only filesystem (Vercel serverless) — fallback to /tmp
    try {
      fs.writeFileSync(getTmpProductsPath(), JSON.stringify(list, null, 2), "utf-8");
    } catch (tmpErr) {
      console.error("Failed to write products to /tmp fallback:", tmpErr);
    }
  }
}

/**
 * Builds compact metadata appended to Razorpay Item description.
 * Razorpay description field allows up to 2048 characters.
 */
function buildRazorpayItemDescription(product: StoredProduct): string {
  const meta = {
    slug: product.slug,
    localName: product.localName,
    category: product.category,
    weight: product.weight,
    image: product.image && !product.image.startsWith("data:") ? product.image : "",
    giTag: Boolean(product.giTag),
    organic: product.organic !== false,
    featured: Boolean(product.featured),
    altitude: product.altitude || "1,200m – 1,800m",
    harvestSeason: product.harvestSeason || "October – December",
    tagline: product.tagline || product.name,
    tastingNotes: product.tastingNotes || [],
    traditionalUses: product.traditionalUses || [],
    pairingSuggestions: product.pairingSuggestions || [],
  };
  const metaJson = JSON.stringify(meta);
  const tagBlock = `\n${CHAKUNG_TAG_PREFIX}${product.slug}]${metaJson}`;
  const maxDescLen = Math.max(50, 2040 - tagBlock.length);
  const cleanDescription = (product.description || product.tagline || product.name).slice(0, maxDescLen);
  return `${cleanDescription}${tagBlock}`;
}

export function parseRazorpayItem(item: any): StoredProduct | null {
  const desc: string = item.description || "";
  const tagIdx = desc.indexOf(CHAKUNG_TAG_PREFIX);
  if (tagIdx === -1) return null;

  const closeBracket = desc.indexOf("]", tagIdx);
  if (closeBracket === -1) return null;

  const slugFromTag = desc.slice(tagIdx + CHAKUNG_TAG_PREFIX.length, closeBracket).trim();
  const jsonPart = desc.slice(closeBracket + 1).trim();
  const cleanDesc = desc.slice(0, tagIdx).trim();

  let meta: any = {};
  try {
    meta = JSON.parse(jsonPart);
  } catch (e) {
    console.error("Error parsing Razorpay item meta:", e);
  }

  const slug = meta.slug || slugFromTag;
  if (!slug) return null;

  const amountRupees = item.amount ? Math.round(item.amount / 100) : 0;
  const price = amountRupees > 0 ? `₹${amountRupees}` : meta.price || "₹100";

  return {
    slug,
    name: item.name || meta.name || slug,
    localName: meta.localName || item.name || slug,
    category: (meta.category as Product["category"]) || "Grain",
    price,
    weight: meta.weight || "500g pack",
    image: meta.image || "",
    giTag: Boolean(meta.giTag),
    organic: meta.organic !== false,
    featured: Boolean(meta.featured),
    altitude: meta.altitude || "1,200m – 1,800m",
    harvestSeason: meta.harvestSeason || "October – December",
    tagline: meta.tagline || item.name,
    description: cleanDesc || meta.tagline || item.name,
    tastingNotes: Array.isArray(meta.tastingNotes) ? meta.tastingNotes : ["Authentic Himalayan harvest"],
    traditionalUses: Array.isArray(meta.traditionalUses) ? meta.traditionalUses : ["Traditional mountain kitchen preparation"],
    pairingSuggestions: Array.isArray(meta.pairingSuggestions) ? meta.pairingSuggestions : ["Steamed mountain rice"],
    razorpayItemId: item.id,
    active: item.active !== false,
  };
}

/**
 * Fetch all Razorpay items tagged with [chakung:...]
 */
export async function fetchRazorpayItems(): Promise<any[]> {
  const auth = getRazorpayAuth();
  if (!auth) return [];

  try {
    const res = await fetch("https://api.razorpay.com/v1/items?count=100", {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    console.error("Error fetching Razorpay items:", err);
    return [];
  }
}

/**
 * Creates or updates an item in Razorpay Items catalog.
 * If product is inactive, deactivates it in Razorpay.
 */
export async function syncProductToRazorpay(product: StoredProduct): Promise<string | undefined> {
  const auth = getRazorpayAuth();
  if (!auth) return product.razorpayItemId;

  const amountPaise = Math.max(100, getPriceNumber(product.price) * 100);
  const commonPayload = {
    name: product.name.slice(0, 50),
    description: buildRazorpayItemDescription(product),
    amount: amountPaise,
    currency: "INR",
  };

  try {
    // 1. If we already have the Razorpay Item ID, attempt a PATCH
    if (product.razorpayItemId) {
      const res = await fetch(`https://api.razorpay.com/v1/items/${product.razorpayItemId}`, {
        method: "PATCH",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...commonPayload,
          active: product.active !== false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    }

    // 2. Look for existing Razorpay item by chakung slug
    const existingItems = await fetchRazorpayItems();
    const match = existingItems.find((it) => {
      const parsed = parseRazorpayItem(it);
      return parsed?.slug === product.slug;
    });

    if (match) {
      const res = await fetch(`https://api.razorpay.com/v1/items/${match.id}`, {
        method: "PATCH",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...commonPayload,
          active: product.active !== false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    }

    // 3. If not found and product is active, create new Item (POST does NOT allow active field)
    if (product.active !== false) {
      const createRes = await fetch("https://api.razorpay.com/v1/items", {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commonPayload),
      });

      if (createRes.ok) {
        const data = await createRes.json();
        return data.id;
      } else {
        const err = await createRes.json();
        console.error("Razorpay item create error:", err);
        throw new Error(err.error?.description || "Razorpay rejected item creation");
      }
    }
  } catch (err: any) {
    console.error("Failed to sync product to Razorpay:", err);
    throw err;
  }

  return product.razorpayItemId;
}

/**
 * Returns all active products.
 * Merges local file store (seeded with initial static products) with any Razorpay Item overrides.
 */
export async function getAllProducts(includeInactive = false): Promise<StoredProduct[]> {
  let local = readLocalProducts();
  if (!local || local.length === 0) {
    local = seedProducts();
    writeLocalProducts(local);
  }

  // Fetch Razorpay items to sync and persist cloud state
  const rzpItems = await fetchRazorpayItems();
  if (rzpItems.length > 0) {
    const bySlug = new Map<string, StoredProduct>();
    for (const p of local) {
      bySlug.set(p.slug, p);
    }

    for (const rzpItem of rzpItems) {
      const parsed = parseRazorpayItem(rzpItem);
      if (!parsed || !parsed.slug) continue;

      const existing = bySlug.get(parsed.slug);
      if (existing) {
        // Local state has the latest user edits/uploads.
        // Never let an empty or stale image from Razorpay overwrite an existing local image!
        const resolvedImage = existing.image || parsed.image || "";
        bySlug.set(parsed.slug, {
          ...parsed,
          ...existing,
          image: resolvedImage,
          razorpayItemId: rzpItem.id || existing.razorpayItemId,
          active: existing.active !== undefined ? existing.active : parsed.active,
        });
      } else if (parsed.active !== false) {
        bySlug.set(parsed.slug, parsed);
      }
    }

    local = Array.from(bySlug.values());
  }

  return includeInactive ? local : local.filter((p) => p.active !== false);
}

export async function getProductBySlug(slug: string): Promise<StoredProduct | undefined> {
  const all = await getAllProducts(false);
  return all.find((p) => p.slug === slug);
}

export async function saveProduct(
  productInput: StoredProduct,
  syncRazorpay = true
): Promise<StoredProduct> {
  const all = await getAllProducts(true);
  const idx = all.findIndex((p) => p.slug === productInput.slug);

  const normalizedPrice = productInput.price.startsWith("₹")
    ? productInput.price
    : `₹${getPriceNumber(productInput.price)}`;

  const product: StoredProduct = {
    ...(idx >= 0 ? all[idx] : {}),
    ...productInput,
    price: normalizedPrice,
    active: productInput.active !== false,
    updatedAt: new Date().toISOString(),
  };

  if (syncRazorpay) {
    try {
      const rzpId = await syncProductToRazorpay(product);
      if (rzpId) {
        product.razorpayItemId = rzpId;
      }
    } catch (e) {
      console.error("Razorpay sync error (continuing with local save):", e);
    }
  }

  if (idx >= 0) {
    all[idx] = product;
  } else {
    all.push(product);
  }

  writeLocalProducts(all);
  return product;
}

export async function deleteProduct(slug: string): Promise<boolean> {
  const all = await getAllProducts(true);
  const idx = all.findIndex((p) => p.slug === slug);
  if (idx === -1) return false;

  const target = all[idx];
  target.active = false;
  target.updatedAt = new Date().toISOString();

  // Deactivate on Razorpay Items so it stays removed even across serverless restarts
  await syncProductToRazorpay(target);

  // If Razorpay item existed, delete it from Razorpay
  if (target.razorpayItemId) {
    const auth = getRazorpayAuth();
    if (auth) {
      try {
        await fetch(`https://api.razorpay.com/v1/items/${target.razorpayItemId}`, {
          method: "DELETE",
          headers: { Authorization: auth },
        });
      } catch {}
    }
  }

  const remaining = all.filter((p) => p.slug !== slug);
  writeLocalProducts(remaining);
  return true;
}

export async function syncAllProductsWithRazorpay(): Promise<{
  synced: number;
  products: StoredProduct[];
}> {
  const all = await getAllProducts(false);
  const updated: StoredProduct[] = [];
  let synced = 0;

  for (const product of all) {
    const rzpId = await syncProductToRazorpay(product);
    if (rzpId) {
      product.razorpayItemId = rzpId;
      synced++;
    }
    updated.push(product);
  }

  writeLocalProducts(updated);
  return { synced, products: updated };
}
