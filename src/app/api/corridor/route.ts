import { NextResponse } from "next/server";
import { getCorridorSummary } from "@/lib/corridor";

export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await getCorridorSummary();
  return NextResponse.json(summary);
}
