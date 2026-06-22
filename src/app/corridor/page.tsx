"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Kpi, StatusBadge } from "@/components/ui";

type Lane = {
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
};
type Summary = {
  lanes: Lane[];
  avgCostSavingsPct: number;
  avgTransitSavingsPct: number;
  inTransit: number;
  atHub: number;
  delivered: number;
  exceptions: number;
  containerValueUsd: number;
};
type Milestone = { id: string; status: string; location: string; at: string };
type Shipment = {
  id: string;
  reference: string;
  containerNo: string;
  category: string;
  hsCode: string;
  tempControlled: boolean;
  valueUsd: number;
  status: string;
  etaAt: string | null;
  lane: { name: string; destination: string };
  brand: { name: string } | null;
  milestones: Milestone[];
};

const usd = (n: number) => "$" + n.toLocaleString("en-US");

export default function CorridorPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ laneId: "", category: "FMCG", valueUsd: "60000" });

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/corridor").then((r) => r.json()),
      fetch("/api/shipments").then((r) => r.json()),
    ]).then(([s, sh]) => {
      setSummary(s);
      setShipments(sh);
    });
  }, []);

  useEffect(() => load(), [load]);

  async function advance(id: string) {
    setBusy(id);
    await fetch(`/api/shipments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
    setBusy(null);
    load();
  }

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!form.laneId) return;
    setBusy("new");
    await fetch("/api/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, valueUsd: Number(form.valueUsd) }),
    });
    setBusy(null);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Cross-Border Corridor"
        subtitle="OutNIF India → UAE → KSA → EU/US corridor. Duty-optimized lanes with a Shipsy-style control tower tracking every container through customs and hubs."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Avg Cost Saving" value={summary?.avgCostSavingsPct ?? "—"} suffix="%" tone="good" hint="vs traditional freight" />
        <Kpi label="Avg Transit Saving" value={summary?.avgTransitSavingsPct ?? "—"} suffix="%" tone="good" hint="Faster door-to-door" />
        <Kpi label="In Transit" value={summary?.inTransit ?? "—"} hint="Active containers" />
        <Kpi label="Delivered" value={summary?.delivered ?? "—"} tone="good" />
        <Kpi label="Container Value" value={summary ? usd(summary.containerValueUsd) : "—"} hint="In the corridor" />
      </div>

      <div className="card mt-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Lane Economics</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Lane</th>
                <th>Traditional</th>
                <th>OutNIF</th>
                <th>Cost Saving</th>
                <th>Traditional Transit</th>
                <th>OutNIF Transit</th>
                <th>Faster</th>
              </tr>
            </thead>
            <tbody>
              {summary?.lanes.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div className="font-medium text-slate-100">{l.name}</div>
                    <div className="text-xs text-slate-500">
                      {l.origin} → {l.destination}
                    </div>
                  </td>
                  <td className="tabular-nums text-slate-400">{usd(l.traditionalCostUsd)}</td>
                  <td className="tabular-nums font-semibold text-slate-100">{usd(l.outnifCostUsd)}</td>
                  <td className="tabular-nums font-semibold text-ripplr-500">{l.savingsPct}%</td>
                  <td className="tabular-nums text-slate-400">{l.traditionalTransitDays}d</td>
                  <td className="tabular-nums font-semibold text-slate-100">{l.outnifTransitDays}d</td>
                  <td className="tabular-nums font-semibold text-ripplr-500">{l.transitSavingsPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={book} className="card mt-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[200px]">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Lane</span>
            <select value={form.laneId} onChange={(e) => setForm({ ...form, laneId: e.target.value })} className="cor-input">
              <option value="">Select lane…</option>
              {summary?.lanes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[160px]">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Category</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="cor-input">
              {["FMCG", "PHARMA", "CONSUMER_DURABLES", "COLD_CHAIN"].map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="w-36">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Value (USD)</span>
            <input type="number" value={form.valueUsd} onChange={(e) => setForm({ ...form, valueUsd: e.target.value })} className="cor-input" />
          </label>
          <button disabled={busy === "new"} className="btn btn-primary">
            {busy === "new" ? "Booking…" : "Book container"}
          </button>
        </div>
      </form>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-white">Control Tower</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {shipments.map((s) => {
          const last = s.milestones[s.milestones.length - 1];
          return (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-sm text-slate-100">{s.reference}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {s.lane.name} · {s.category.replace("_", " ")} · {s.containerNo}
                    {s.tempControlled && <span className="ml-1 text-sky-400">❄ temp</span>}
                  </div>
                  {s.brand && <div className="text-xs text-slate-500">Brand: {s.brand.name}</div>}
                </div>
                <StatusBadge status={s.status === "DELIVERED" ? "DELIVERED" : s.status === "EXCEPTION" ? "OOS" : "DISPATCHED"} />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>HS {s.hsCode} · {usd(s.valueUsd)}</span>
                <span>{s.status.replace("_", " ")}{last ? ` @ ${last.location}` : ""}</span>
              </div>

              {/* milestone progress */}
              <div className="mt-3 flex items-center gap-1">
                {["BOOKED", "CONSOLIDATING", "IN_TRANSIT", "CUSTOMS", "AT_HUB", "OUT_FOR_DELIVERY", "DELIVERED"].map((st) => {
                  const done = s.milestones.some((m) => m.status === st);
                  return <div key={st} className={`h-1.5 flex-1 rounded-full ${done ? "bg-ripplr-500" : "bg-ink-700"}`} title={st} />;
                })}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  ETA {s.etaAt ? new Date(s.etaAt).toLocaleDateString() : "—"}
                </span>
                {s.status !== "DELIVERED" && (
                  <button onClick={() => advance(s.id)} disabled={busy === s.id} className="btn btn-ghost px-2 py-1 text-xs">
                    Advance →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        :global(.cor-input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(42 54 84 / 0.8);
          background: rgb(11 18 32 / 0.6);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(226 232 240);
          outline: none;
        }
        :global(.cor-input:focus) {
          border-color: rgb(5 150 105);
        }
      `}</style>
    </div>
  );
}
