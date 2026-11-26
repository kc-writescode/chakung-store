import { NextResponse } from "next/server";
import { sendPushNotificationToAll } from "@/lib/push";

export async function POST() {
  try {
    const result = await sendPushNotificationToAll({
      title: "🏔️ Test Push Notification",
      body: "Chakung Store Web Push is active and connected on this device!",
      url: "/staff",
    });
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
