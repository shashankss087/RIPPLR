import { NextResponse } from "next/server";
import { getCollectionsSummary } from "@/lib/collections";
import { getScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { brandId } = await getScope();
    return NextResponse.json(await getCollectionsSummary(brandId));
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
}
