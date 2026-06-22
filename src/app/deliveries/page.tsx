"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Kpi, StatusBadge } from "@/components/ui";

type Summary = {
  total: number;
  active: number;
  delivered: number;
  failed: number;
  onTimeRate: number;
  unitsInMotion: number;
  avgStops: number;
};
type Delivery = {
  id: string;
  reference: string;
  status: string;
  driverName: string;
  vehicleNo: string;
  stops: number;
  units: number;
  slaHours: number;
  etaAt: string | null;
  onTime: boolean | null;
  mfc: { city: string };
  channel: { name: string };
};

const FLOW = ["PENDING", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED"];

export default function DeliveriesPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/deliveries/summary").then((r) => r.json()),
      fetch("/api/deliveries").then((r) => r.json()),
    ]).then(([s, d]) => {
      setSummary(s);
      setRows(d);
    });
  }, []);

  useEffect(() => load(), [load]);

  async function advance(id: string, status?: string) {
    setBusy(id);
    await fetch(`/api/deliveries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(status ? { status } : {}),
    });
    setBusy(null);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Deliveries (Last-Mile)"
        subtitle="Real-time last-mile trips from MFC to channel — the Delivery App. Advance trips through dispatch to delivered and track on-time performance against SLA."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Active Trips" value={summary?.active ?? "—"} hint={`${summary?.total ?? 0} total`} />
        <Kpi label="Delivered" value={summary?.delivered ?? "—"} tone="good" />
        <Kpi label="On-Time Rate" value={summary?.onTimeRate ?? "—"} suffix="%" tone={(summary?.onTimeRate ?? 0) >= 95 ? "good" : "warn"} />
        <Kpi label="Units in Motion" value={summary?.unitsInMotion ?? "—"} hint={`avg ${summary?.avgStops ?? 0} stops`} />
        <Kpi label="Failed" value={summary?.failed ?? "—"} tone={(summary?.failed ?? 0) > 0 ? "bad" : "good"} />
      </div>

      <div className="card mt-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Trip Board</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Trip</th>
                <th>Route</th>
                <th>Driver / Vehicle</th>
                <th>Units</th>
                <th>Stops</th>
                <th>ETA (SLA)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td className="font-mono text-xs text-slate-200">{d.reference}</td>
                  <td className="text-xs text-slate-300">
                    {d.mfc.city} <span className="text-slate-500">→</span> {d.channel.name}
                  </td>
                  <td className="text-xs">
                    <div className="text-slate-200">{d.driverName}</div>
                    <div className="text-slate-500">{d.vehicleNo}</div>
                  </td>
                  <td className="tabular-nums">{d.units}</td>
                  <td className="tabular-nums text-slate-400">{d.stops}</td>
                  <td className="text-xs text-slate-400">
                    {d.etaAt ? new Date(d.etaAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    <span className="ml-1 text-slate-600">/ {d.slaHours}h</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={d.status === "DELIVERED" ? "DELIVERED" : d.status === "FAILED" ? "OOS" : "DISPATCHED"} />
                      {d.status === "DELIVERED" && (
                        <span className={d.onTime ? "text-ripplr-500 text-xs" : "text-amber-300 text-xs"}>
                          {d.onTime ? "on-time" : "late"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {FLOW.includes(d.status) && d.status !== "DELIVERED" ? (
                      <div className="flex gap-1">
                        <button onClick={() => advance(d.id)} disabled={busy === d.id} className="btn btn-primary px-2 py-1 text-xs">
                          Advance →
                        </button>
                        <button onClick={() => advance(d.id, "FAILED")} disabled={busy === d.id} className="btn btn-ghost px-2 py-1 text-xs">
                          Fail
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
