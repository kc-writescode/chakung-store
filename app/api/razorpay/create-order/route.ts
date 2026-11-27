import { NextResponse } from "next/server";
import { getPriceNumber } from "@/content/products";
import { getProductBySlug } from "@/lib/products-store";
import {
  isValidIndianPincode,
  normalizeIndianPhone,
  normalizeIndianState,
} from "@/lib/indian-address";

export async function POST(request: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay credentials not configured on server" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { items, customer } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty or invalid items provided" },
        { status: 400 }
      );
    }

    const cleanName = String(customer?.name || "").trim();
    const cleanPhone = normalizeIndianPhone(String(customer?.phone || ""));
    const cleanEmail = String(customer?.email || "").trim();
    const cleanAddress = String(customer?.address || "").trim();
    const cleanCity = String(customer?.city || "").trim();
    const cleanPincode = String(customer?.pincode || "").trim();
    const cleanState =
      normalizeIndianState(customer?.state) || String(customer?.state || "").trim();

    if (!cleanName) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    if (!cleanAddress) {
      return NextResponse.json(
        { error: "Please enter your delivery street / house address." },
        { status: 400 }
      );
    }
    if (!cleanCity) {
      return NextResponse.json(
        { error: "Please enter your city or town." },
        { status: 400 }
      );
    }
    if (!cleanState) {
      return NextResponse.json(
        { error: "Please select your delivery state or union territory." },
        { status: 400 }
      );
    }
    if (!isValidIndianPincode(cleanPincode)) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit Indian PIN code." },
        { status: 400 }
      );
    }

    const normalizedCustomer = {
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      address: cleanAddress,
      city: cleanCity,
      state: cleanState,
      pincode: cleanPincode,
    };

    // Securely calculate total by looking up prices from server-side products
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const product = await getProductBySlug(item.slug);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.slug}` },
          { status: 400 }
        );
      }
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const unitPrice = getPriceNumber(product.price);
      const itemTotal = unitPrice * qty;
      subtotal += itemTotal;

      verifiedItems.push({
        slug: product.slug,
        name: product.name,
        localName: product.localName,
        weight: product.weight,
        unitPrice,
        quantity: qty,
        itemTotal,
      });
    }

    // Shipping logic: ₹50 discounted shipping on orders ₹500 or above, otherwise ₹70 Speed Post flat rate
    const shipping = subtotal >= 500 ? 50 : 70;
    const total = subtotal + shipping;
    const amountInPaise = Math.round(total * 100);

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

    // Generate clean receipt ID (max 40 chars for Razorpay)
    const receipt = `chk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const notes: Record<string, string> = {
      store: "Chakung Store, West Sikkim",
      order_type: "Village Produce Dispatch",
      customer_name: normalizedCustomer.name.slice(0, 40),
      customer_phone: normalizedCustomer.phone.slice(0, 15),
      customer_email: normalizedCustomer.email.slice(0, 60),
      address: normalizedCustomer.address.slice(0, 250),
      city: normalizedCustomer.city.slice(0, 50),
      state: normalizedCustomer.state.slice(0, 50),
      pincode: normalizedCustomer.pincode.slice(0, 10),
    };
    // Store compact items JSON for sync recovery (Razorpay note value max 256 chars)
    try {
      const compactItems = verifiedItems.map((i) => ({
        s: i.slug,
        n: i.name,
        w: i.weight,
        q: i.quantity,
        p: i.unitPrice,
        t: i.itemTotal,
      }));
      const itemsJson = JSON.stringify(compactItems);
      if (itemsJson.length <= 256) {
        notes.items_json = itemsJson;
      }
    } catch {}
    notes.subtotal = String(subtotal);
    notes.shipping = String(shipping);

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt,
        notes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Razorpay order creation error:", data);
      return NextResponse.json(
        { error: data.error?.description || "Failed to create Razorpay order" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      keyId,
      subtotal,
      shipping,
      total,
      items: verifiedItems,
      customer: normalizedCustomer,
    });
  } catch (error: any) {
    console.error("Order creation internal error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
