"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserMenu({ name, role, brandName }: { name: string; role: string; brandName: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const label = role === "RIPPLR_ADMIN" ? "RIPPLR Admin" : brandName ? `${brandName} (Brand)` : "Brand";

  return (
    <div className="rounded-lg border border-ink-600/60 bg-ink-900/60 p-3">
      <div className="text-sm font-medium text-slate-100">{name}</div>
      <div className="mt-0.5 text-[11px] text-ripplr-500">{label}</div>
      <button onClick={logout} disabled={busy} className="btn btn-ghost mt-2 w-full px-2 py-1.5 text-xs">
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
