import { NextResponse } from "next/server";
import comuniData from "@/data/comuni.json";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const query = q.toLowerCase();
  const results = comuniData.filter((c) => c.nome.toLowerCase().startsWith(query)).slice(0, 20);

  return NextResponse.json(results);
}
