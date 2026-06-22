import { NextRequest, NextResponse } from "next/server";
import { advanceDelivery } from "@/lib/deliveries";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  try {
    await advanceDelivery(params.id, { to: body.status });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
