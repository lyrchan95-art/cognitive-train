import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listContentArticles, bulkArticleAction, exportLibrary } from "@/lib/content-ops.functions";
import { ARCHETYPES } from "@/data/archetypes";
import { Badge, Btn, Empty, ErrorBox, Field, Panel, Skeleton, downloadText, fmtDate, inputCls } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/content/")({
  head: () => ({
    meta: [
      { title: "Content Library · Content Update Console" },
      { name: "description", content: "Bulk publish, archive, retag and schedule the essay library from one console." },
      { property: "og:title", content: "Content Library · Content Update Console" },
      { property: "og:description", content: "Bulk publish, archive, retag and schedule the essay library from one console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContentLibrary,
});

type Row = Awaited<ReturnType<typeof listContentArticles>>[number];
type Status = "all" | "published" | "draft" | "archived";

function ContentLibrary() {
  const load = useServerFn(listContentArticles);
  const bulk = useServerFn(bulkArticleAction);
  const exportFn = useServerFn(exportLibrary);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [arch, setArch] = useState("");
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("");
  const [retagMode, setRetagMode] = useState<"add" | "remove" | "set">("add");
  const [retagArch, setRetagArch] = useState<string[]>([]);
  const [when, setWhen] = useState("");

  const refresh = () => {
    setErr(null);
    load().then((r) => { setRows(r); setSel(new Set()); }).catch((e: Error) => setErr(e.message));
  };
  useEffect(refresh, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === "published" && !(r.published && !r.archived_at)) return false;
      if (status === "draft" && (r.published || r.archived_at)) return false;
      if (status === "archived" && !r.archived_at) return false;
      if (arch && !r.archetype_slugs.includes(arch)) return false;
      if (needle && !(r.title.toLowerCase().includes(needle) || r.slug.toLowerCase().includes(needle) || r.category.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [rows, q, status, arch]);

  const ids = [...sel];
  type BulkPayload =
    | { action: "publish" | "unpublish" | "archive" | "restore"; ids: string[] }
    | { action: "delete"; ids: string[]; confirm: "DELETE" }
    | { action: "set_category"; ids: string[]; category: string }
    | { action: "retag"; ids: string[]; mode: "add" | "remove" | "set"; archetypes: string[] }
    | { action: "schedule"; ids: string[]; publishAt: string; op: "publish" | "unpublish" };
  const run = async (payload: BulkPayload) => {
    setBusy(true); setErr(null);
    try { await bulk({ data: payload as never }); refresh(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allShown = filtered.length > 0 && filtered.every((r) => sel.has(r.id));

  return (
    <div className="space-y-6">
      <Panel
        eyebrow="Content Update Console"
        title="Article library"
        action={
          <div className="flex flex-wrap gap-2">
            <Btn variant="outline" onClick={async () => { const f = await exportFn({ data: { format: "csv" } }); downloadText(f.filename, f.body, f.mime); }}>Export CSV</Btn>
            <Btn variant="outline" onClick={async () => { const f = await exportFn({ data: { format: "json" } }); downloadText(f.filename, f.body, f.mime); }}>Export JSON</Btn>
          </div>
        }
      >
        {err && <div className="mb-4"><ErrorBox message={err} retry={refresh} /></div>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Search"><input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, slug, category" /></Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              <option value="all">All</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Archetype">
            <select className={inputCls} value={arch} onChange={(e) => setArch(e.target.value)}>
              <option value="">Any</option>
              {ARCHETYPES.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <p className="text-xs text-ink-muted">{filtered.length} shown · {sel.size} selected</p>
          </div>
        </div>
      </Panel>

      {sel.size > 0 && (
        <Panel title={`Bulk actions (${sel.size})`}>
          <div className="flex flex-wrap gap-2">
            <Btn disabled={busy} onClick={() => run({ action: "publish", ids })}>Publish</Btn>
            <Btn variant="outline" disabled={busy} onClick={() => run({ action: "unpublish", ids })}>Unpublish</Btn>
            <Btn variant="outline" disabled={busy} onClick={() => run({ action: "archive", ids })}>Archive</Btn>
            <Btn variant="outline" disabled={busy} onClick={() => run({ action: "restore", ids })}>Restore</Btn>
            <Btn variant="danger" disabled={busy} onClick={() => { if (confirm(`Permanently delete ${ids.length} article(s)?`)) run({ action: "delete", ids, confirm: "DELETE" }); }}>Delete</Btn>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-border/60 p-3">
              <Field label="Set category">
                <div className="flex gap-2">
                  <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="essay" />
                  <Btn variant="outline" disabled={busy || !category.trim()} onClick={() => run({ action: "set_category", ids, category: category.trim() })}>Apply</Btn>
                </div>
              </Field>
            </div>

            <div className="rounded-lg border border-border/60 p-3">
              <Field label="Retag archetypes" hint="Set replaces every tag on the selected articles.">
                <select className={inputCls} value={retagMode} onChange={(e) => setRetagMode(e.target.value as "add" | "remove" | "set")}>
                  <option value="add">Add</option><option value="remove">Remove</option><option value="set">Set</option>
                </select>
              </Field>
              <div className="mt-2 flex flex-wrap gap-1">
                {ARCHETYPES.map((a) => {
                  const on = retagArch.includes(a.slug);
                  return (
                    <button key={a.slug} onClick={() => setRetagArch((p) => on ? p.filter((s) => s !== a.slug) : [...p, a.slug])}
                      className={`rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${on ? "bg-ink text-paper" : "bg-paper-dark/60 text-ink-muted"}`}>
                      {a.slug}
                    </button>
                  );
                })}
              </div>
              <Btn className="mt-3" variant="outline" disabled={busy || (retagMode !== "set" && !retagArch.length)} onClick={() => run({ action: "retag", ids, mode: retagMode, archetypes: retagArch })}>Apply tags</Btn>
            </div>

            <div className="rounded-lg border border-border/60 p-3">
              <Field label="Schedule publish" hint="Adds the selection to the publishing queue.">
                <input type="datetime-local" className={inputCls} value={when} onChange={(e) => setWhen(e.target.value)} />
              </Field>
              <Btn className="mt-3" variant="outline" disabled={busy || !when} onClick={() => run({ action: "schedule", ids, publishAt: new Date(when).toISOString(), op: "publish" })}>Queue</Btn>
            </div>
          </div>
        </Panel>
      )}

      <Panel>
        {!rows ? <Skeleton rows={8} /> : filtered.length === 0 ? (
          <Empty title="No articles match" body="Adjust the search, status or archetype filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-paper-dark/40 text-left">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox" checked={allShown} onChange={(e) => setSel((p) => {
                      const n = new Set(p);
                      filtered.forEach((r) => e.target.checked ? n.add(r.id) : n.delete(r.id));
                      return n;
                    })} />
                  </th>
                  <th className="px-3 py-3">Title</th>
                  <th className="px-3 py-3">Archetypes</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Likes 30d</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border/60 align-top">
                    <td className="px-3 py-3"><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{r.title}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{r.slug}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.archetype_slugs.length === 0 ? <Badge tone="warn">untagged</Badge> : r.archetype_slugs.map((s) => <Badge key={s}>{s}</Badge>)}
                      </div>
                    </td>
                    <td className="px-3 py-3">{r.category}</td>
                    <td className="px-3 py-3 font-mono tabular-nums">{r.likes.last30}<span className="text-ink-muted"> / {r.likes.total}</span></td>
                    <td className="px-3 py-3">
                      {r.archived_at ? <Badge tone="bad">archived</Badge> : r.published ? <Badge tone="good">published</Badge> : <Badge tone="warn">draft</Badge>}
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-muted">{fmtDate(r.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
