import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getTaggingMatrix, setArticleTag } from "@/lib/content-ops.functions";
import { ARCHETYPES } from "@/data/archetypes";
import { Badge, ErrorBox, Field, Panel, Skeleton, inputCls } from "@/components/admin/ui";
import { archetypeColor } from "@/lib/archetype-colors";

export const Route = createFileRoute("/_authenticated/admin/content/matrix")({
  head: () => ({
    meta: [
      { title: "Archetype tagging matrix · Content Update Console" },
      { name: "description", content: "Tag essays to archetypes with model suggestions and a minimum coverage rule of ten per archetype." },
      { property: "og:title", content: "Archetype tagging matrix" },
      { property: "og:description", content: "Tag essays to archetypes with model suggestions and coverage health." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Matrix,
});

type Data = Awaited<ReturnType<typeof getTaggingMatrix>>;

function Matrix() {
  const load = useServerFn(getTaggingMatrix);
  const setTag = useServerFn(setArticleTag);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tagged, setTagged] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const refresh = () => {
    setErr(null);
    load().then((d) => { setData(d); setTagged(new Set(d.tagged)); }).catch((e: Error) => setErr(e.message));
  };
  useEffect(refresh, []);

  const suggested = useMemo(() => new Map((data?.suggested ?? []).map((s) => [s.key, s.score])), [data]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(ARCHETYPES.map((a) => [a.slug, 0])) as Record<string, number>;
    const published = new Set((data?.articles ?? []).filter((a) => a.published).map((a) => a.id));
    for (const k of tagged) {
      const [id, slug] = k.split("|");
      if (published.has(id) && slug in c) c[slug]++;
    }
    return c;
  }, [tagged, data]);

  const rows = useMemo(() => {
    const list = data?.articles ?? [];
    const needle = q.trim().toLowerCase();
    return list.filter((a) => {
      if (needle && !(a.title.toLowerCase().includes(needle) || a.slug.toLowerCase().includes(needle))) return false;
      if (onlyGaps && ARCHETYPES.some((x) => tagged.has(`${a.id}|${x.slug}`))) return false;
      return true;
    });
  }, [data, q, onlyGaps, tagged]);

  const flip = async (articleId: string, archetype: string) => {
    const key = `${articleId}|${archetype}`;
    const next = !tagged.has(key);
    setPending(key);
    setTagged((p) => { const n = new Set(p); next ? n.add(key) : n.delete(key); return n; });
    try {
      await setTag({ data: { articleId, archetype, tagged: next, source: suggested.has(key) && next ? "suggestion" : "manual" } });
    } catch (e) {
      setErr((e as Error).message);
      setTagged((p) => { const n = new Set(p); next ? n.delete(key) : n.add(key); return n; });
    } finally { setPending(null); }
  };

  const minimum = data?.minimum ?? 10;

  return (
    <div className="space-y-6">
      <Panel eyebrow="Coverage" title="Archetype tagging matrix">
        {err && <div className="mb-4"><ErrorBox message={err} retry={refresh} /></div>}
        {!data ? <Skeleton rows={3} /> : (
          <>
            <p className="text-sm text-ink-muted">
              Health rule: at least <span className="font-mono">{minimum}</span> published essays per archetype.
              {data.recommender ? ` Suggestions from recommender v${data.recommender.version}.` : " No production recommender promoted yet — suggestions are off."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {ARCHETYPES.map((a) => {
                const n = counts[a.slug] ?? 0;
                const ok = n >= minimum;
                return (
                  <div key={a.slug} className="rounded-lg border border-border/60 p-2" style={{ borderTopColor: archetypeColor(a.slug), borderTopWidth: 3 }}>
                    <p className="truncate font-mono text-[10px] uppercase tracking-widest text-ink-muted">{a.slug}</p>
                    <p className={`font-mono text-lg font-semibold tabular-nums ${ok ? "" : "text-destructive"}`}>{n}</p>
                    {!ok && <p className="text-[10px] text-destructive">{minimum - n} short</p>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Panel>

      <Panel>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Field label="Search"><input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or slug" /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={onlyGaps} onChange={(e) => setOnlyGaps(e.target.checked)} />
            Only untagged essays
          </label>
          <div className="flex items-end text-xs text-ink-muted">{rows.length} essays</div>
        </div>

        {!data ? <Skeleton rows={8} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-paper-dark/40">
                <tr>
                  <th className="sticky left-0 z-10 bg-paper-dark/40 px-3 py-3 text-left">Essay</th>
                  {ARCHETYPES.map((a) => (
                    <th key={a.slug} className="px-1 py-3 text-center font-mono text-[10px] uppercase tracking-widest text-ink-muted" title={a.name}>{a.slug.slice(0, 4)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-t border-border/60">
                    <td className="sticky left-0 z-10 bg-paper px-3 py-2">
                      <div className="max-w-[260px] truncate font-medium">{a.title}</div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{a.slug}</span>
                        {!a.published && <Badge tone="warn">draft</Badge>}
                      </div>
                    </td>
                    {ARCHETYPES.map((x) => {
                      const key = `${a.id}|${x.slug}`;
                      const on = tagged.has(key);
                      const sug = suggested.get(key);
                      return (
                        <td key={x.slug} className="px-1 py-2 text-center">
                          <button
                            disabled={pending === key}
                            onClick={() => flip(a.id, x.slug)}
                            title={sug !== undefined ? `Model suggestion (${sug.toFixed(2)})` : undefined}
                            className={`h-6 w-6 rounded-md border transition-all press ${on ? "border-transparent" : sug !== undefined ? "border-dashed border-accent/70" : "border-border"}`}
                            style={on ? { background: archetypeColor(x.slug) } : undefined}
                          >
                            {!on && sug !== undefined && <span className="text-[10px] text-accent">+</span>}
                          </button>
                        </td>
                      );
                    })}
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
