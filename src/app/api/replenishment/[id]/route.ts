import { NextRequest, NextResponse } from "next/server";
import { advanceReplenishment } from "@/lib/orchestration";

export const dynamic = "force-dynamic";

const ALLOWED = ["APPROVED", "DISPATCHED", "DELIVERED", "CANCELLED"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const to = String(body.status || "").toUpperCase();
  if (!ALLOWED.includes(to)) {
    return NextResponse.json({ error: `status must be one of ${ALLOWED.join(", ")}` }, { status: 400 });
  }
  try {
    await advanceReplenishment(params.id, to);
    return NextResponse.json({ ok: true, status: to });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
