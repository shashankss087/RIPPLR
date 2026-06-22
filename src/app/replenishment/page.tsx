"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, StatusBadge, PriorityBadge } from "@/components/ui";

type Order = {
  id: string;
  qty: number;
  reason: string;
  priority: string;
  status: string;
  tatHours: number;
  createdAt: string;
  sku: { code: string; name: string; brand: { name: string } };
  mfc: { name: string; city: string };
  channel: { name: string; type: string };
};

const NEXT: Record<string, { to: string; label: string }[]> = {
  SUGGESTED: [
    { to: "APPROVED", label: "Approve" },
    { to: "CANCELLED", label: "Cancel" },
  ],
  APPROVED: [{ to: "DISPATCHED", label: "Dispatch" }],
  DISPATCHED: [{ to: "DELIVERED", label: "Mark Delivered" }],
};

export default function ReplenishmentPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/replenishment")
      .then((r) => r.json())
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  async function advance(id: string, to: string) {
    setBusy(id);
    await fetch(`/api/replenishment/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: to }),
    });
    setBusy(null);
    load();
  }

  async function runEngine() {
    setBusy("engine");
    await fetch("/api/orchestrate", { method: "POST" });
    setBusy(null);
    load();
  }

  const open = orders.filter((o) => ["SUGGESTED", "APPROVED", "DISPATCHED"].includes(o.status));

  return (
    <div>
      <PageHeader
        title="Replenishment Orders"
        subtitle="PO automation. The engine raises suggestions when channel cover drops below target; approve to allocate and dispatch from the MFC."
        actions={
          <button onClick={runEngine} disabled={busy === "engine"} className="btn btn-primary">
            {busy === "engine" ? "Running…" : "↻ Run Engine"}
          </button>
        }
      />

      <div className="mb-4 text-sm text-slate-400">
        {open.length} open · {orders.length} total
      </div>

      <div className="card">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No replenishment orders yet. Run the engine to generate suggestions.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Brand · SKU</th>
                  <th>Route</th>
                  <th>Qty</th>
                  <th>TAT</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>
                      <PriorityBadge priority={o.priority} />
                    </td>
                    <td>
                      <div className="font-medium text-slate-100">{o.sku.name}</div>
                      <div className="text-xs text-slate-500">
                        {o.sku.brand.name} · {o.sku.code}
                      </div>
                    </td>
                    <td className="text-xs text-slate-300">
                      {o.mfc.city} <span className="text-slate-500">→</span> {o.channel.name}
                    </td>
                    <td className="tabular-nums font-semibold">{o.qty}</td>
                    <td className="tabular-nums text-slate-400">{o.tatHours}h</td>
                    <td className="max-w-xs text-xs text-slate-400">{o.reason}</td>
                    <td>
                      <div className="flex gap-1">
                        {(NEXT[o.status] ?? []).map((a) => (
                          <button
                            key={a.to}
                            onClick={() => advance(o.id, a.to)}
                            disabled={busy === o.id}
                            className={`btn ${a.to === "CANCELLED" ? "btn-ghost" : "btn-primary"} px-2 py-1 text-xs`}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </td>
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
