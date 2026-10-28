import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListArchetypes, adminListArticles } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const listA = useServerFn(adminListArchetypes);
  const listArt = useServerFn(adminListArticles);
  const [stats, setStats] = useState<{ archetypes: number; publishedA: number; articles: number; publishedArt: number } | null>(null);

  useEffect(() => {
    Promise.all([listA(), listArt()]).then(([a, arts]) => {
      setStats({
        archetypes: a.length,
        publishedA: a.filter((x: any) => x.published).length,
        articles: arts.length,
        publishedArt: arts.filter((x: any) => x.published).length,
      });
    });
  }, []);

  if (!stats) return <p className="text-ink-muted">Loading…</p>;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <StatCard
        title="Archetype cards"
        value={`${stats.publishedA} / ${stats.archetypes}`}
        subtitle="Published"
        cta={{ to: "/admin/archetypes", label: "Manage archetypes →" }}
      />
      <StatCard
        title="Articles"
        value={`${stats.publishedArt} / ${stats.articles}`}
        subtitle="Published"
        cta={{ to: "/admin/articles", label: "Manage articles →" }}
      />
    </div>
  );
}

function StatCard({ title, value, subtitle, cta }: { title: string; value: string; subtitle: string; cta: { to: string; label: string } }) {
  return (
    <div className="card-paper p-6">
      <p className="eyebrow">{title}</p>
      <p className="mt-3 font-serif text-5xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
      <Link to={cta.to} className="mt-6 inline-block text-sm font-medium text-accent">{cta.label}</Link>
    </div>
  );
}
