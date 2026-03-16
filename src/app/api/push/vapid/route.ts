import { getVapidPublicKey } from "@/lib/web-push";
import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "VAPID non configurato" }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
