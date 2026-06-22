import { prisma } from "./prisma";

/**
 * Delivery App — last-mile trips from MFC to channel with live status and
 * on-time tracking against the trip SLA.
 */

export const DELIVERY_FLOW = ["PENDING", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

export function nextDeliveryStatus(current: string): string | null {
  const i = DELIVERY_FLOW.indexOf(current as (typeof DELIVERY_FLOW)[number]);
  if (i < 0 || i >= DELIVERY_FLOW.length - 1) return null;
  return DELIVERY_FLOW[i + 1];
}

export async function advanceDelivery(id: string, opts: { to?: string }) {
  const d = await prisma.delivery.findUnique({ where: { id } });
  if (!d) throw new Error("Delivery not found");

  let to = opts.to?.toUpperCase();
  if (to === "FAILED") {
    return prisma.delivery.update({ where: { id }, data: { status: "FAILED", onTime: false } });
  }
  if (!to) to = nextDeliveryStatus(d.status) ?? undefined;
  if (!to) throw new Error("Delivery already completed");

  const now = new Date();
  const data: Record<string, unknown> = { status: to };
  if (to === "DISPATCHED" && !d.dispatchedAt) data.dispatchedAt = now;
  if (to === "DELIVERED") {
    data.deliveredAt = now;
    data.onTime = d.etaAt ? now.getTime() <= d.etaAt.getTime() : true;
  }
  return prisma.delivery.update({ where: { id }, data });
}

export type DeliverySummary = {
  total: number;
  active: number;
  delivered: number;
  failed: number;
  onTimeRate: number; // % of completed delivered on time
  unitsInMotion: number;
  avgStops: number;
};

export async function getDeliverySummary(): Promise<DeliverySummary> {
  const all = await prisma.delivery.findMany();
  const active = all.filter((d) => d.status === "DISPATCHED" || d.status === "OUT_FOR_DELIVERY");
  const delivered = all.filter((d) => d.status === "DELIVERED");
  const failed = all.filter((d) => d.status === "FAILED");
  const onTimeDelivered = delivered.filter((d) => d.onTime).length;

  return {
    total: all.length,
    active: active.length,
    delivered: delivered.length,
    failed: failed.length,
    onTimeRate: delivered.length ? Math.round((onTimeDelivered / delivered.length) * 1000) / 10 : 0,
    unitsInMotion: active.reduce((s, d) => s + d.units, 0),
    avgStops: all.length ? Math.round((all.reduce((s, d) => s + d.stops, 0) / all.length) * 10) / 10 : 0,
  };
}
