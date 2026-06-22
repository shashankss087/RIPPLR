import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createReturn } from "@/lib/returns";
import { getScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  let brandId: string | null;
  try {
    ({ brandId } = await getScope());
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const returns = await prisma.return.findMany({
    where: brandId ? { sku: { brandId } } : undefined,
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
