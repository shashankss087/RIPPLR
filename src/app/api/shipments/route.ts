import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const shipments = await prisma.shipment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      lane: true,
      brand: true,
      milestones: { orderBy: { at: "asc" } },
    },
  });
  return NextResponse.json(shipments);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { laneId, brandId, category, hsCode, valueUsd, tempControlled } = body;
  if (!laneId || !category) {
    return NextResponse.json({ error: "laneId and category are required" }, { status: 400 });
  }
  const lane = await prisma.tradeLane.findUnique({ where: { id: laneId } });
  if (!lane) return NextResponse.json({ error: "Unknown lane" }, { status: 400 });

  const count = await prisma.shipment.count();
  const ref = `OUTNIF-${String(count + 1).padStart(5, "0")}`;
  const etaAt = new Date();
  etaAt.setDate(etaAt.getDate() + lane.outnifTransitDays);

  const shipment = await prisma.shipment.create({
    data: {
      reference: ref,
      laneId,
      brandId: brandId || null,
      containerNo: `CNTR${Math.floor(100000 + Math.random() * 899999)}`,
      hsCode: hsCode || "2106.90",
      category,
      tempControlled: !!tempControlled,
      valueUsd: Number(valueUsd) || 50000,
      status: "BOOKED",
      etaAt,
      milestones: { create: { status: "BOOKED", location: lane.origin, note: "Booking confirmed" } },
    },
    include: { lane: true, milestones: true },
  });
  return NextResponse.json(shipment, { status: 201 });
}
