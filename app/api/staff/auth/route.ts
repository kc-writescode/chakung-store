import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const STAFF_COOKIE_NAME = "chakung_staff_auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  const expectedPin = (process.env.STAFF_PIN || "1400").trim();

  const authenticated = token === `staff_auth_${expectedPin}`;
  return NextResponse.json({ authenticated });
}

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();
    const expectedPin = (process.env.STAFF_PIN || "1400").trim();

    if (!pin || pin.toString().trim() !== expectedPin) {
      return NextResponse.json({ success: false, error: "Incorrect security PIN" }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set(STAFF_COOKIE_NAME, `staff_auth_${expectedPin}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_COOKIE_NAME);
  return NextResponse.json({ success: true });
}
