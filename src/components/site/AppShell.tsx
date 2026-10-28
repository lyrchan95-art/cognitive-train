import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/archetypes", label: "Archetypes" },
  { to: "/quiz", label: "Take the Quiz" },
  { to: "/pathways", label: "Pathways" },
  { to: "/research", label: "Research" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-page flex h-16 items-center justify-between gap-3 md:gap-6">
        <Link to="/" className="flex min-w-0 items-center gap-2" onClick={() => setOpen(false)}>
          <span className="truncate font-serif text-base font-bold tracking-tight sm:text-lg">
            The Cognitive Atelier
          </span>
          <span className="hidden shrink-0 rounded-full bg-ink px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-paper sm:inline">
            Beta
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-accent"
              activeProps={{ className: "text-accent" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <AuthAffordance />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="press grid h-10 w-10 place-items-center rounded-full border border-border text-ink md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="rise-in border-t border-border/70 bg-background/95 backdrop-blur md:hidden">
          <ul className="container-page flex flex-col py-2">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-3 text-base font-medium text-ink-soft transition-colors hover:bg-paper-dark/50 hover:text-accent"
                  activeProps={{ className: "text-accent" }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}


function AuthAffordance() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSignedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSignedIn(!!s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (signedIn) {
    return (
      <Link
        to="/dashboard"
        className="press rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-paper hover:opacity-90 sm:px-4"
      >
        Dashboard
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/auth"
        className="hidden text-sm font-medium text-ink-soft hover:text-accent sm:inline"
      >
        Sign in
      </Link>
      <Link
        to="/quiz"
        className="press rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground shadow-paper hover:scale-[1.02] sm:px-4"
      >
        <span className="sm:hidden">Quiz</span>
        <span className="hidden sm:inline">Find my archetype</span>
      </Link>
    </div>

  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-paper-dark/40">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-serif text-2xl font-bold">The Cognitive Atelier</p>
          <p className="mt-3 max-w-md text-sm text-ink-muted">
            A psychological operating system for the modern worker. Discover who you are,
            audit where you work, and receive daily interventions engineered for your mind.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            { to: "/archetypes", label: "Archetypes" },
            { to: "/quiz", label: "Take the Quiz" },
            { to: "/pricing", label: "Pricing" },
          ]}
        />
        <FooterCol
          title="Atelier"
          links={[
            { to: "/about", label: "Philosophy" },
            { to: "/research", label: "Research" },
            { to: "/", label: "Contact" },
          ]}
        />
      </div>
      <div className="container-page flex flex-col items-start justify-between gap-3 border-t border-border/60 py-6 text-xs text-ink-muted md:flex-row md:items-center">
        <p>© {new Date().getFullYear()} The Cognitive Atelier. All rights reserved.</p>
        <p className="font-mono uppercase tracking-widest">v1.0 — Foundation</p>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { to: string; label: string }[];
}) {
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      <ul className="space-y-2 text-sm">
        {links.map((l, i) => (
          <li key={i}>
            <Link to={l.to} className="text-ink-soft hover:text-accent">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
