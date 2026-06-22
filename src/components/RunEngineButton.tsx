"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunEngineButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/orchestrate", { method: "POST" });
      const data = await res.json();
      setMsg(
        `Scanned ${data.scanned} signals · raised ${data.raised} replenishment orders` +
          (data.skippedNoStock ? ` · ${data.skippedNoStock} blocked (no MFC stock)` : "")
      );
      router.refresh();
    } catch {
      setMsg("Failed to run engine");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={run} disabled={loading} className="btn btn-primary">
        {loading ? "Running…" : "↻ Run Orchestration Engine"}
      </button>
      {msg && <span className="text-xs text-slate-400">{msg}</span>}
    </div>
  );
}
