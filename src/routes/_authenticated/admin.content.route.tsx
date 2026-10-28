import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SubNav } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentLayout,
});

function ContentLayout() {
  return (
    <div>
      <SubNav
        items={[
          { to: "/admin/content", label: "Library", exact: true },
          { to: "/admin/content/matrix", label: "Tagging matrix" },
          { to: "/admin/content/schedule", label: "Schedule" },
          { to: "/admin/content/health", label: "Health" },
        ]}
      />
      <Outlet />
    </div>
  );
}
