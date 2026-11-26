import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAllOrders, updateOrderStatus } from "@/lib/orders";
import { createShiprocketOrder } from "@/lib/shiprocket";

const STAFF_COOKIE_NAME = "chakung_staff_auth";

async function isStaffAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  const expectedPin = (process.env.STAFF_PIN || "1400").trim();
  return token === `staff_auth_${expectedPin}`;
}

export async function POST(request: Request) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized. Staff PIN required." }, { status: 401 });
  }

  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const orders = await getAllOrders();
    const order = orders.find((o) => o.id === orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const shiprocketResult = await createShiprocketOrder(order);

    // Update order with Shiprocket metadata
    await updateOrderStatus(orderId, {
      status: "Packed",
      shiprocketOrderId: shiprocketResult.orderId,
      shiprocketShipmentId: shiprocketResult.shipmentId,
    });

    return NextResponse.json({
      success: true,
      shiprocketOrderId: shiprocketResult.orderId,
      shipmentId: shiprocketResult.shipmentId,
      status: shiprocketResult.status,
    });
  } catch (err: any) {
    console.error("Shiprocket shipment creation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create Shiprocket shipment" },
      { status: 500 }
    );
  }
}
