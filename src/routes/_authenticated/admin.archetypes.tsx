import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListArchetypes, adminToggleArchetypePublished } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/archetypes")({
  component: AdminArchetypes,
});

type Row = Awaited<ReturnType<typeof adminListArchetypes>>[number];

function AdminArchetypes() {
  const list = useServerFn(adminListArchetypes);
  const toggle = useServerFn(adminToggleArchetypePublished);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { list().then(setRows); }, []);

  const onToggle = async (slug: string, next: boolean) => {
    setBusy(slug);
    setRows((prev) => prev?.map((r) => r.slug === slug ? { ...r, published: next } : r) ?? null);
    try {
      await toggle({ data: { slug, published: next } });
    } catch {
      setRows((prev) => prev?.map((r) => r.slug === slug ? { ...r, published: !next } : r) ?? null);
    } finally {
      setBusy(null);
    }
  };

  if (!rows) return <p className="text-ink-muted">Loading cards…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold">Archetype cards ({rows.length})</h2>
          <p className="text-sm text-ink-muted">Toggle publish to control which cards appear on the public atlas.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <div key={r.slug} className="card-paper p-5 flex flex-col">
            <div className="flex items-start justify-between">
              <span className="text-4xl" aria-hidden>{r.icon}</span>
              <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest cursor-pointer">
                <input
                  type="checkbox"
                  checked={r.published}
                  disabled={busy === r.slug}
                  onChange={(e) => onToggle(r.slug, e.target.checked)}
                />
                {r.published ? "Published" : "Draft"}
              </label>
            </div>
            <h3 className="mt-3 font-serif text-xl font-bold">{r.name}</h3>
            <p className="text-sm italic text-ink-muted">{r.tagline}</p>
            <p className="mt-2 text-sm text-ink-soft line-clamp-3">{r.headline}</p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-ink-muted">{r.slug}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
