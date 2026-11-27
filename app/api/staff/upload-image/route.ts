import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

const STAFF_COOKIE_NAME = "chakung_staff_auth";

async function isStaffAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  const expectedPin = (process.env.STAFF_PIN || "1400").trim();
  return token === `staff_auth_${expectedPin}`;
}

export async function GET() {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dir = path.join(process.cwd(), "public", "products");
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ images: [] });
    }
    const files = fs
      .readdirSync(dir)
      .filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f))
      .map((f) => `/products/${f}`);
    return NextResponse.json({ images: files });
  } catch (err: any) {
    return NextResponse.json({ images: [], error: err.message });
  }
}

export async function POST(request: Request) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be smaller than 5MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const baseName = file.name
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    const filename = `${baseName || "product"}-${Date.now()}.${ext}`;

    // Try writing to public/products (works locally). On read-only serverless (Vercel), return data URL.
    try {
      const dir = path.join(process.cwd(), "public", "products");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const targetPath = path.join(dir, filename);
      fs.writeFileSync(targetPath, buffer);
      return NextResponse.json({
        success: true,
        url: `/products/${filename}`,
        storage: "local",
      });
    } catch {
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;
      return NextResponse.json({
        success: true,
        url: dataUrl,
        storage: "inline",
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to upload image" }, { status: 500 });
  }
}
