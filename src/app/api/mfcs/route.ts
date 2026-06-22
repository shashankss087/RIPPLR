import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const mfcs = await prisma.mfc.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { inventory: true } } },
  });
  const withLoad = await Promise.all(
    mfcs.map(async (m) => {
      const agg = await prisma.inventory.aggregate({
        where: { mfcId: m.id },
        _sum: { onHand: true },
      });
      return {
        id: m.id,
        name: m.name,
        city: m.city,
        region: m.region,
        zones: m.zones.split(","),
        capacityCbm: m.capacityCbm,
        skuLines: m._count.inventory,
        unitsOnHand: agg._sum.onHand ?? 0,
      };
    })
  );
  return NextResponse.json(withLoad);
}
