import { prisma } from "./prisma";

/**
 * Collection App — accounts-receivable aging and payment allocation.
 * Outstanding is bucketed by how overdue the unpaid balance is, mirroring the
 * DaaS deck's "collection aging management".
 */

export function bucketFor(dueDate: Date, now = new Date()): string {
  const days = Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000);
  if (days < 0) return "CURRENT";
  if (days <= 30) return "D0_30";
  if (days <= 60) return "D31_60";
  if (days <= 90) return "D61_90";
  return "D90_PLUS";
}

export function statusFor(amount: number, paid: number, dueDate: Date, now = new Date()): string {
  if (paid >= amount) return "PAID";
  if (dueDate.getTime() < now.getTime()) return "OVERDUE";
  if (paid > 0) return "PARTIAL";
  return "OPEN";
}

export async function recordPayment(id: string, payAmount: number) {
  if (!(payAmount > 0)) throw new Error("Payment must be positive");
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) throw new Error("Invoice not found");

  const paidAmount = Math.min(inv.amount, inv.paidAmount + payAmount);
  const status = statusFor(inv.amount, paidAmount, inv.dueDate);
  return prisma.invoice.update({ where: { id }, data: { paidAmount, status } });
}

export type CollectionsSummary = {
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueOutstanding: number;
  collectionRate: number; // collected / billed %
  invoiceCount: number;
  overdueCount: number;
  aging: { bucket: string; label: string; amount: number; count: number }[];
};

const BUCKET_LABELS: Record<string, string> = {
  CURRENT: "Not yet due",
  D0_30: "0–30 days",
  D31_60: "31–60 days",
  D61_90: "61–90 days",
  D90_PLUS: "90+ days",
};

export async function getCollectionsSummary(): Promise<CollectionsSummary> {
  const invoices = await prisma.invoice.findMany();
  const now = new Date();

  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
  const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = invoices.map((i) => ({ ...i, balance: i.amount - i.paidAmount })).filter((i) => i.balance > 0.5);

  const agingMap = new Map<string, { amount: number; count: number }>();
  for (const key of Object.keys(BUCKET_LABELS)) agingMap.set(key, { amount: 0, count: 0 });
  let overdueOutstanding = 0;
  for (const inv of outstanding) {
    const bucket = bucketFor(inv.dueDate, now);
    const cur = agingMap.get(bucket)!;
    cur.amount += inv.balance;
    cur.count += 1;
    if (bucket !== "CURRENT") overdueOutstanding += inv.balance;
  }

  return {
    totalBilled: Math.round(totalBilled),
    totalCollected: Math.round(totalCollected),
    totalOutstanding: Math.round(totalBilled - totalCollected),
    overdueOutstanding: Math.round(overdueOutstanding),
    collectionRate: totalBilled ? Math.round((totalCollected / totalBilled) * 1000) / 10 : 0,
    invoiceCount: invoices.length,
    overdueCount: outstanding.filter((i) => bucketFor(i.dueDate, now) !== "CURRENT").length,
    aging: Object.keys(BUCKET_LABELS).map((key) => ({
      bucket: key,
      label: BUCKET_LABELS[key],
      amount: Math.round(agingMap.get(key)!.amount),
      count: agingMap.get(key)!.count,
    })),
  };
}
