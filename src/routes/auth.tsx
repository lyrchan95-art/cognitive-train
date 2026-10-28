import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — The Cognitive Atelier" },
      {
        name: "description",
        content: "Sign in to save your Cognitive Archetype and receive daily personalized insights.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const redirectTo = safeRedirect(search.redirect);

  // If a session already exists, bounce to the destination.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) {
        navigate({ to: redirectTo, replace: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigate, redirectTo]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + redirectTo,
            data: { full_name: displayName || undefined },
          },
        });
        if (error) throw error;
        setNotice(
          "Account created. Check your inbox to confirm your email, then sign in.",
        );
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: redirectTo, replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      // Save intended destination — OAuth returns to origin, then we navigate.
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("post_auth_redirect", redirectTo);
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(result.error.message ?? "Google sign-in failed.");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: redirectTo, replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <section className="container-page py-16 md:py-24">
        <div className="card-paper mx-auto max-w-md p-8 md:p-10">
          <p className="eyebrow">{mode === "signin" ? "Welcome back" : "Create account"}</p>
          <h1 className="mt-3 font-serif text-3xl font-bold">
            {mode === "signin" ? "Sign in" : "Join the Atelier"}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {mode === "signin"
              ? "Access your archetype, dashboard, and daily briefings."
              : "Save your archetype and receive personalized daily interventions."}
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-ink px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
          >
            <span>Continue with Google</span>
          </button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-ink-muted">
            <span className="h-px flex-1 bg-border" />
            <span>or email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="eyebrow mb-1 block">Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="How should we address you?"
                />
              </div>
            )}
            <div>
              <label className="eyebrow mb-1 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="At least 8 characters"
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-md bg-accent/10 px-3 py-2 text-sm text-ink">{notice}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-ink px-4 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-medium text-accent hover:underline"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-medium text-accent hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="mt-4 text-center text-xs text-ink-muted">
            <Link to="/" className="hover:text-accent">
              ← Back to home
            </Link>
          </p>
        </div>
      </section>
    </AppShell>
  );
}

function safeRedirect(input: string | undefined): string {
  if (!input) return "/dashboard";
  if (!input.startsWith("/") || input.startsWith("//")) return "/dashboard";
  return input;
}
