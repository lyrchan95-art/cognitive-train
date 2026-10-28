import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount, exportMyData } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Your Data & Account — The Cognitive Atelier" },
      { name: "description", content: "Download a copy of your data or delete your account." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const exportData = useServerFn(exportMyData);
  const deleteAccount = useServerFn(deleteMyAccount);
  const [confirm, setConfirm] = useState("");

  const download = useMutation({
    mutationFn: () => exportData(),
    onSuccess: (data) => {
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cognitive-atelier-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error("Could not prepare your download. Please try again."),
  });

  const remove = useMutation({
    mutationFn: () => deleteAccount({ data: { confirm: "DELETE" } }),
    onSuccess: async () => {
      qc.clear();
      await supabase.auth.signOut();
      toast.success("Your account and data have been deleted.");
      navigate({ to: "/", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <section className="container-page max-w-3xl py-14 md:py-20">
        <p className="eyebrow">Your data & account</p>
        <h1 className="mt-3 font-serif text-4xl font-bold">You're in control of your data.</h1>
        <p className="mt-3 text-ink-soft">
          Signed in as <strong className="text-ink">{user.email}</strong>. Read how we handle your
          data in our{" "}
          <Link to="/privacy" className="text-accent hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="card-paper mt-10 p-6 md:p-8">
          <h2 className="font-serif text-2xl font-bold">Download your data</h2>
          <p className="mt-2 text-sm text-ink-soft">
            A JSON file with everything we hold about you: your account details, assessment and
            audit answers, check-ins, briefings and reflections, pathway progress and likes.
          </p>
          <button
            type="button"
            onClick={() => download.mutate()}
            disabled={download.isPending}
            className="mt-5 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-60"
          >
            {download.isPending ? "Preparing…" : "Download my data"}
          </button>
        </div>

        <div className="card-paper mt-6 border-destructive/40 p-6 md:p-8">
          <h2 className="font-serif text-2xl font-bold">Delete your account</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Permanently deletes your account and all of your data. This cannot be undone. You may
            want to download your data first.
          </p>
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (confirm === "DELETE") remove.mutate();
            }}
          >
            <label htmlFor="confirm-delete" className="eyebrow mb-1 block">
              Type DELETE to confirm
            </label>
            <div className="flex flex-wrap gap-3">
              <input
                id="confirm-delete"
                autoComplete="off"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-48 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={confirm !== "DELETE" || remove.isPending}
                className="rounded-lg bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
              >
                {remove.isPending ? "Deleting…" : "Delete my account"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </AppShell>
  );
}
