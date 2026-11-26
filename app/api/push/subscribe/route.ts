import { NextResponse } from "next/server";
import { saveSubscription } from "@/lib/push";

export async function GET() {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    "BBAPZXCZyKKuGHz7wwhrq8Amc7xnQQQBhtZKMuhgpWGnnC5Pb0LQ23J4WjeAinV9xavo5C3joLWLmug8Q78CAR8";
  return NextResponse.json({ publicKey });
}

export async function POST(request: Request) {
  try {
    const subscription = await request.json();
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Invalid push subscription object" }, { status: 400 });
    }

    await saveSubscription(subscription);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save subscription" }, { status: 500 });
  }
}
