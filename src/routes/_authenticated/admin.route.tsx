import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStatus, claimFirstAdmin } from "@/lib/admin.functions";
import { AppShell } from "@/components/site/AppShell";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

type Status = { isAdmin: boolean; isLab: boolean; isEditor: boolean; roles: string[]; adminCount: number };

function AdminLayout() {
  const getStatus = useServerFn(getAdminStatus);
  const claim = useServerFn(claimFirstAdmin);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  const refresh = () => getStatus().then(setStatus).catch(() => setStatus({ isAdmin: false, isLab: false, isEditor: false, roles: [], adminCount: -1 }));
  useEffect(() => { refresh(); }, []);

  if (!status) {
    return <AppShell><div className="container-page py-20 text-ink-muted">Loading admin…</div></AppShell>;
  }

  const isStaff = status.isAdmin || status.isLab || status.isEditor;
  if (!isStaff) {
    return (
      <AppShell>
        <div className="container-page py-20 max-w-xl">
          <h1 className="font-serif text-3xl font-bold">Admin portal</h1>
          <p className="mt-4 text-ink-muted">
            {status.adminCount === 0
              ? "No admin exists yet. Claim the first admin role for your account to unlock the CMS."
              : "You don't have staff access. Ask an admin to grant you the admin, data_scientist or content_editor role."}
          </p>
          {status.adminCount === 0 && (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try { await claim(); await refresh(); } finally { setBusy(false); }
              }}
              className="mt-6 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-paper disabled:opacity-50"
            >
              {busy ? "Claiming…" : "Claim admin role"}
            </button>
          )}
        </div>
      </AppShell>
    );
  }

  const tabs: { to: string; label: string; exact?: boolean }[] = [
    { to: "/admin", label: "Overview", exact: true },
    { to: "/admin/guide", label: "Guide" },
    ...(status.isAdmin ? [
      { to: "/admin/archetypes", label: "Archetypes" },
      { to: "/admin/articles", label: "Articles" },
      { to: "/admin/pathways", label: "Pathways" },
      { to: "/admin/research", label: "Research" },
    ] : []),
    ...(status.isEditor ? [{ to: "/admin/content", label: "Content Console" }] : []),
    ...(status.isLab ? [{ to: "/admin/lab", label: "Behaviour Lab" }] : []),
  ];
  const roleLabel = status.isAdmin ? "Admin" : [status.isLab && "Data Scientist", status.isEditor && "Content Editor"].filter(Boolean).join(" · ");

  return (
    <AppShell>
      <div className="container-page py-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">CMS</p>
            <h1 className="font-serif text-3xl font-bold">Admin portal</h1>
          </div>
          <span className="rounded-full bg-ink px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-paper">
            {roleLabel}
          </span>
        </div>
        <nav className="mt-6 flex gap-2 overflow-x-auto border-b border-border/60">
          {tabs.map((t) => {
            const active = t.exact ? path === t.to : path.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-paper-dark/60 text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="pt-8">
          <Outlet />
        </div>
      </div>
    </AppShell>
  );
}
