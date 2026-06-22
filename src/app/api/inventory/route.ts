import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const inventory = await prisma.inventory.findMany({
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
