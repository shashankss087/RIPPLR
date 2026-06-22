import { NextRequest, NextResponse } from "next/server";
import { recordPayment } from "@/lib/collections";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  try {
    const updated = await recordPayment(params.id, Number(body.pay));
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
