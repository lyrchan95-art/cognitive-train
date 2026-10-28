import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Panel({ title, eyebrow, action, children, className = "" }: { title?: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card-paper p-4 sm:p-6 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2 className="font-serif text-xl font-bold sm:text-2xl">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Metric({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-paper-dark/30 p-3 sm:p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value ?? "—"}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong/60 p-8 text-center">
      <p className="font-serif text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p className="font-semibold text-destructive">Something went wrong</p>
      <p className="mt-1 font-mono text-xs text-ink-soft break-words">{message}</p>
      {retry && <button onClick={retry} className="mt-3 text-sm font-medium text-accent">Try again</button>}
    </div>
  );
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="h-10 rounded-md bg-paper-dark/60" style={{ width: `${100 - (i % 3) * 12}%` }} />)}
    </div>
  );
}

export function Btn({ children, variant = "primary", className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "outline" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all press disabled:opacity-50 disabled:cursor-not-allowed";
  const v = {
    primary: "bg-ink text-paper hover:bg-ink-soft",
    ghost: "text-ink-muted hover:text-ink",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90",
    outline: "border border-border-strong text-ink hover:bg-paper-dark/50",
  }[variant];
  return <button className={`${base} ${v} ${className}`} {...rest}>{children}</button>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "accent" }) {
  const t = {
    neutral: "bg-paper-dark/60 text-ink-soft",
    good: "bg-chart-4/15 text-ink",
    warn: "bg-accent-gold/20 text-ink",
    bad: "bg-destructive/10 text-destructive",
    accent: "bg-accent/10 text-accent",
  }[tone];
  return <span className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${t}`}>{children}</span>;
}

export const inputCls = "w-full rounded-md border border-border bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

export function SubNav({ items }: { items: { to: string; label: string; exact?: boolean }[] }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="-mx-1 mb-6 flex gap-1 overflow-x-auto pb-1">
      {items.map((t) => {
        const active = t.exact ? path === t.to : path.startsWith(t.to);
        return (
          <Link key={t.to} to={t.to} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${active ? "bg-ink text-paper" : "bg-paper-dark/50 text-ink-muted hover:text-ink"}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === "done" ? "good" : status === "failed" ? "bad" : status === "empty" ? "warn" : status === "running" || status === "queued" ? "accent" : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}

export function downloadText(filename: string, body: string, mime = "text/plain") {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function toCsv(columns: string[], rows: (string | number | null | boolean | undefined)[][]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

/** Serialise an SVG chart node to PNG and download it. */
export async function downloadSvgAsPng(container: HTMLElement | null, filename: string) {
  const svg = container?.querySelector("svg");
  if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  const { width, height } = svg.getBoundingClientRect();
  const img = new Image();
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const canvas = document.createElement("canvas");
  canvas.width = width * 2; canvas.height = height * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--paper") || "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(2, 2); ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png"); a.download = filename; a.click();
}

export const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
