import React from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OOS: "bg-red-500/15 text-red-300 border-red-500/30",
    CRITICAL: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    LOW: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    HEALTHY: "bg-ripplr-500/15 text-ripplr-500 border-ripplr-500/30",
    SUGGESTED: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    APPROVED: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    DISPATCHED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    DELIVERED: "bg-ripplr-500/15 text-ripplr-500 border-ripplr-500/30",
    CANCELLED: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    ACTIVE: "bg-ripplr-500/15 text-ripplr-500 border-ripplr-500/30",
    ONBOARDING: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    PAUSED: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  const cls = map[status] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{status}</span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    CRITICAL: "text-red-300",
    HIGH: "text-orange-300",
    NORMAL: "text-slate-400",
  };
  return <span className={`text-xs font-semibold ${map[priority] ?? "text-slate-400"}`}>{priority}</span>;
}

export function Kpi({
  label,
  value,
  suffix,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneCls = {
    default: "text-white",
    good: "text-ripplr-500",
    warn: "text-amber-300",
    bad: "text-red-300",
  }[tone];
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${toneCls}`}>
        {value}
        {suffix && <span className="ml-1 text-lg text-slate-400">{suffix}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function ChannelTypePill({ type }: { type: string }) {
  const labels: Record<string, string> = {
    Q_COMMERCE: "Q-Commerce",
    MODERN_TRADE: "Modern Trade",
    GENERAL_TRADE: "General Trade",
    ECOM: "E-Commerce",
    EXPORT: "Export",
  };
  const map: Record<string, string> = {
    Q_COMMERCE: "bg-ripplr-600/20 text-ripplr-500",
    MODERN_TRADE: "bg-blue-600/20 text-blue-300",
    GENERAL_TRADE: "bg-amber-600/20 text-amber-300",
    ECOM: "bg-violet-600/20 text-violet-300",
    EXPORT: "bg-rose-600/20 text-rose-300",
  };
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${map[type] ?? "bg-slate-600/20"}`}>
      {labels[type] ?? type}
    </span>
  );
}
