import nodemailer from "nodemailer";

export interface OrderEmailData {
  orderId: string;
  paymentId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: Array<{
    slug?: string;
    name: string;
    localName?: string;
    weight: string;
    quantity: number;
    unitPrice?: number;
    itemTotal?: number;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
}

function getTransporter() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

/**
 * Sends a new order alert to the Chakung Store owner & packing team.
 */
export async function sendStoreOwnerNotification(order: OrderEmailData) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("Gmail SMTP credentials (GMAIL_USER / GMAIL_APP_PASSWORD) not configured. Skipping owner email alert.");
    return { success: false, reason: "SMTP not configured" };
  }

  const notificationEmail =
    process.env.STORE_NOTIFICATION_EMAIL || process.env.GMAIL_USER;
  const phoneClean = order.customer.phone.replace(/[^0-9]/g, "");
  const waLink = `https://wa.me/91${phoneClean}?text=${encodeURIComponent(
    `Hello ${order.customer.name}, this is Chakung Store regarding your order #${order.orderId}.`
  )}`;

  const itemsRowsHtml = order.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #e0d5c4;">
        <td style="padding: 10px 8px; font-weight: 600; color: #1a3328;">
          ${item.name}
          ${item.localName ? `<br><small style="color: #666; font-weight: normal;">${item.localName}</small>` : ""}
        </td>
        <td style="padding: 10px 8px; color: #555;">${item.weight}</td>
        <td style="padding: 10px 8px; text-align: center; font-weight: bold; font-size: 16px; color: #c4622d;">
          ${item.quantity}
        </td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 500;">
          ₹${item.itemTotal || (item.unitPrice ? item.unitPrice * item.quantity : 0)}
        </td>
      </tr>`
    )
    .join("");

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>New Order Alert</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f1e7; margin: 0; padding: 24px; color: #1c1915;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e0d5c4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      
      <!-- Header -->
      <div style="background-color: #1a3328; color: #f6f1e7; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em;">🏔️ Chakung Store — New Order Received!</h1>
        <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Order Reference: <strong>${order.orderId}</strong> · Paid via Razorpay</p>
      </div>

      <!-- Quick Action Buttons -->
      <div style="padding: 16px 24px; background-color: #ede7d8; text-align: center; border-bottom: 1px solid #e0d5c4;">
        <a href="${waLink}" style="display: inline-block; background-color: #25D366; color: #ffffff; font-weight: 600; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-size: 14px; margin-right: 8px;">
          💬 Message Customer on WhatsApp
        </a>
        <a href="tel:+91${phoneClean}" style="display: inline-block; background-color: #1a3328; color: #ffffff; font-weight: 600; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-size: 14px;">
          📞 Call Customer
        </a>
      </div>

      <div style="padding: 24px;">
        <!-- Customer & Delivery Info -->
        <div style="background-color: #faf7f2; border: 1px solid #e0d5c4; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 10px; font-size: 15px; color: #1a3328; text-transform: uppercase; letter-spacing: 0.04em;">📍 Delivery & Packing Destination</h3>
          <p style="margin: 4px 0; font-size: 15px;"><strong>Name:</strong> ${order.customer.name}</p>
          <p style="margin: 4px 0; font-size: 15px;"><strong>Phone:</strong> ${order.customer.phone}</p>
          <p style="margin: 4px 0; font-size: 15px;"><strong>Email:</strong> ${order.customer.email}</p>
          <p style="margin: 4px 0; font-size: 15px;"><strong>Address:</strong><br>
            ${order.customer.address}<br>
            ${order.customer.city}, ${order.customer.state} - <strong>${order.customer.pincode}</strong>
          </p>
        </div>

        <!-- Packing List Table -->
        <h3 style="margin: 0 0 12px; font-size: 15px; color: #1a3328; text-transform: uppercase; letter-spacing: 0.04em;">📦 Items to Pack</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f6f1e7; text-align: left; border-bottom: 2px solid #e0d5c4;">
              <th style="padding: 10px 8px;">Produce</th>
              <th style="padding: 10px 8px;">Weight</th>
              <th style="padding: 10px 8px; text-align: center;">Qty</th>
              <th style="padding: 10px 8px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="border-top: 2px solid #e0d5c4; padding-top: 12px; text-align: right; font-size: 14px;">
          <p style="margin: 4px 0; color: #666;">Subtotal: <strong>₹${order.subtotal}</strong></p>
          <p style="margin: 4px 0; color: #666;">Shipping (Speed Post): <strong>₹${order.shipping}</strong></p>
          <p style="margin: 8px 0 0; font-size: 18px; font-weight: bold; color: #1a3328;">
            Total Collected: ₹${order.total}
          </p>
        </div>

        <!-- Payment Meta -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #e0d5c4; font-size: 12px; color: #777;">
          <p style="margin: 2px 0;">Razorpay Payment ID: <code>${order.paymentId}</code></p>
          <p style="margin: 2px 0;">Razorpay Order ID: <code>${order.orderId}</code></p>
          <p style="margin: 2px 0;">Hand-pack from Soreng District, West Sikkim and ship via India Post Speed Post.</p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  return transporter.sendMail({
    from: `"Chakung Store Orders" <${process.env.GMAIL_USER}>`,
    to: notificationEmail,
    subject: `🏔️ New Harvest Order! #${order.orderId} — ₹${order.total} (${order.customer.name})`,
    html,
  });
}

/**
 * Sends an official order confirmation & dispatch guide to the customer.
 */
export async function sendCustomerConfirmation(order: OrderEmailData) {
  const transporter = getTransporter();
  if (!transporter) {
    return { success: false, reason: "SMTP not configured" };
  }

  const itemsRowsHtml = order.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #e0d5c4;">
        <td style="padding: 10px 8px; font-weight: 500; color: #1a3328;">
          ${item.name}
          <br><small style="color: #666;">${item.weight}</small>
        </td>
        <td style="padding: 10px 8px; text-align: center; font-weight: 600;">
          × ${item.quantity}
        </td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 500;">
          ₹${item.itemTotal || (item.unitPrice ? item.unitPrice * item.quantity : 0)}
        </td>
      </tr>`
    )
    .join("");

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Chakung Store Harvest Confirmation</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f1e7; margin: 0; padding: 24px; color: #1c1915;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e0d5c4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      
      <!-- Brand Header -->
      <div style="background-color: #1a3328; color: #f6f1e7; padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 500; letter-spacing: -0.02em;">Chakung Store</h1>
        <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.08em;">Organic Himalayan Village Produce · West Sikkim</p>
      </div>

      <div style="padding: 32px 24px;">
        <h2 style="margin: 0 0 10px; font-size: 20px; color: #1a3328;">Tashi Delek, ${order.customer.name}!</h2>
        <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #444;">
          Thank you for supporting our village farmers. Your order has been received and confirmed. We are hand-packing your produce directly at Chakung ridge in West Sikkim.
        </p>

        <!-- Order Info Card -->
        <div style="background-color: #faf7f2; border: 1px solid #e0d5c4; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 3px 0; font-size: 13px; color: #666;">Order Reference: <strong style="color: #1a3328;">${order.orderId}</strong></p>
          <p style="margin: 3px 0; font-size: 13px; color: #666;">Payment ID: <code style="color: #1a3328;">${order.paymentId}</code></p>
          <p style="margin: 3px 0; font-size: 13px; color: #666;">Delivery Address: <strong style="color: #1a3328;">${order.customer.address}, ${order.customer.city}, ${order.customer.state} - ${order.customer.pincode}</strong></p>
        </div>

        <!-- Produce Summary -->
        <h3 style="margin: 0 0 12px; font-size: 15px; color: #1a3328;">Your Harvest Basket</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f6f1e7; text-align: left; border-bottom: 2px solid #e0d5c4;">
              <th style="padding: 8px;">Item</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="border-top: 2px solid #e0d5c4; padding-top: 12px; text-align: right; font-size: 14px; margin-bottom: 28px;">
          <p style="margin: 4px 0; color: #666;">Subtotal: <strong>₹${order.subtotal}</strong></p>
          <p style="margin: 4px 0; color: #666;">Speed Post Shipping: <strong>₹${order.shipping}</strong></p>
          <p style="margin: 8px 0 0; font-size: 18px; font-weight: bold; color: #1a3328;">
            Total Paid: ₹${order.total}
          </p>
        </div>

        <!-- Dispatch Timeline -->
        <div style="background-color: #ede7d8; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
          <h4 style="margin: 0 0 10px; font-size: 14px; color: #1a3328;">📦 Himalayan Dispatch & Speed Post Delivery</h4>
          <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.5; color: #333;">
            • <strong>Dispatched from Soreng District</strong> via India Post Speed Post.
          </p>
          <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.5; color: #333;">
            • <strong>Tracking Consignment:</strong> Once dispatched at the local post office, we will share the India Post tracking number with you.
          </p>
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #333;">
            • <strong>Estimated Delivery:</strong> 4 to 7 business days across most Indian cities.
          </p>
        </div>

        <!-- Need Help / WhatsApp -->
        <div style="text-align: center; padding-top: 12px; border-top: 1px solid #e0d5c4;">
          <p style="margin: 0 0 12px; font-size: 14px; color: #666;">Questions or dispatch enquiries?</p>
          <a href="https://wa.me/916295034036?text=${encodeURIComponent(
            `Hello Chakung Store, checking on my order #${order.orderId}`
          )}" style="display: inline-block; background-color: #1a3328; color: #f6f1e7; font-weight: 500; padding: 10px 20px; border-radius: 999px; text-decoration: none; font-size: 14px;">
            Message Us on WhatsApp (+91 62950 34036)
          </a>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  return transporter.sendMail({
    from: `"Chakung Store" <${process.env.GMAIL_USER}>`,
    to: order.customer.email,
    subject: `Chakung Store · Your Sikkim harvest order is confirmed (#${order.orderId})`,
    html,
  });
}
