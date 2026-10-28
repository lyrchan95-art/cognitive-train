import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getSharedRun, MODEL_REGISTRY } from "@/lib/lab.functions";
import { LabResults } from "@/components/admin/LabResults";
import { Panel, Skeleton, Empty, fmtDate } from "@/components/admin/ui";

export const Route = createFileRoute("/lab/shared/$token")({
  component: SharedRun,
  head: () => ({
    meta: [
      { title: "Shared model run · Cognitive Atelier Lab" },
      { name: "description", content: "A read-only, aggregate-only view of an Archetype Behaviour Lab model run." },
      { property: "og:title", content: "Shared model run · Cognitive Atelier Lab" },
      { property: "og:description", content: "A read-only, aggregate-only view of an Archetype Behaviour Lab model run." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Shared = Awaited<ReturnType<typeof getSharedRun>>;

function SharedRun() {
  const { token } = Route.useParams();
  const fetchShared = useServerFn(getSharedRun);
  const [data, setData] = useState<Shared | undefined>(undefined);

  useEffect(() => { fetchShared({ data: { token } }).then(setData).catch(() => setData(null)); }, [token]);

  return (
    <div className="container-page py-12">
      {data === undefined ? <Skeleton rows={6} /> : !data ? (
        <Empty title="Link not found" body="This share link is invalid or has expired." />
      ) : (
        <Panel eyebrow={`Read-only · expires ${fmtDate(data.expires_at)}`} title={`${MODEL_REGISTRY.find((m) => m.key === data.model_key)?.name ?? data.model_key} v${data.version}`}>
          <LabResults run={{ model_key: data.model_key, status: data.status, metrics: (data.metrics ?? {}) as never, results: (data.results ?? {}) as never }} />
        </Panel>
      )}
    </div>
  );
}
