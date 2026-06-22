"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, StatusBadge, ChannelTypePill } from "@/components/ui";

type CoverRow = {
  channelStockId: string;
  skuName: string;
  skuCode: string;
  brandName: string;
  channelName: string;
  channelType: string;
  greenChannel: boolean;
  onShelf: number;
  dailyVelocity: number;
  forecastVelocity: number;
  accuracy: number;
  targetCoverDays: number;
  coverDays: number;
  status: "OOS" | "CRITICAL" | "LOW" | "HEALTHY";
};

const FILTERS = ["ALL", "Q_COMMERCE", "ECOM", "MODERN_TRADE", "GENERAL_TRADE", "GREEN"];

export default function ChannelsPage() {
  const [rows, setRows] = useState<CoverRow[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cover")
      .then((r) => r.json())
      .then((d) => setRows(d))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "ALL") return rows;
    if (filter === "GREEN") return rows.filter((r) => r.greenChannel);
    return rows.filter((r) => r.channelType === filter);
  }, [rows, filter]);

  return (
    <div>
      <PageHeader
        title="Channel Orchestration"
        subtitle="Days-of-cover for every SKU at every downstream channel. Green-Channel SKUs feed q-commerce directly from Ripplr MFCs, bypassing appointment bottlenecks."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn ${filter === f ? "btn-primary" : "btn-ghost"}`}
          >
            {f === "GREEN" ? "🟢 Green Channel" : f === "ALL" ? "All" : f.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading channel signals…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Brand · SKU</th>
                  <th>Channel</th>
                  <th>On Shelf</th>
                  <th>Forecast/day</th>
                  <th>Cover</th>
                  <th>Target</th>
                  <th>Green</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.channelStockId}>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <div className="font-medium text-slate-100">{r.skuName}</div>
                      <div className="text-xs text-slate-500">
                        {r.brandName} · {r.skuCode}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200">{r.channelName}</span>
                        <ChannelTypePill type={r.channelType} />
                      </div>
                    </td>
                    <td className="tabular-nums">{r.onShelf}</td>
                    <td className="tabular-nums text-slate-400">
                      {r.forecastVelocity}/d
                      {r.accuracy > 0 && <span className="ml-1 text-[10px] text-slate-600">±{(100 - r.accuracy).toFixed(0)}%</span>}
                    </td>
                    <td className="tabular-nums font-semibold">{r.coverDays}d</td>
                    <td className="tabular-nums text-slate-400">{r.targetCoverDays}d</td>
                    <td>
                      {r.greenChannel ? (
                        <span className="text-ripplr-500">● 12h</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-slate-400">
                      No signals for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
