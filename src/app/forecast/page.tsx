"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, StatusBadge, ChannelTypePill } from "@/components/ui";
import { Sparkline } from "@/components/Sparkline";

type Detail = {
  channelStockId: string;
  skuName: string;
  skuCode: string;
  brandName: string;
  channelName: string;
  channelType: string;
  greenChannel: boolean;
  onShelf: number;
  forecastVelocity: number;
  dailyVelocity: number;
  targetCoverDays: number;
  leadTimeDays: number;
  coverDays: number;
  accuracy: number;
  status: "OOS" | "CRITICAL" | "LOW" | "HEALTHY";
  next7: { date: string; units: number }[];
  history: { date: string; units: number }[];
  trendPerDay: number;
};

export default function ForecastPage() {
  const [rows, setRows] = useState<Detail[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskOnly, setRiskOnly] = useState(false);

  useEffect(() => {
    fetch("/api/forecast")
      .then((r) => r.json())
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (riskOnly ? rows.filter((r) => r.status !== "HEALTHY") : rows),
    [rows, riskOnly]
  );

  const avgAccuracy = useMemo(() => {
    const a = rows.filter((r) => r.accuracy > 0);
    return a.length ? Math.round((a.reduce((s, r) => s + r.accuracy, 0) / a.length) * 10) / 10 : 0;
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="Demand & Forecast"
        subtitle="Seasonality-weighted demand forecast per SKU × channel. The engine raises VMI replenishment ~lead-time ahead of the projected stockout."
        actions={
          <button onClick={() => setRiskOnly((v) => !v)} className={`btn ${riskOnly ? "btn-primary" : "btn-ghost"}`}>
            {riskOnly ? "Showing at-risk" : "Show at-risk only"}
          </button>
        }
      />

      <div className="mb-6 card inline-flex items-center gap-3">
        <span className="text-xs uppercase tracking-wide text-slate-400">Avg back-tested accuracy</span>
        <span className="text-2xl font-semibold text-ripplr-500">{avgAccuracy}%</span>
        <span className="text-xs text-slate-500">target ≥ 92%</span>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">Forecasting demand…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((r) => (
            <div key={r.channelStockId} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-100">{r.skuName}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    {r.brandName} · {r.channelName}
                    <ChannelTypePill type={r.channelType} />
                    {r.greenChannel && <span className="text-ripplr-500">● Green</span>}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <div className="mt-3">
                <Sparkline
                  history={r.history.map((h) => h.units)}
                  forecast={r.next7.map((h) => h.units)}
                />
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span className="text-ripplr-500">— 21d actual</span>
                  <span className="text-sky-400">- - 7d forecast</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <Stat label="On shelf" value={r.onShelf} />
                <Stat label="Fcst/day" value={r.forecastVelocity} accent />
                <Stat
                  label="Cover"
                  value={`${r.coverDays}d`}
                  tone={r.coverDays < r.targetCoverDays ? "warn" : "good"}
                />
                <Stat label="Accuracy" value={`${r.accuracy}%`} />
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Target {r.targetCoverDays}d · lead {r.leadTimeDays}d · trend{" "}
                <span className={r.trendPerDay >= 0 ? "text-ripplr-500" : "text-amber-300"}>
                  {r.trendPerDay >= 0 ? "▲" : "▼"} {Math.abs(r.trendPerDay)}/day
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  tone?: "good" | "warn";
}) {
  const color = tone === "warn" ? "text-amber-300" : tone === "good" ? "text-ripplr-500" : accent ? "text-sky-300" : "text-slate-100";
  return (
    <div className="rounded-lg bg-ink-900/50 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
