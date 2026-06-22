import { NextResponse } from "next/server";
import { getSlaSummary } from "@/lib/orchestration";
import { getScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { brandId } = await getScope();
    return NextResponse.json(await getSlaSummary(brandId));
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
}
