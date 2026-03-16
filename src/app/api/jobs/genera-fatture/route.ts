import { NextResponse } from "next/server";
import { generaFattureContrattiPerMese } from "@/app/(dashboard)/contratti/actions";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET non configurato" },
      { status: 500 }
    );
  }

  const headerToken = request.headers.get("x-cron-token");
  if (!headerToken || headerToken !== secret) {
    return NextResponse.json(
      { success: false, error: "Non autorizzato" },
      { status: 401 }
    );
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const res = await generaFattureContrattiPerMese(year, month);

  return NextResponse.json({ ...res, success: true });
}

