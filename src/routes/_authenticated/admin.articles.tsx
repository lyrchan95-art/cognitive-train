import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListArticles,
  adminToggleArticlePublished,
  adminUpdateArticle,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/articles")({
  component: AdminArticles,
});

type Row = Awaited<ReturnType<typeof adminListArticles>>[number];

function AdminArticles() {
  const list = useServerFn(adminListArticles);
  const toggle = useServerFn(adminToggleArticlePublished);
  const update = useServerFn(adminUpdateArticle);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { list().then(setRows); }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      r.slug.toLowerCase().includes(q) ||
      r.archetype_slugs.some((s) => s.includes(q)),
    );
  }, [rows, filter]);

  const onToggle = async (id: string, next: boolean) => {
    setBusy(id);
    setRows((p) => p?.map((r) => r.id === id ? { ...r, published: next } : r) ?? null);
    try { await toggle({ data: { id, published: next } }); }
    catch { setRows((p) => p?.map((r) => r.id === id ? { ...r, published: !next } : r) ?? null); }
    finally { setBusy(null); }
  };

  const onSave = async (draft: Row) => {
    setBusy(draft.id);
    try {
      await update({
        data: {
          id: draft.id,
          title: draft.title,
          excerpt: draft.excerpt,
          category: draft.category,
          read_minutes: draft.read_minutes,
        },
      });
      setRows((p) => p?.map((r) => r.id === draft.id ? draft : r) ?? null);
      setEditing(null);
    } finally { setBusy(null); }
  };

  if (!rows) return <p className="text-ink-muted">Loading articles…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl font-bold">Articles ({rows.length})</h2>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by title, slug, archetype…"
          className="w-72 rounded-md border border-border bg-paper px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto card-paper">
        <table className="w-full text-sm">
          <thead className="bg-paper-dark/40 text-left">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Archetypes</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Min</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border/60">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.title}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{r.slug}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.archetype_slugs.map((s) => (
                      <span key={s} className="rounded-full bg-paper-dark/60 px-2 py-0.5 text-[10px] font-mono uppercase">{s}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">{r.category}</td>
                <td className="px-4 py-3">{r.read_minutes}</td>
                <td className="px-4 py-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={r.published}
                      disabled={busy === r.id}
                      onChange={(e) => onToggle(r.id, e.target.checked)}
                    />
                    <span className="text-xs">{r.published ? "Published" : "Draft"}</span>
                  </label>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditing(r)} className="text-accent text-sm font-medium">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal
          row={editing}
          busy={busy === editing.id}
          onClose={() => setEditing(null)}
          onSave={onSave}
        />
      )}
    </div>
  );
}

function EditModal({ row, busy, onClose, onSave }: {
  row: Row; busy: boolean; onClose: () => void; onSave: (r: Row) => void;
}) {
  const [draft, setDraft] = useState(row);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl card-paper p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-serif text-xl font-bold">Edit article</h3>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mt-1">{draft.slug}</p>
        <div className="mt-4 space-y-3">
          <Field label="Title">
            <input className="w-full rounded-md border border-border bg-paper px-3 py-2 text-sm" value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </Field>
          <Field label="Excerpt">
            <textarea rows={3} className="w-full rounded-md border border-border bg-paper px-3 py-2 text-sm" value={draft.excerpt}
              onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <input className="w-full rounded-md border border-border bg-paper px-3 py-2 text-sm" value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
            </Field>
            <Field label="Read minutes">
              <input type="number" min={1} max={60} className="w-full rounded-md border border-border bg-paper px-3 py-2 text-sm" value={draft.read_minutes}
                onChange={(e) => setDraft({ ...draft, read_minutes: Number(e.target.value) })} />
            </Field>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-ink-muted">Cancel</button>
          <button
            disabled={busy}
            onClick={() => onSave(draft)}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1 block">{label}</span>
      {children}
    </label>
  );
}
