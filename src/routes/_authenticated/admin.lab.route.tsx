import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SubNav } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/lab")({
  component: LabLayout,
});

function LabLayout() {
  return (
    <div>
      <SubNav
        items={[
          { to: "/admin/lab", label: "Runs", exact: true },
          { to: "/admin/lab/datasets", label: "Datasets" },
          { to: "/admin/lab/insights", label: "Insights" },
          { to: "/admin/lab/governance", label: "Governance" },
        ]}
      />
      <Outlet />
    </div>
  );
}
