import { NextRequest, NextResponse } from "next/server";
import { advanceReturn } from "@/lib/returns";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  try {
    await advanceReturn(params.id, { status: body.status, disposition: body.disposition });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
