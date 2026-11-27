import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAllOrders } from "@/lib/orders";

const STAFF_COOKIE_NAME = "chakung_staff_auth";

async function isStaffAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  const expectedPin = (process.env.STAFF_PIN || "1400").trim();
  return token === `staff_auth_${expectedPin}`;
}

export async function POST() {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // getAllOrders() now pulls directly from Razorpay as source of truth
    const orders = await getAllOrders();
    return NextResponse.json({
      success: true,
      importedCount: orders.length,
      totalOrders: orders.length,
      orders,
    });
  } catch (err: any) {
    console.error("Razorpay sync error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
