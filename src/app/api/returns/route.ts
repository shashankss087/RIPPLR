import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createReturn } from "@/lib/returns";

export const dynamic = "force-dynamic";

export async function GET() {
  const returns = await prisma.return.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      sku: { include: { brand: true } },
      channel: true,
      mfc: true,
    },
  });
  return NextResponse.json(returns);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    const created = await createReturn({
      skuId: body.skuId,
      channelId: body.channelId,
      mfcId: body.mfcId,
      qty: Number(body.qty),
      reason: body.reason,
      notes: body.notes,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
