"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, StatusBadge, Kpi } from "@/components/ui";

type Summary = {
  totalReturns: number;
  totalUnits: number;
  openReturns: number;
  unitsRestocked: number;
  restockRate: number;
  recoveredValue: number;
  avgQcHours: number;
  byReason: { reason: string; units: number }[];
  byDisposition: { disposition: string; units: number; value: number }[];
};

type ReturnRow = {
  id: string;
  qty: number;
  reason: string;
  status: string;
  disposition: string | null;
  recoveredValue: number;
  restocked: boolean;
  inspectionPoints: number;
  sku: { code: string; name: string; brand: { name: string } };
  channel: { name: string };
  mfc: { city: string };
};

type Sku = { id: string; name: string; brandName: string; code: string };
type Channel = { id: string; name: string };

const REASONS = ["DAMAGED", "NEAR_EXPIRY", "WRONG_ITEM", "QUALITY_ISSUE", "OVERSTOCK", "CUSTOMER_RETURN"];
const DISPOSITIONS = ["RESELL", "REFURBISH", "RECYCLE", "DISPOSE"];

const DISP_COLOR: Record<string, string> = {
  RESELL: "bg-ripplr-500",
  REFURBISH: "bg-sky-500",
  RECYCLE: "bg-amber-500",
  DISPOSE: "bg-red-500",
};

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function ReturnsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ skuId: "", channelId: "", qty: "20", reason: "DAMAGED" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/returns/summary").then((r) => r.json()),
      fetch("/api/returns").then((r) => r.json()),
    ]).then(([s, r]) => {
      setSummary(s);
      setRows(r);
    });
  }, []);

  useEffect(() => {
    load();
    fetch("/api/skus").then((r) => r.json()).then(setSkus);
    fetch("/api/channels").then((r) => r.json()).then(setChannels);
  }, [load]);

  async function advance(id: string, payload: { status?: string; disposition?: string }) {
    setBusy(id);
    await fetch(`/api/returns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(null);
    load();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.skuId || !form.channelId) {
      setError("Pick a SKU and a channel");
      return;
    }
    setBusy("new");
    const res = await fetch("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, qty: Number(form.qty) }),
    });
    setBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not log return");
      return;
    }
    setForm({ skuId: "", channelId: "", qty: "20", reason: "DAMAGED" });
    load();
  }

  const maxReason = Math.max(1, ...(summary?.byReason.map((r) => r.units) ?? [1]));
  const dispTotal = Math.max(1, summary?.byDisposition.reduce((s, d) => s + d.units, 0) ?? 1);

  return (
    <div>
      <PageHeader
        title="Reverse Logistics"
        subtitle="Returns flow back from channels into MFC returns zones: 23-point QC, then a disposition decision. Resell restocks inventory; every disposition books recovered value."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Units Returned" value={summary?.totalUnits ?? "—"} hint={`${summary?.totalReturns ?? 0} returns`} />
        <Kpi
          label="Restock Rate"
          value={summary?.restockRate ?? "—"}
          suffix="%"
          tone="good"
          hint={`${summary?.unitsRestocked ?? 0} units back to stock`}
        />
        <Kpi label="Value Recovered" value={summary ? inr(summary.recoveredValue) : "—"} hint="Across dispositions" />
        <Kpi label="Avg QC TAT" value={summary?.avgQcHours ?? "—"} suffix="h" hint="Receipt → disposition" />
        <Kpi
          label="Open Returns"
          value={summary?.openReturns ?? "—"}
          tone={(summary?.openReturns ?? 0) > 0 ? "warn" : "good"}
          hint="Awaiting QC / decision"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-white">Disposition Mix</h2>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink-900">
            {summary?.byDisposition.map((d) => (
              <div
                key={d.disposition}
                className={DISP_COLOR[d.disposition]}
                style={{ width: `${(d.units / dispTotal) * 100}%` }}
                title={`${d.disposition}: ${d.units}`}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {summary?.byDisposition.map((d) => (
              <div key={d.disposition} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${DISP_COLOR[d.disposition]}`} />
                  <span className="text-slate-200">{d.disposition}</span>
                </span>
                <span className="tabular-nums text-slate-400">
                  {d.units} units · <span className="text-ripplr-500">{inr(d.value)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Return Reasons <span className="text-xs font-normal text-slate-500">— quality loop shared with brands</span>
          </h2>
          <div className="space-y-2.5">
            {summary?.byReason.map((r) => (
              <div key={r.reason}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-300">{r.reason.replace("_", " ")}</span>
                  <span className="tabular-nums text-slate-500">{r.units}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-ink-900">
                  <div className="h-2 rounded-full bg-ripplr-600" style={{ width: `${(r.units / maxReason) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="card mt-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[200px]">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">SKU</span>
            <select value={form.skuId} onChange={(e) => setForm({ ...form, skuId: e.target.value })} className="ret-input">
              <option value="">Select SKU…</option>
              {skus.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.brandName} · {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 min-w-[160px]">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">From channel</span>
            <select value={form.channelId} onChange={(e) => setForm({ ...form, channelId: e.target.value })} className="ret-input">
              <option value="">Select channel…</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="w-24">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Qty</span>
            <input
              type="number"
              min={1}
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value })}
              className="ret-input"
            />
          </label>
          <label className="min-w-[150px]">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Reason</span>
            <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="ret-input">
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <button disabled={busy === "new"} className="btn btn-primary">
            {busy === "new" ? "Logging…" : "Log return"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </form>

      <div className="card mt-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Returns Queue</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Status</th>
                <th>Brand · SKU</th>
                <th>From</th>
                <th>Qty</th>
                <th>Reason</th>
                <th>Disposition</th>
                <th>Recovered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    <div className="font-medium text-slate-100">{r.sku.name}</div>
                    <div className="text-xs text-slate-500">
                      {r.sku.brand.name} · {r.sku.code}
                    </div>
                  </td>
                  <td className="text-xs text-slate-300">{r.channel.name}</td>
                  <td className="tabular-nums">{r.qty}</td>
                  <td className="text-xs text-slate-400">{r.reason.replace("_", " ")}</td>
                  <td>
                    {r.disposition ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className={`h-2 w-2 rounded-full ${DISP_COLOR[r.disposition]}`} />
                        {r.disposition}
                        {r.restocked && <span className="text-ripplr-500">↺</span>}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="tabular-nums text-slate-300">{r.recoveredValue ? inr(r.recoveredValue) : "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {r.status === "INITIATED" && (
                        <button onClick={() => advance(r.id, { status: "IN_QC" })} disabled={busy === r.id} className="btn btn-primary px-2 py-1 text-xs">
                          Start QC
                        </button>
                      )}
                      {r.status === "IN_QC" &&
                        DISPOSITIONS.map((d) => (
                          <button
                            key={d}
                            onClick={() => advance(r.id, { disposition: d })}
                            disabled={busy === r.id}
                            className="btn btn-ghost px-2 py-1 text-xs"
                          >
                            {d[0] + d.slice(1).toLowerCase()}
                          </button>
                        ))}
                      {r.status === "DISPOSITIONED" && (
                        <button onClick={() => advance(r.id, { status: "CLOSED" })} disabled={busy === r.id} className="btn btn-ghost px-2 py-1 text-xs">
                          Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-slate-400">
                    No returns logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        :global(.ret-input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(42 54 84 / 0.8);
          background: rgb(11 18 32 / 0.6);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(226 232 240);
          outline: none;
        }
        :global(.ret-input:focus) {
          border-color: rgb(5 150 105);
        }
      `}</style>
    </div>
  );
}
