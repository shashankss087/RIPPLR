import { prisma } from "./prisma";

/**
 * OutNIF cross-border corridor.
 *
 * Models the India → UAE → KSA → EU/US trade lanes from the corridor deck, the
 * lane economics (traditional vs OutNIF cost & transit), and a Shipsy-style
 * control tower that advances containers through a milestone timeline.
 */

// Ordered status flow through the corridor.
export const SHIPMENT_FLOW = [
  "BOOKED",
  "CONSOLIDATING",
  "IN_TRANSIT",
  "CUSTOMS",
  "AT_HUB",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_FLOW)[number] | "EXCEPTION";

export function nextStatus(current: string): ShipmentStatus | null {
  const i = SHIPMENT_FLOW.indexOf(current as (typeof SHIPMENT_FLOW)[number]);
  if (i < 0 || i >= SHIPMENT_FLOW.length - 1) return null;
  return SHIPMENT_FLOW[i + 1];
}

export async function advanceShipment(id: string, opts: { to?: string; location?: string; note?: string }) {
  const shipment = await prisma.shipment.findUnique({ where: { id }, include: { lane: true } });
  if (!shipment) throw new Error("Shipment not found");

  const to = (opts.to?.toUpperCase() as ShipmentStatus) ?? nextStatus(shipment.status);
  if (!to) throw new Error("Shipment already delivered");

  const location =
    opts.location ||
    (to === "DELIVERED" ? shipment.lane.destination : to === "CUSTOMS" ? "Border" : shipment.lane.origin);

  await prisma.$transaction([
    prisma.shipment.update({
      where: { id },
      data: {
        status: to,
        departedAt: to === "IN_TRANSIT" && !shipment.departedAt ? new Date() : shipment.departedAt,
        deliveredAt: to === "DELIVERED" ? new Date() : shipment.deliveredAt,
      },
    }),
    prisma.shipmentMilestone.create({
      data: { shipmentId: id, status: to, location, note: opts.note },
    }),
  ]);
}

export type CorridorSummary = {
  lanes: {
    id: string;
    name: string;
    origin: string;
    destination: string;
    traditionalCostUsd: number;
    outnifCostUsd: number;
    savingsPct: number;
    traditionalTransitDays: number;
    outnifTransitDays: number;
    transitSavingsPct: number;
  }[];
  avgCostSavingsPct: number;
  avgTransitSavingsPct: number;
  inTransit: number;
  atHub: number;
  delivered: number;
  exceptions: number;
  containerValueUsd: number;
};

export async function getCorridorSummary(): Promise<CorridorSummary> {
  const [lanes, shipments] = await Promise.all([
    prisma.tradeLane.findMany({ orderBy: { sequence: "asc" } }),
    prisma.shipment.findMany({ select: { status: true, valueUsd: true } }),
  ]);

  const laneRows = lanes.map((l) => ({
    id: l.id,
    name: l.name,
    origin: l.origin,
    destination: l.destination,
    traditionalCostUsd: l.traditionalCostUsd,
    outnifCostUsd: l.outnifCostUsd,
    savingsPct: Math.round(((l.traditionalCostUsd - l.outnifCostUsd) / l.traditionalCostUsd) * 1000) / 10,
    traditionalTransitDays: l.traditionalTransitDays,
    outnifTransitDays: l.outnifTransitDays,
    transitSavingsPct:
      Math.round(((l.traditionalTransitDays - l.outnifTransitDays) / l.traditionalTransitDays) * 1000) / 10,
  }));

  const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : 0);

  const active = ["IN_TRANSIT", "CUSTOMS", "CONSOLIDATING", "OUT_FOR_DELIVERY"];
  return {
    lanes: laneRows,
    avgCostSavingsPct: avg(laneRows.map((l) => l.savingsPct)),
    avgTransitSavingsPct: avg(laneRows.map((l) => l.transitSavingsPct)),
    inTransit: shipments.filter((s) => active.includes(s.status)).length,
    atHub: shipments.filter((s) => s.status === "AT_HUB").length,
    delivered: shipments.filter((s) => s.status === "DELIVERED").length,
    exceptions: shipments.filter((s) => s.status === "EXCEPTION").length,
    containerValueUsd: shipments.reduce((s, x) => s + x.valueUsd, 0),
  };
}
