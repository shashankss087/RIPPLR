import { NextRequest, NextResponse } from "next/server";
import { advanceShipment } from "@/lib/corridor";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  try {
    await advanceShipment(params.id, { to: body.status, location: body.location, note: body.note });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
