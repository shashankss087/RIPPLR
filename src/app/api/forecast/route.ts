import { NextResponse } from "next/server";
import { getForecastDetails } from "@/lib/orchestration";

export const dynamic = "force-dynamic";

export async function GET() {
  const details = await getForecastDetails();
  return NextResponse.json(details);
}
