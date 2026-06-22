import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const deliveries = await prisma.delivery.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { mfc: true, channel: true },
  });
  return NextResponse.json(deliveries);
}
