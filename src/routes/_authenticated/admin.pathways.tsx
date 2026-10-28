import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListPathways,
  adminGetPathwayDays,
  adminUpdatePathway,
  adminUpdatePathwayDay,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/pathways")({
  component: AdminPathwaysPage,
});

type Pathway = Awaited<ReturnType<typeof adminListPathways>>[number];
type Day = Awaited<ReturnType<typeof adminGetPathwayDays>>[number];

function AdminPathwaysPage() {
  const list = useServerFn(adminListPathways);
  const getDays = useServerFn(adminGetPathwayDays);
  const updatePw = useServerFn(adminUpdatePathway);
  const updateDay = useServerFn(adminUpdatePathwayDay);
  const qc = useQueryClient();

  const { data: pathways } = useQuery({ queryKey: ["admin-pathways"], queryFn: () => list() });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Pathway | null>(null);
  const [editingDay, setEditingDay] = useState<Day | null>(null);

  const { data: days } = useQuery({
    queryKey: ["admin-pathway-days", selectedId],
    queryFn: () => getDays({ data: { pathwayId: selectedId! } }),
    enabled: !!selectedId,
  });

  const savePw = useMutation({
    mutationFn: (v: {
      id: string;
      title: string;
      description: string;
      icon?: string;
      difficulty: string;
      hero_image_url?: string;
      published: boolean;
    }) => updatePw({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pathways"] });
      setEditing(null);
    },
  });
  const saveDay = useMutation({
    mutationFn: (v: {
      id: string;
      title: string;
      content: string;
      action_prompt: string;
      read_minutes: number;
    }) => updateDay({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pathway-days", selectedId] });
      setEditingDay(null);
    },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <h2 className="font-serif text-xl font-bold">Pathways ({pathways?.length ?? 0})</h2>
        <ul className="mt-4 space-y-2">
          {pathways?.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setSelectedId(p.id)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                  selectedId === p.id
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-ink"
                }`}
              >
                <div>
                  <p className="font-medium">
                    {p.icon} {p.title}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {p.archetype_slug} · {p.duration_days} days · {p.published ? "Live" : "Draft"}
                  </p>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  className="rounded-full border border-border px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-ink-soft hover:border-ink hover:text-ink"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(p);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      setEditing(p);
                    }
                  }}
                >
                  Edit
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="font-serif text-xl font-bold">
          {selectedId ? "Days" : "Select a pathway →"}
        </h2>
        {selectedId && (
          <ul className="mt-4 space-y-2">
            {days?.map((d) => (
              <li
                key={d.id}
                className="rounded-md border border-border p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-serif text-base font-bold">
                      Day {d.day_number}: {d.title.replace(/^Day \d+:\s*/, "")}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{d.content}</p>
                    <p className="mt-2 text-xs italic text-accent">→ {d.action_prompt}</p>
                  </div>
                  <button
                    onClick={() => setEditingDay(d)}
                    className="rounded-full border border-border px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-ink-soft hover:border-ink hover:text-ink"
                  >
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <PathwayEditModal
          pathway={editing}
          onClose={() => setEditing(null)}
          onSave={(v) => savePw.mutate(v)}
          saving={savePw.isPending}
        />
      )}
      {editingDay && (
        <DayEditModal
          day={editingDay}
          onClose={() => setEditingDay(null)}
          onSave={(v) => saveDay.mutate(v)}
          saving={saveDay.isPending}
        />
      )}
    </div>
  );
}

function PathwayEditModal({
  pathway,
  onClose,
  onSave,
  saving,
}: {
  pathway: Pathway;
  onClose: () => void;
  onSave: (v: {
    id: string;
    title: string;
    description: string;
    icon?: string;
    difficulty: string;
    hero_image_url?: string;
    published: boolean;
  }) => void;
  saving: boolean;
}) {
  const [f, setF] = useState({
    title: pathway.title,
    description: pathway.description,
    icon: pathway.icon,
    difficulty: pathway.difficulty,
    hero_image_url: pathway.hero_image_url ?? "",
    published: pathway.published,
  });
  return (
    <Modal onClose={onClose} title="Edit pathway">
      <div className="grid gap-3">
        <Field label="Title">
          <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="Description">
          <textarea rows={4} className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Icon">
            <input className="input" value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} />
          </Field>
          <Field label="Difficulty">
            <input className="input" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })} />
          </Field>
          <Field label="Published">
            <select
              className="input"
              value={f.published ? "1" : "0"}
              onChange={(e) => setF({ ...f, published: e.target.value === "1" })}
            >
              <option value="1">Live</option>
              <option value="0">Draft</option>
            </select>
          </Field>
        </div>
        <Field label="Hero image URL">
          <input className="input" value={f.hero_image_url} onChange={(e) => setF({ ...f, hero_image_url: e.target.value })} />
        </Field>
      </div>
      <ModalFooter
        onClose={onClose}
        onSave={() => onSave({ id: pathway.id, ...f })}
        saving={saving}
      />
    </Modal>
  );
}

function DayEditModal({
  day,
  onClose,
  onSave,
  saving,
}: {
  day: Day;
  onClose: () => void;
  onSave: (v: {
    id: string;
    title: string;
    content: string;
    action_prompt: string;
    read_minutes: number;
  }) => void;
  saving: boolean;
}) {
  const [f, setF] = useState({
    title: day.title,
    content: day.content,
    action_prompt: day.action_prompt,
    read_minutes: day.read_minutes,
  });
  return (
    <Modal onClose={onClose} title={`Edit Day ${day.day_number}`}>
      <div className="grid gap-3">
        <Field label="Title">
          <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="Content">
          <textarea rows={7} className="input" value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
        </Field>
        <Field label="Action prompt">
          <textarea rows={3} className="input" value={f.action_prompt} onChange={(e) => setF({ ...f, action_prompt: e.target.value })} />
        </Field>
        <Field label="Read minutes">
          <input
            type="number"
            className="input w-32"
            value={f.read_minutes}
            onChange={(e) => setF({ ...f, read_minutes: Number(e.target.value) })}
          />
        </Field>
      </div>
      <ModalFooter onClose={onClose} onSave={() => onSave({ id: day.id, ...f })} saving={saving} />
    </Modal>
  );
}

function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-lg bg-paper p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ModalFooter({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm">
        Cancel
      </button>
      <button
        disabled={saving}
        onClick={onSave}
        className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
