/**
 * Dependency-free inline SVG sparkline. Renders historical units (solid) and an
 * optional forecast tail (dashed) on a shared scale.
 */
export function Sparkline({
  history,
  forecast = [],
  width = 220,
  height = 44,
}: {
  history: number[];
  forecast?: number[];
  width?: number;
  height?: number;
}) {
  const all = [...history, ...forecast];
  if (all.length === 0) return <div className="text-xs text-slate-600">no data</div>;

  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const span = max - min || 1;
  const pad = 3;
  const n = all.length;
  const x = (i: number) => pad + (i * (width - pad * 2)) / Math.max(1, n - 1);
  const y = (v: number) => pad + (height - pad * 2) * (1 - (v - min) / span);

  const toPath = (vals: number[], offset: number) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i + offset).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");

  const histPath = toPath(history, 0);
  // forecast path starts at the last history point for continuity
  const fcVals = forecast.length ? [history[history.length - 1] ?? forecast[0], ...forecast] : [];
  const fcPath = fcVals.length ? toPath(fcVals, history.length - 1) : "";

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={histPath} fill="none" stroke="#10b981" strokeWidth={1.5} />
      {fcPath && <path d={fcPath} fill="none" stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="3 3" />}
    </svg>
  );
}
