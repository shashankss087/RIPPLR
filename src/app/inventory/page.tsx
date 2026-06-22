"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";

type Row = {
  id: string;
  skuCode: string;
  skuName: string;
  brandName: string;
  tempZone: string;
  mfcName: string;
  city: string;
  onHand: number;
  allocated: number;
  available: number;
  inTransit: number;
  safetyStock: number;
  belowSafety: boolean;
};

type Mfc = {
  id: string;
  name: string;
  city: string;
  region: string;
  zones: string[];
  capacityCbm: number;
  skuLines: number;
  unitsOnHand: number;
};

export default function InventoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [mfcs, setMfcs] = useState<Mfc[]>([]);
  const [city, setCity] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/mfcs").then((r) => r.json()),
    ])
      .then(([inv, m]) => {
        setRows(inv);
        setMfcs(m);
      })
      .finally(() => setLoading(false));
  }, []);

  const cities = useMemo(() => ["ALL", ...Array.from(new Set(rows.map((r) => r.city)))], [rows]);
  const filtered = useMemo(() => (city === "ALL" ? rows : rows.filter((r) => r.city === city)), [rows, city]);

  return (
    <div>
      <PageHeader
        title="MFC Inventory"
        subtitle="Source-of-truth stock across Ripplr Multi-Fulfillment Centers — what we can dispatch into channels right now."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {mfcs.map((m) => (
          <div key={m.id} className="card !p-4">
            <div className="text-sm font-semibold text-white">{m.city}</div>
            <div className="text-[11px] text-slate-500">{m.region}</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-ripplr-500">
              {m.unitsOnHand.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500">units · {m.skuLines} SKU lines</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {m.zones.map((z) => (
                <span key={z} className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] text-slate-300">
                  {z}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {cities.map((c) => (
          <button key={c} onClick={() => setCity(c)} className={`btn ${city === c ? "btn-primary" : "btn-ghost"}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading inventory…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Brand · SKU</th>
                  <th>Zone</th>
                  <th>MFC</th>
                  <th>On Hand</th>
                  <th>Allocated</th>
                  <th>Available</th>
                  <th>In Transit</th>
                  <th>Safety</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="font-medium text-slate-100">{r.skuName}</div>
                      <div className="text-xs text-slate-500">
                        {r.brandName} · {r.skuCode}
                      </div>
                    </td>
                    <td>
                      <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] text-slate-300">{r.tempZone}</span>
                    </td>
                    <td className="text-slate-300">{r.city}</td>
                    <td className="tabular-nums">{r.onHand}</td>
                    <td className="tabular-nums text-slate-400">{r.allocated}</td>
                    <td className={`tabular-nums font-semibold ${r.belowSafety ? "text-red-300" : "text-ripplr-500"}`}>
                      {r.available}
                    </td>
                    <td className="tabular-nums text-slate-400">{r.inTransit}</td>
                    <td className="tabular-nums text-slate-500">{r.safetyStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
