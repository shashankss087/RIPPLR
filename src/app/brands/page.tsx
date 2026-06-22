"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, StatusBadge } from "@/components/ui";

type Brand = {
  id: string;
  name: string;
  type: string;
  category: string;
  status: string;
  contactName?: string | null;
  contactEmail?: string | null;
  onboardedAt: string;
  _count: { skus: number };
};

const TYPES = ["D2C", "NATIONAL", "REGIONAL", "PRIVATE_LABEL"];

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", type: "D2C", category: "", contactName: "", contactEmail: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/brands")
      .then((r) => r.json())
      .then(setBrands)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not onboard brand");
      return;
    }
    setForm({ name: "", type: "D2C", category: "", contactName: "", contactEmail: "" });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Brands & Onboarding"
        subtitle="Brands onboard onto DaaS in under a day. Add a brand, then load its SKUs into the MFC network."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={submit} className="card lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold text-white">Onboard a brand</h2>
          <div className="space-y-3">
            <Field label="Brand name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="e.g. Yoga Bar"
              />
            </Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <input
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input"
                placeholder="e.g. Healthy Snacks"
              />
            </Field>
            <Field label="Contact name">
              <input
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                className="input"
                placeholder="Optional"
              />
            </Field>
            <Field label="Contact email">
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="input"
                placeholder="Optional"
              />
            </Field>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button disabled={submitting} className="btn btn-primary w-full">
              {submitting ? "Onboarding…" : "Onboard brand"}
            </button>
          </div>
        </form>

        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-white">Brand portfolio</h2>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading brands…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data">
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>SKUs</th>
                    <th>Status</th>
                    <th>Onboarded</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className="font-medium text-slate-100">{b.name}</div>
                        {b.contactEmail && <div className="text-xs text-slate-500">{b.contactEmail}</div>}
                      </td>
                      <td className="text-slate-300">{b.type}</td>
                      <td className="text-slate-300">{b.category}</td>
                      <td className="tabular-nums">{b._count.skus}</td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="text-xs text-slate-400">
                        {new Date(b.onboardedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(42 54 84 / 0.8);
          background: rgb(11 18 32 / 0.6);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(226 232 240);
          outline: none;
        }
        :global(.input:focus) {
          border-color: rgb(5 150 105);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}
