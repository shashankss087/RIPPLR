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
  const skus = await prisma.sku.findMany({
    where: brandId ? { brandId } : undefined,
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
