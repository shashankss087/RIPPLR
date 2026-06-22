import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const skus = await prisma.sku.findMany({
    orderBy: { name: "asc" },
    include: { brand: true },
  });
  return NextResponse.json(
    skus.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      brandName: s.brand.name,
      mrp: s.mrp,
      category: s.category,
      greenChannel: s.greenChannel,
    }))
  );
}
