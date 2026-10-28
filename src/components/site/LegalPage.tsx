import type { ReactNode } from "react";
import { AppShell } from "@/components/site/AppShell";
import { LEGAL_IS_DRAFT, LEGAL_UPDATED } from "@/lib/legal";

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
  showDraftNotice = true,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  children: ReactNode;
  showDraftNotice?: boolean;
}) {
  return (
    <AppShell>
      <article className="container-page pt-20 pb-24 md:pt-28">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl font-bold leading-tight md:text-6xl">
          {title}
        </h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-ink-muted">
          Last updated {LEGAL_UPDATED}
        </p>
        {showDraftNotice && LEGAL_IS_DRAFT && (
          <p
            role="note"
            className="mt-6 max-w-3xl rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-ink-soft"
          >
            Draft: the operator's name and contact details have not been filled in yet.
          </p>
        )}
        <div className="mt-6 max-w-3xl text-lg text-ink-soft">{intro}</div>
        <div className="mt-4 max-w-3xl">{children}</div>
      </article>
    </AppShell>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-serif text-2xl font-bold">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-ink-soft [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}
