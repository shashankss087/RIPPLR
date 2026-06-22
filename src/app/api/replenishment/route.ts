import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  let brandId: string | null;
  try {
    ({ brandId } = await getScope());
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const orders = await prisma.replenishmentOrder.findMany({
    where: brandId ? { sku: { brandId } } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      sku: { include: { brand: true } },
      mfc: true,
      channel: true,
    },
  });
  return NextResponse.json(orders);
}
