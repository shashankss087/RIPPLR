import { NextResponse } from "next/server";
import { getCoverAnalysis } from "@/lib/orchestration";

export const dynamic = "force-dynamic";

export async function GET() {
  const cover = await getCoverAnalysis();
  return NextResponse.json(cover);
}
