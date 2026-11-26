import fs from "fs";
import path from "path";

export interface StoredOrder {
  id: string; // Order reference ID or Razorpay Order ID
  orderId?: string;
  paymentId: string;
  createdAt: string;
  status: "Paid / Pending Pack" | "Packed" | "Dispatched via Speed Post" | "Delivered";
  trackingNumber?: string;
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

// In-memory fallback cache for serverless environments
let memoryOrdersCache: StoredOrder[] = [];

function getOrdersFilePath(): string {
  // Use project data dir if writable, otherwise /tmp for serverless
  const localDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, "orders.json");
  } catch {
    const tmpDir = "/tmp";
    return path.join(tmpDir, "chakung_orders.json");
  }
}

export async function getAllOrders(): Promise<StoredOrder[]> {
  try {
    const filePath = getOrdersFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        memoryOrdersCache = list;
        return list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    }
  } catch (err) {
    console.error("Failed to read orders from file, using in-memory cache:", err);
  }
  return memoryOrdersCache.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function saveOrder(order: StoredOrder): Promise<void> {
  try {
    const currentOrders = await getAllOrders();
    const existingIndex = currentOrders.findIndex((o) => o.id === order.id);

    if (existingIndex >= 0) {
      currentOrders[existingIndex] = { ...currentOrders[existingIndex], ...order };
    } else {
      currentOrders.unshift(order);
    }

    memoryOrdersCache = currentOrders;

    const filePath = getOrdersFilePath();
    fs.writeFileSync(filePath, JSON.stringify(currentOrders, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write order to disk:", err);
  }
}

export async function updateOrderStatus(
  orderId: string,
  updates: { status?: StoredOrder["status"]; trackingNumber?: string }
): Promise<StoredOrder | null> {
  const currentOrders = await getAllOrders();
  const order = currentOrders.find((o) => o.id === orderId);
  if (!order) return null;

  if (updates.status) order.status = updates.status;
  if (updates.trackingNumber !== undefined) order.trackingNumber = updates.trackingNumber.trim();

  await saveOrder(order);
  return order;
}
