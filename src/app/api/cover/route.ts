import { NextResponse } from "next/server";
import { getCoverAnalysis } from "@/lib/orchestration";
import { getScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { brandId } = await getScope();
    return NextResponse.json(await getCoverAnalysis(brandId));
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
}
