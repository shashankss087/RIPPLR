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
  const invoices = await prisma.invoice.findMany({
    where: brandId ? { brandId } : undefined,
    orderBy: [{ dueDate: "asc" }],
    include: { channel: true, brand: true },
  });
  return NextResponse.json(invoices);
}
