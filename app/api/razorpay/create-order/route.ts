import { NextResponse } from "next/server";
import { getProduct, getPriceNumber } from "@/content/products";

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

    // Securely calculate total by looking up prices from server-side products
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const product = getProduct(item.slug);
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
    };
    if (customer?.name) notes.customer_name = customer.name.slice(0, 40);
    if (customer?.phone) notes.customer_phone = customer.phone.slice(0, 15);
    if (customer?.pincode) notes.pincode = customer.pincode.slice(0, 10);

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
      customer,
    });
  } catch (error: any) {
    console.error("Order creation internal error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
