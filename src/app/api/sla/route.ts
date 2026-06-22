import { NextResponse } from "next/server";
import { getSlaSummary } from "@/lib/orchestration";

export const dynamic = "force-dynamic";

export async function GET() {
  const sla = await getSlaSummary();
  return NextResponse.json(sla);
}
