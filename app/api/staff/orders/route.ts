import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAllOrders, updateOrderStatus } from "@/lib/orders";

const STAFF_COOKIE_NAME = "chakung_staff_auth";

async function isStaffAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  const expectedPin = (process.env.STAFF_PIN || "1400").trim();
  return token === `staff_auth_${expectedPin}`;
}

export async function GET() {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized. Staff PIN required." }, { status: 401 });
  }

  const orders = await getAllOrders();
  return NextResponse.json({ orders });
}

export async function PATCH(request: Request) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized. Staff PIN required." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderId, status, trackingNumber } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const updated = await updateOrderStatus(orderId, { status, trackingNumber });
    // updateOrderStatus writes to Razorpay notes; return success regardless of local stub
    return NextResponse.json({ success: true, order: updated ?? { id: orderId, status, trackingNumber } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update order" }, { status: 500 });
  }
}
