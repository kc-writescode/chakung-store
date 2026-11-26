import { StoredOrder } from "./orders";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function getShiprocketCredentials() {
  const email = (
    process.env.SHIPROCKET_EMAIL ||
    "krishnachaitanya.web@gmail.com"
  ).trim();

  const password = (
    process.env.SHIPROCKET_PASSWORD ||
    process.env["Ship Rocket API"] ||
    "ljzW8dmJUhSe4GS6%Hw#dy$WFZ^#kxBW"
  ).trim();

  const pickupLocation = (
    process.env.SHIPROCKET_PICKUP_LOCATION ||
    "Dream Computer Chakung"
  ).trim();

  return { email, password, pickupLocation };
}

/**
 * Retrieves valid Shiprocket JWT Bearer Token (cached for 9 days).
 */
export async function getShiprocketToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now) {
    return cachedToken;
  }

  const { email, password } = getShiprocketCredentials();

  const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(
      `Shiprocket Auth Failed: ${data.message || JSON.stringify(data)}`
    );
  }

  cachedToken = data.token;
  // Cache for 9 days (Shiprocket tokens expire in 10 days)
  tokenExpiresAt = now + 9 * 24 * 60 * 60 * 1000;
  return cachedToken as string;
}

/**
 * Creates an ad-hoc custom order in Shiprocket.
 */
export async function createShiprocketOrder(order: StoredOrder) {
  const token = await getShiprocketToken();
  const { pickupLocation } = getShiprocketCredentials();

  const cleanPhone = order.customer.phone.replace(/[^0-9]/g, "").slice(-10);
  const nameParts = order.customer.name.trim().split(" ");
  const firstName = nameParts[0] || "Customer";
  const lastName = nameParts.slice(1).join(" ") || "Chakung";

  // Clean date format for Shiprocket (YYYY-MM-DD HH:mm:ss)
  const orderDate = new Date(order.createdAt || Date.now())
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);

  // Map items to Shiprocket product structure
  const orderItems = order.items.map((item, idx) => ({
    name: item.name,
    sku: item.slug || `SKU-CHK-${idx + 1}`,
    units: item.quantity,
    selling_price:
      item.unitPrice ||
      (item.itemTotal && item.quantity
        ? Math.round(item.itemTotal / item.quantity)
        : 100),
    discount: 0,
    tax: 0,
  }));

  // Estimate weight in KG (default 0.5kg)
  let totalWeightKg = 0.5;
  try {
    let grams = 0;
    for (const it of order.items) {
      const match = it.weight?.match(/(\d+)\s*g/i);
      if (match) {
        grams += parseInt(match[1], 10) * it.quantity;
      }
    }
    if (grams > 0) {
      totalWeightKg = Math.max(0.2, Math.round((grams / 1000) * 10) / 10);
    }
  } catch {
    totalWeightKg = 0.5;
  }

  const payload = {
    order_id: order.id,
    order_date: orderDate,
    pickup_location: pickupLocation,
    channel_id: "",
    comment: "Organic Produce from Chakung Ridge, West Sikkim",
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: order.customer.address,
    billing_address_2: "",
    billing_city: order.customer.city,
    billing_pincode: order.customer.pincode,
    billing_state: order.customer.state,
    billing_country: "India",
    billing_email: order.customer.email,
    billing_phone: cleanPhone,
    shipping_is_billing: true,
    order_items: orderItems,
    payment_method: "Prepaid",
    shipping_charges: order.shipping,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: order.subtotal,
    length: 15,
    breadth: 12,
    height: 10,
    weight: totalWeightKg,
  };

  const res = await fetch(
    "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Shiprocket Order Creation Failed: ${data.message || JSON.stringify(data)}`
    );
  }

  return {
    orderId: data.order_id,
    shipmentId: data.shipment_id,
    status: data.status,
    statusCode: data.status_code,
    raw: data,
  };
}

/**
 * Track shipment via Shiprocket AWB or Order ID
 */
export async function trackShiprocketShipment(awb: string) {
  const token = await getShiprocketToken();
  const res = await fetch(
    `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${encodeURIComponent(awb)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.json();
}
