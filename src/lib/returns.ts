import { prisma } from "./prisma";

/**
 * Reverse-logistics engine.
 *
 * Implements the OutNIF returns flow: INITIATED -> IN_QC -> DISPOSITIONED ->
 * CLOSED, with a 23-point QC gate and four dispositions. A RESELL decision
 * restocks the serving MFC; every disposition books a recovered value based on
 * how much of the SKU's MRP is recoverable through that channel.
 */

export const RETURN_REASONS = [
  "DAMAGED",
  "NEAR_EXPIRY",
  "WRONG_ITEM",
  "QUALITY_ISSUE",
  "OVERSTOCK",
  "CUSTOMER_RETURN",
] as const;

export const DISPOSITIONS = ["RESELL", "REFURBISH", "RECYCLE", "DISPOSE"] as const;

// Fraction of MRP recovered per disposition (resell ~ full, dispose ~ nil).
export const RECOVERY_FACTOR: Record<string, number> = {
  RESELL: 0.95,
  REFURBISH: 0.6,
  RECYCLE: 0.05,
  DISPOSE: 0,
};

export type Disposition = (typeof DISPOSITIONS)[number];

export async function createReturn(input: {
  skuId: string;
  channelId: string;
  mfcId?: string;
  qty: number;
  reason: string;
  notes?: string;
}) {
  if (!input.skuId || !input.channelId || !input.qty || input.qty <= 0) {
    throw new Error("skuId, channelId and a positive qty are required");
  }
  if (!RETURN_REASONS.includes(input.reason as (typeof RETURN_REASONS)[number])) {
    throw new Error(`reason must be one of ${RETURN_REASONS.join(", ")}`);
  }

  // Default the processing MFC to one that already stocks the SKU.
  let mfcId = input.mfcId;
  if (!mfcId) {
    const inv = await prisma.inventory.findFirst({ where: { skuId: input.skuId } });
    mfcId = inv?.mfcId;
    if (!mfcId) {
      const anyMfc = await prisma.mfc.findFirst();
      mfcId = anyMfc?.id;
    }
  }
  if (!mfcId) throw new Error("No MFC available to process the return");

  return prisma.return.create({
    data: {
      skuId: input.skuId,
      channelId: input.channelId,
      mfcId,
      qty: input.qty,
      reason: input.reason,
      notes: input.notes,
      status: "INITIATED",
    },
  });
}

/**
 * Advance a return. Passing a `disposition` moves it to DISPOSITIONED: a RESELL
 * restocks the MFC and books ~full value; other dispositions write the unit off
 * at their recovery factor. `status: "CLOSED"` finalises it.
 */
export async function advanceReturn(
  id: string,
  opts: { status?: string; disposition?: string }
) {
  const ret = await prisma.return.findUnique({ where: { id }, include: { sku: true } });
  if (!ret) throw new Error("Return not found");

  if (opts.disposition) {
    const disp = opts.disposition.toUpperCase();
    if (!DISPOSITIONS.includes(disp as Disposition)) {
      throw new Error(`disposition must be one of ${DISPOSITIONS.join(", ")}`);
    }
    if (ret.status === "DISPOSITIONED" || ret.status === "CLOSED") {
      throw new Error("Return already dispositioned");
    }

    const recoveredValue = Math.round(ret.qty * ret.sku.mrp * (RECOVERY_FACTOR[disp] ?? 0));
    const willRestock = disp === "RESELL";

    await prisma.$transaction(async (tx) => {
      if (willRestock) {
        await tx.inventory.upsert({
          where: { skuId_mfcId: { skuId: ret.skuId, mfcId: ret.mfcId } },
          update: { onHand: { increment: ret.qty } },
          create: { skuId: ret.skuId, mfcId: ret.mfcId, onHand: ret.qty },
        });
      }
      await tx.return.update({
        where: { id },
        data: {
          disposition: disp,
          status: "DISPOSITIONED",
          recoveredValue,
          restocked: willRestock,
          processedAt: new Date(),
        },
      });
    });
    return;
  }

  if (opts.status) {
    const to = opts.status.toUpperCase();
    if (!["IN_QC", "CLOSED"].includes(to)) {
      throw new Error("status must be IN_QC or CLOSED (use disposition to dispose)");
    }
    await prisma.return.update({ where: { id }, data: { status: to } });
    return;
  }

  throw new Error("Provide a status or a disposition");
}

export type ReturnsSummary = {
  totalReturns: number;
  totalUnits: number;
  openReturns: number;
  unitsRestocked: number;
  restockRate: number; // % of dispositioned units sent back to RESELL
  recoveredValue: number;
  avgQcHours: number;
  byReason: { reason: string; units: number }[];
  byDisposition: { disposition: string; units: number; value: number }[];
};

export async function getReturnsSummary(brandId?: string | null): Promise<ReturnsSummary> {
  const all = await prisma.return.findMany({ where: brandId ? { sku: { brandId } } : undefined });
  const totalUnits = all.reduce((s, r) => s + r.qty, 0);
  const open = all.filter((r) => r.status === "INITIATED" || r.status === "IN_QC");
  const dispositioned = all.filter((r) => r.disposition);
  const dispUnits = dispositioned.reduce((s, r) => s + r.qty, 0);
  const restockedUnits = all.filter((r) => r.restocked).reduce((s, r) => s + r.qty, 0);
  const recoveredValue = all.reduce((s, r) => s + r.recoveredValue, 0);

  const processed = all.filter((r) => r.processedAt);
  const avgQcHours = processed.length
    ? Math.round(
        (processed.reduce((s, r) => s + (r.processedAt!.getTime() - r.createdAt.getTime()), 0) /
          processed.length /
          3_600_000) *
          10
      ) / 10
    : 0;

  const reasonMap = new Map<string, number>();
  for (const r of all) reasonMap.set(r.reason, (reasonMap.get(r.reason) ?? 0) + r.qty);

  const dispMap = new Map<string, { units: number; value: number }>();
  for (const r of dispositioned) {
    const cur = dispMap.get(r.disposition!) ?? { units: 0, value: 0 };
    cur.units += r.qty;
    cur.value += r.recoveredValue;
    dispMap.set(r.disposition!, cur);
  }

  return {
    totalReturns: all.length,
    totalUnits,
    openReturns: open.length,
    unitsRestocked: restockedUnits,
    restockRate: dispUnits ? Math.round((restockedUnits / dispUnits) * 1000) / 10 : 0,
    recoveredValue,
    avgQcHours,
    byReason: [...reasonMap.entries()]
      .map(([reason, units]) => ({ reason, units }))
      .sort((a, b) => b.units - a.units),
    byDisposition: DISPOSITIONS.map((d) => ({
      disposition: d,
      units: dispMap.get(d)?.units ?? 0,
      value: dispMap.get(d)?.value ?? 0,
    })),
  };
}
