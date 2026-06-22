"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Kpi, StatusBadge } from "@/components/ui";

type Summary = {
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueOutstanding: number;
  collectionRate: number;
  invoiceCount: number;
  overdueCount: number;
  aging: { bucket: string; label: string; amount: number; count: number }[];
};
type Invoice = {
  id: string;
  number: string;
  amount: number;
  paidAmount: number;
  status: string;
  dueDate: string;
  channel: { name: string };
  brand: { name: string } | null;
};

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const BUCKET_COLOR: Record<string, string> = {
  CURRENT: "bg-ripplr-500",
  D0_30: "bg-sky-500",
  D31_60: "bg-amber-500",
  D61_90: "bg-orange-500",
  D90_PLUS: "bg-red-500",
};

export default function CollectionsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/invoices/summary").then((r) => r.json()),
      fetch("/api/invoices").then((r) => r.json()),
    ]).then(([s, i]) => {
      setSummary(s);
      setInvoices(i);
    });
  }, []);

  useEffect(() => load(), [load]);

  async function settle(inv: Invoice, full: boolean) {
    const balance = inv.amount - inv.paidAmount;
    const pay = full ? balance : Math.round(balance / 2);
    if (pay <= 0) return;
    setBusy(inv.id);
    await fetch(`/api/invoices/${inv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pay }),
    });
    setBusy(null);
    load();
  }

  const maxAging = Math.max(1, ...(summary?.aging.map((a) => a.amount) ?? [1]));

  return (
    <div>
      <PageHeader
        title="Collections (AR)"
        subtitle="Outstanding allocation and collection aging across channels — the Collection App. Record payments to settle invoices and clear overdue balances."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Total Billed" value={summary ? inr(summary.totalBilled) : "—"} hint={`${summary?.invoiceCount ?? 0} invoices`} />
        <Kpi label="Collected" value={summary ? inr(summary.totalCollected) : "—"} tone="good" />
        <Kpi label="Outstanding" value={summary ? inr(summary.totalOutstanding) : "—"} tone="warn" />
        <Kpi
          label="Overdue"
          value={summary ? inr(summary.overdueOutstanding) : "—"}
          tone={(summary?.overdueOutstanding ?? 0) > 0 ? "bad" : "good"}
          hint={`${summary?.overdueCount ?? 0} invoices`}
        />
        <Kpi label="Collection Rate" value={summary?.collectionRate ?? "—"} suffix="%" tone="good" />
      </div>

      <div className="card mt-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Aging Buckets</h2>
        <div className="space-y-3">
          {summary?.aging.map((a) => (
            <div key={a.bucket} className="flex items-center gap-3">
              <span className="w-28 text-xs text-slate-400">{a.label}</span>
              <div className="h-5 flex-1 rounded bg-ink-900">
                <div
                  className={`flex h-5 items-center rounded px-2 text-[10px] font-semibold text-ink-900 ${BUCKET_COLOR[a.bucket]}`}
                  style={{ width: `${Math.max(4, (a.amount / maxAging) * 100)}%` }}
                >
                  {a.amount > 0 ? inr(a.amount) : ""}
                </div>
              </div>
              <span className="w-10 text-right text-xs text-slate-500">{a.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Invoices</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Channel · Brand</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Due</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const balance = inv.amount - inv.paidAmount;
                return (
                  <tr key={inv.id}>
                    <td className="font-mono text-xs text-slate-200">{inv.number}</td>
                    <td>
                      <div className="text-slate-100">{inv.channel.name}</div>
                      {inv.brand && <div className="text-xs text-slate-500">{inv.brand.name}</div>}
                    </td>
                    <td className="tabular-nums text-slate-300">{inr(inv.amount)}</td>
                    <td className="tabular-nums text-slate-400">{inr(inv.paidAmount)}</td>
                    <td className={`tabular-nums font-semibold ${balance > 0 ? "text-amber-300" : "text-ripplr-500"}`}>
                      {inr(balance)}
                    </td>
                    <td className="text-xs text-slate-400">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td>
                      {balance > 0.5 && (
                        <div className="flex gap-1">
                          <button onClick={() => settle(inv, false)} disabled={busy === inv.id} className="btn btn-ghost px-2 py-1 text-xs">
                            Part-pay
                          </button>
                          <button onClick={() => settle(inv, true)} disabled={busy === inv.id} className="btn btn-primary px-2 py-1 text-xs">
                            Settle
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
