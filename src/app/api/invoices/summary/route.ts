import { NextResponse } from "next/server";
import { getCollectionsSummary } from "@/lib/collections";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getCollectionsSummary());
}
