import { NextResponse } from "next/server";
import { getDeliverySummary } from "@/lib/deliveries";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getDeliverySummary());
}
