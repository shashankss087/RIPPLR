import { NextResponse } from "next/server";
import { getReturnsSummary } from "@/lib/returns";

export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await getReturnsSummary();
  return NextResponse.json(summary);
}
