import * as webpush from "web-push";
import fs from "fs";
import path from "path";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BBAPZXCZyKKuGHz7wwhrq8Amc7xnQQQBhtZKMuhgpWGnnC5Pb0LQ23J4WjeAinV9xavo5C3joLWLmug8Q78CAR8";

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || "A2bm3qOjzt9hkTSHnQHkwjTFjB_LZB-SjD4B_7nZCAE";

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:viewpointchakung@gmail.com";

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.error("Failed to initialize webpush VAPID details:", e);
}

export interface PushSubscriptionItem {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt?: string;
}

let memorySubs: PushSubscriptionItem[] = [];

function getSubsFilePath(): string {
  const localDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, "subscriptions.json");
  } catch {
    return path.join("/tmp", "chakung_subscriptions.json");
  }
}

export async function getAllSubscriptions(): Promise<PushSubscriptionItem[]> {
  try {
    const filePath = getSubsFilePath();
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (Array.isArray(data)) {
        memorySubs = data;
        return data;
      }
    }
  } catch (err) {
    console.error("Error reading subscriptions, using memory cache:", err);
  }
  return memorySubs;
}

export async function saveSubscription(sub: PushSubscriptionItem): Promise<void> {
  const all = await getAllSubscriptions();
  const exists = all.some((s) => s.endpoint === sub.endpoint);
  if (!exists) {
    all.push({ ...sub, createdAt: new Date().toISOString() });
    memorySubs = all;
    try {
      const filePath = getSubsFilePath();
      fs.writeFileSync(filePath, JSON.stringify(all, null, 2), "utf-8");
    } catch (err) {
      console.error("Error writing subscriptions file:", err);
    }
  }
}

export async function removeSubscription(endpoint: string): Promise<void> {
  let all = await getAllSubscriptions();
  all = all.filter((s) => s.endpoint !== endpoint);
  memorySubs = all;
  try {
    const filePath = getSubsFilePath();
    fs.writeFileSync(filePath, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.error("Error updating subscriptions file:", err);
  }
}

export async function sendPushNotificationToAll(payload: {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}): Promise<{ sent: number; failed: number }> {
  const subscriptions = await getAllSubscriptions();
  let sent = 0;
  let failed = 0;

  const notificationString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/staff",
    icon: payload.icon || "/products/dalle-khursani.jpg",
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        notificationString
      );
      sent++;
    } catch (err: any) {
      failed++;
      // If subscription expired or gone (404/410), clean it up
      if (err.statusCode === 404 || err.statusCode === 410) {
        await removeSubscription(sub.endpoint);
      }
    }
  }

  return { sent, failed };
}
