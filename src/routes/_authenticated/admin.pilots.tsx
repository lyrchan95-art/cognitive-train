import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { deletePilotRequest, listPilotRequests } from "@/lib/pilot-requests.functions";

export const Route = createFileRoute("/_authenticated/admin/pilots")({
  head: () => ({
    meta: [
      { title: "Pilot Requests — Admin" },
      { name: "description", content: "Team pilot requests submitted from the For Teams page." },
    ],
  }),
  component: AdminPilots,
});

function AdminPilots() {
  const qc = useQueryClient();
  const list = useServerFn(listPilotRequests);
  const remove = useServerFn(deletePilotRequest);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-pilot-requests"],
    queryFn: () => list(),
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pilot-requests"] });
      toast.success("Request deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-ink-muted">Loading…</p>;
  if (error) return <p className="text-destructive">Could not load pilot requests.</p>;

  return (
    <div>
      <p className="text-sm text-ink-muted">
        {data!.length} request{data!.length === 1 ? "" : "s"}. Reply within two working days, as the
        form promises. Delete requests that don't become pilots within 12 months.
      </p>
      {data!.length === 0 ? (
        <p className="mt-6 text-ink-soft">No pilot requests yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {data!.map((r) => (
            <li key={r.id} className="card-paper p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-serif text-lg font-bold">
                  {r.company}{" "}
                  <span className="text-sm font-normal text-ink-muted">· {r.team_size}</span>
                </p>
                <time className="font-mono text-xs text-ink-muted" dateTime={r.created_at}>
                  {new Date(r.created_at).toLocaleString("en-HK", { timeZone: "Asia/Hong_Kong" })}
                </time>
              </div>
              <p className="mt-1 text-sm">
                {r.name} ·{" "}
                <a href={`mailto:${r.email}`} className="text-accent hover:underline">
                  {r.email}
                </a>
              </p>
              {r.message && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-ink-soft">{r.message}</p>
              )}
              <button
                type="button"
                disabled={del.isPending}
                onClick={() => {
                  if (window.confirm(`Delete the request from ${r.company}?`)) del.mutate(r.id);
                }}
                className="mt-4 text-xs font-medium text-ink-muted hover:text-destructive"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
