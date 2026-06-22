import { NextResponse } from "next/server";
import { runOrchestration } from "@/lib/orchestration";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await runOrchestration();
  return NextResponse.json(result);
}
