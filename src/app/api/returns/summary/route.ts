import { NextResponse } from "next/server";
import { getReturnsSummary } from "@/lib/returns";
import { getScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { brandId } = await getScope();
    return NextResponse.json(await getReturnsSummary(brandId));
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
}
