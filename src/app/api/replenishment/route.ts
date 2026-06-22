import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await prisma.replenishmentOrder.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      sku: { include: { brand: true } },
      mfc: true,
      channel: true,
    },
  });
  return NextResponse.json(orders);
}
