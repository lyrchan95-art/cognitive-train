import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listSchedule, upsertSchedule, cancelSchedule, publishNow, processDueSchedule,
  listContentArticles, listPathwaysForConsole,
} from "@/lib/content-ops.functions";
import { Badge, Btn, Empty, ErrorBox, Field, Panel, Skeleton, StatusBadge, fmtDate, inputCls } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/content/schedule")({
  head: () => ({
    meta: [
      { title: "Publishing queue · Content Update Console" },
      { name: "description", content: "Queue essays and pathways to publish or unpublish at a chosen time, reschedule, or run due items now." },
      { property: "og:title", content: "Publishing queue" },
      { property: "og:description", content: "Schedule, reschedule and run content publishing jobs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchedulePage,
});

type Item = Awaited<ReturnType<typeof listSchedule>>[number];

function SchedulePage() {
  const load = useServerFn(listSchedule);
  const save = useServerFn(upsertSchedule);
  const cancel = useServerFn(cancelSchedule);
  const now = useServerFn(publishNow);
  const processDue = useServerFn(processDueSchedule);
  const loadArticles = useServerFn(listContentArticles);
  const loadPathways = useServerFn(listPathwaysForConsole);

  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [entityType, setEntityType] = useState<"articles" | "pathways">("articles");
  const [entityId, setEntityId] = useState("");
  const [action, setAction] = useState<"publish" | "unpublish">("publish");
  const [when, setWhen] = useState("");
  const [articles, setArticles] = useState<{ id: string; title: string }[]>([]);
  const [pathways, setPathways] = useState<{ id: string; title: string }[]>([]);

  const refresh = () => { setErr(null); load().then(setItems).catch((e: Error) => setErr(e.message)); };
  useEffect(() => {
    refresh();
    loadArticles().then((a) => setArticles(a.map((x) => ({ id: x.id, title: x.title })))).catch(() => {});
    loadPathways().then((p) => setPathways(p.map((x) => ({ id: x.id, title: x.title })))).catch(() => {});
  }, []);

  const options = entityType === "articles" ? articles : pathways;
  const grouped = useMemo(() => {
    const t = Date.now();
    const pending = (items ?? []).filter((i) => i.status === "pending");
    return {
      due: pending.filter((i) => Date.parse(i.scheduled_for) <= t),
      upcoming: pending.filter((i) => Date.parse(i.scheduled_for) > t),
      history: (items ?? []).filter((i) => i.status !== "pending").sort((a, b) => b.scheduled_for.localeCompare(a.scheduled_for)),
    };
  }, [items]);

  const guard = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); refresh(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const Row = ({ i }: { i: Item }) => {
    const [edit, setEdit] = useState("");
    return (
      <tr className="border-t border-border/60">
        <td className="px-3 py-3">
          <div className="font-medium">{i.entity_title || i.entity_id.slice(0, 8)}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{i.entity_type}</div>
        </td>
        <td className="px-3 py-3"><Badge tone={i.action === "publish" ? "good" : "neutral"}>{i.action}</Badge></td>
        <td className="px-3 py-3 text-xs">{fmtDate(i.scheduled_for)}</td>
        <td className="px-3 py-3"><StatusBadge status={i.status} />{i.error && <p className="mt-1 font-mono text-[10px] text-destructive">{i.error}</p>}</td>
        <td className="px-3 py-3">
          {i.status === "pending" ? (
            <div className="flex flex-wrap items-center gap-2">
              <input type="datetime-local" className="rounded-md border border-border bg-paper px-2 py-1 text-xs" value={edit} onChange={(e) => setEdit(e.target.value)} />
              <Btn variant="outline" disabled={busy || !edit} onClick={() => guard(() => save({ data: { id: i.id, entityType: i.entity_type as "articles" | "pathways", entityId: i.entity_id, entityTitle: i.entity_title, action: i.action as "publish" | "unpublish", scheduledFor: new Date(edit).toISOString() } }))}>Reschedule</Btn>
              <Btn variant="outline" disabled={busy} onClick={() => guard(() => now({ data: { id: i.id } }))}>Run now</Btn>
              <Btn variant="ghost" disabled={busy} onClick={() => guard(() => cancel({ data: { id: i.id } }))}>Cancel</Btn>
            </div>
          ) : <span className="text-xs text-ink-muted">{fmtDate(i.executed_at)}</span>}
        </td>
      </tr>
    );
  };

  const Table = ({ list, empty }: { list: Item[]; empty: string }) =>
    list.length === 0 ? <Empty title="Nothing here" body={empty} /> : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-paper-dark/40 text-left">
            <tr><th className="px-3 py-3">Item</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">When</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Controls</th></tr>
          </thead>
          <tbody>{list.map((i) => <Row key={i.id} i={i} />)}</tbody>
        </table>
      </div>
    );

  return (
    <div className="space-y-6">
      <Panel
        eyebrow="Queue"
        title="Scheduled publishing"
        action={<Btn disabled={busy} onClick={() => guard(() => processDue())}>Run due items</Btn>}
      >
        {err && <div className="mb-4"><ErrorBox message={err} retry={refresh} /></div>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Type">
            <select className={inputCls} value={entityType} onChange={(e) => { setEntityType(e.target.value as "articles" | "pathways"); setEntityId(""); }}>
              <option value="articles">Article</option><option value="pathways">Pathway</option>
            </select>
          </Field>
          <Field label="Item">
            <select className={inputCls} value={entityId} onChange={(e) => setEntityId(e.target.value)}>
              <option value="">Select…</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </Field>
          <Field label="Action">
            <select className={inputCls} value={action} onChange={(e) => setAction(e.target.value as "publish" | "unpublish")}>
              <option value="publish">Publish</option><option value="unpublish">Unpublish</option>
            </select>
          </Field>
          <Field label="When">
            <input type="datetime-local" className={inputCls} value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
        </div>
        <Btn
          className="mt-4"
          disabled={busy || !entityId || !when}
          onClick={() => guard(async () => {
            const title = options.find((o) => o.id === entityId)?.title ?? "";
            await save({ data: { entityType, entityId, entityTitle: title, action, scheduledFor: new Date(when).toISOString() } });
            setEntityId(""); setWhen("");
          })}
        >
          Add to queue
        </Btn>
      </Panel>

      {!items ? <Panel><Skeleton rows={6} /></Panel> : (
        <>
          {grouped.due.length > 0 && <Panel title={`Due now (${grouped.due.length})`}><Table list={grouped.due} empty="" /></Panel>}
          <Panel title={`Upcoming (${grouped.upcoming.length})`}><Table list={grouped.upcoming} empty="Nothing is scheduled yet." /></Panel>
          <Panel title="History"><Table list={grouped.history.slice(0, 30)} empty="No jobs have run yet." /></Panel>
        </>
      )}
    </div>
  );
}
