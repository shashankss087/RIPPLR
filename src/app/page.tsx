import { getCoverAnalysis, getSlaSummary } from "@/lib/orchestration";
import { Kpi, PageHeader, StatusBadge, ChannelTypePill } from "@/components/ui";
import { RunEngineButton } from "@/components/RunEngineButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [sla, cover] = await Promise.all([getSlaSummary(), getCoverAnalysis()]);
  const atRisk = cover.filter((c) => c.status !== "HEALTHY").slice(0, 12);

  return (
    <div>
      <PageHeader
        title="SLA Command Center"
        subtitle="Live orchestration health across every brand, MFC and channel. Targets per the Ripplr DaaS SLA charter."
        actions={<RunEngineButton />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Fill Rate"
          value={sla.fillRate}
          suffix="%"
          tone={sla.fillRate >= 97 ? "good" : "warn"}
          hint="Target ≥ 97%"
        />
        <Kpi
          label="Out-of-Stock Rate"
          value={sla.oosRate}
          suffix="%"
          tone={sla.oosRate <= 2 ? "good" : sla.oosRate <= 5 ? "warn" : "bad"}
          hint="Target ≤ 2%"
        />
        <Kpi label="Inventory Accuracy" value={sla.inventoryAccuracy} suffix="%" tone="good" hint="Target ≥ 99%" />
        <Kpi
          label="Forecast Accuracy"
          value={sla.forecastAccuracy}
          suffix="%"
          tone={sla.forecastAccuracy >= 92 ? "good" : "warn"}
          hint="Back-tested · target ≥ 92%"
        />
        <Kpi label="Active SKUs" value={sla.skuCount} hint="Across all brands" />
        <Kpi label="Channel Signals" value={sla.channelSignals} hint="SKU × channel demand points" />
        <Kpi
          label="At-Risk Signals"
          value={sla.atRisk}
          tone={sla.atRisk === 0 ? "good" : "warn"}
          hint={`${sla.oosCount} fully stocked out`}
        />
        <Kpi label="Open Replenishments" value={sla.openReplenishments} hint="Suggested → Dispatched" />
      </div>

      <div className="card mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">At-Risk Coverage</h2>
          <span className="text-xs text-slate-400">Lowest days-of-cover first</span>
        </div>
        {atRisk.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Everything is healthy — no channel is below target cover. 🎉
          </p>
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
                {atRisk.map((c) => (
                  <tr key={c.channelStockId}>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <div className="font-medium text-slate-100">{c.skuName}</div>
                      <div className="text-xs text-slate-500">
                        {c.brandName} · {c.skuCode}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200">{c.channelName}</span>
                        <ChannelTypePill type={c.channelType} />
                      </div>
                    </td>
                    <td className="tabular-nums">{c.onShelf}</td>
                    <td className="tabular-nums text-slate-400">{c.forecastVelocity}</td>
                    <td className="tabular-nums font-semibold">{c.coverDays}d</td>
                    <td className="tabular-nums text-slate-400">{c.targetCoverDays}d</td>
                    <td>{c.greenChannel ? <span className="text-ripplr-500">●</span> : <span className="text-slate-600">—</span>}</td>
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
