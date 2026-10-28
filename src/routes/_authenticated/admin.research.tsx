import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListResearch,
  adminUpsertResearch,
  adminDeleteResearch,
  adminGetResearch,
  RESEARCH_CATEGORIES,
} from "@/lib/research.functions";

export const Route = createFileRoute("/_authenticated/admin/research")({
  component: AdminResearch,
});

type Draft = {
  id?: string;
  slug: string;
  title: string;
  subtitle: string;
  authors: string;
  category: "neuroscience" | "behavioral_psychology" | "editorial" | "research";
  abstract: string;
  body: string;
  source_url: string;
  citation: string;
  hero_image_url: string;
  published_date: string;
  read_minutes: number;
  published: boolean;
};

const emptyDraft = (): Draft => ({
  slug: "",
  title: "",
  subtitle: "",
  authors: "",
  category: "neuroscience",
  abstract: "",
  body: "",
  source_url: "",
  citation: "",
  hero_image_url: "",
  published_date: new Date().toISOString().slice(0, 10),
  read_minutes: 6,
  published: true,
});

function AdminResearch() {
  const list = useServerFn(adminListResearch);
  const upsert = useServerFn(adminUpsertResearch);
  const remove = useServerFn(adminDeleteResearch);
  const getOne = useServerFn(adminGetResearch);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-research"],
    queryFn: () => list(),
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mSave = useMutation({
    mutationFn: (d: Draft) => upsert({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-research"] });
      setDraft(null);
      setError(null);
    },
    onError: (e: any) => setError(String(e?.message ?? e)),
  });

  const mDelete = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-research"] }),
  });

  async function edit(id: string) {
    const row = await getOne({ data: { id } });
    if (!row) return;
    setDraft({
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle ?? "",
      authors: row.authors ?? "",
      category: row.category as any,
      abstract: row.abstract,
      body: row.body,
      source_url: row.source_url ?? "",
      citation: row.citation ?? "",
      hero_image_url: row.hero_image_url ?? "",
      published_date: (row.published_date as string).slice(0, 10),
      read_minutes: row.read_minutes,
      published: row.published,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Research Library</h1>
          <p className="text-sm text-ink-muted">
            Upload research papers, editorials, neuroscience & behavioral psychology pieces.
          </p>
        </div>
        <button
          onClick={() => setDraft(emptyDraft())}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:opacity-90"
        >
          + New research
        </button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-ink-muted">Loading…</p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-xs font-mono uppercase tracking-widest text-ink-muted">
            <tr>
              <th className="py-2">Title</th>
              <th>Category</th>
              <th>Date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="py-3">
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-xs text-ink-muted">{r.authors ?? "—"}</p>
                </td>
                <td className="text-ink-soft">
                  {RESEARCH_CATEGORIES.find((c) => c.slug === r.category)?.label ?? r.category}
                </td>
                <td className="font-mono text-xs text-ink-muted">
                  {(r.published_date as string).slice(0, 10)}
                </td>
                <td>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${r.published ? "bg-accent/20 text-accent" : "bg-paper-dark text-ink-muted"}`}
                  >
                    {r.published ? "Live" : "Draft"}
                  </span>
                </td>
                <td className="text-right">
                  <button
                    onClick={() => edit(r.id)}
                    className="mr-2 text-sm text-accent hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this research article?")) mDelete.mutate(r.id);
                    }}
                    className="text-sm text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-paper p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold">
                {draft.id ? "Edit research" : "New research"}
              </h2>
              <button onClick={() => setDraft(null)} className="text-ink-muted hover:text-ink">
                ✕
              </button>
            </div>

            {error && (
              <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
            )}

            <div className="mt-4 grid gap-3">
              <Field label="Title">
                <input
                  className="input"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Slug (lowercase, hyphens)">
                  <input
                    className="input"
                    value={draft.slug}
                    onChange={(e) =>
                      setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
                    }
                  />
                </Field>
                <Field label="Category">
                  <select
                    className="input"
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value as any })}
                  >
                    {RESEARCH_CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Subtitle (optional)">
                <input
                  className="input"
                  value={draft.subtitle}
                  onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                />
              </Field>
              <Field label="Authors">
                <input
                  className="input"
                  value={draft.authors}
                  onChange={(e) => setDraft({ ...draft, authors: e.target.value })}
                />
              </Field>
              <Field label="Hero image URL (optional)">
                <input
                  className="input"
                  value={draft.hero_image_url}
                  onChange={(e) => setDraft({ ...draft, hero_image_url: e.target.value })}
                />
              </Field>
              <Field label="Abstract">
                <textarea
                  className="input min-h-[100px]"
                  value={draft.abstract}
                  onChange={(e) => setDraft({ ...draft, abstract: e.target.value })}
                />
              </Field>
              <Field label="Body (full text)">
                <textarea
                  className="input min-h-[220px] font-mono text-sm"
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Published date">
                  <input
                    type="date"
                    className="input"
                    value={draft.published_date}
                    onChange={(e) => setDraft({ ...draft, published_date: e.target.value })}
                  />
                </Field>
                <Field label="Read minutes">
                  <input
                    type="number"
                    className="input"
                    value={draft.read_minutes}
                    onChange={(e) =>
                      setDraft({ ...draft, read_minutes: Number(e.target.value) || 1 })
                    }
                  />
                </Field>
                <Field label="Published">
                  <select
                    className="input"
                    value={draft.published ? "yes" : "no"}
                    onChange={(e) => setDraft({ ...draft, published: e.target.value === "yes" })}
                  >
                    <option value="yes">Live</option>
                    <option value="no">Draft</option>
                  </select>
                </Field>
              </div>
              <Field label="Source URL (optional)">
                <input
                  className="input"
                  value={draft.source_url}
                  onChange={(e) => setDraft({ ...draft, source_url: e.target.value })}
                />
              </Field>
              <Field label="Citation (optional)">
                <input
                  className="input"
                  value={draft.citation}
                  onChange={(e) => setDraft({ ...draft, citation: e.target.value })}
                />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDraft(null)}
                className="rounded-full border border-border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                disabled={mSave.isPending}
                onClick={() => mSave.mutate(draft)}
                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:opacity-90"
              >
                {mSave.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-widest text-ink-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
