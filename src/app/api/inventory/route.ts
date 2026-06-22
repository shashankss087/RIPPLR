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
  const inventory = await prisma.inventory.findMany({
    where: brandId ? { sku: { brandId } } : undefined,
    include: {
      sku: { include: { brand: true } },
      mfc: true,
    },
    orderBy: { onHand: "desc" },
  });
  const shaped = inventory.map((i) => ({
    id: i.id,
    skuCode: i.sku.code,
    skuName: i.sku.name,
    brandName: i.sku.brand.name,
    tempZone: i.sku.tempZone,
    mfcName: i.mfc.name,
    city: i.mfc.city,
    onHand: i.onHand,
    allocated: i.allocated,
    available: i.onHand - i.allocated,
    inTransit: i.inTransit,
    safetyStock: i.safetyStock,
    belowSafety: i.onHand - i.allocated < i.safetyStock,
  }));
  return NextResponse.json(shaped);
}
