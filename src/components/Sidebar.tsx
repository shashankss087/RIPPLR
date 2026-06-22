"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "SLA Command Center", icon: "▣" },
  { href: "/forecast", label: "Demand & Forecast", icon: "∿" },
  { href: "/channels", label: "Channel Orchestration", icon: "⇄" },
  { href: "/replenishment", label: "Replenishment", icon: "↻" },
  { href: "/returns", label: "Reverse Logistics", icon: "↩" },
  { href: "/corridor", label: "Cross-Border Corridor", icon: "✈" },
  { href: "/inventory", label: "MFC Inventory", icon: "▦" },
  { href: "/brands", label: "Brands & Onboarding", icon: "★" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink-600/60 bg-ink-800/60 px-4 py-6 md:flex">
      <div className="px-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-ripplr-600 font-bold text-white">R</span>
          <div>
            <div className="text-lg font-semibold leading-tight text-white">RIPPLR</div>
            <div className="text-[11px] uppercase tracking-widest text-ripplr-500">Orchestrator</div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          Distribution-as-a-Service control tower for D2C & FMCG brands.
        </p>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {nav.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-ripplr-600 text-white" : "text-slate-300 hover:bg-ink-700"
              }`}
            >
              <span className="w-4 text-center opacity-80">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-lg border border-ink-600/60 bg-ink-900/60 p-3 text-[11px] text-slate-400">
        Green-Channel TAT <span className="font-semibold text-ripplr-500">12h</span> · Standard SLA{" "}
        <span className="font-semibold text-slate-200">48h</span>
      </div>
    </aside>
  );
}
