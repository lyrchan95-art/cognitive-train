import { useEffect } from "react";
import type { ArticleFeedItem } from "@/lib/articles.functions";

/**
 * Beige reading pop-up: full article body on a paper background with ink text,
 * so photos never sit behind the words.
 */
export function ArticleReaderModal({
  article,
  onClose,
}: {
  article: ArticleFeedItem | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!article) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [article, onClose]);

  if (!article) return null;

  const paragraphs = (article.body ?? article.excerpt).split(/\n\n+/);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={article.title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="pop-in max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border-2 border-ink bg-paper text-ink shadow-lift sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {article.hero_image_url && (
          <div className="relative h-40 w-full overflow-hidden border-b-2 border-ink sm:h-52">
            <img
              src={article.hero_image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-6 sm:p-10">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
              {article.category} · {article.read_minutes} min read
            </p>
            <button
              onClick={onClose}
              aria-label="Close article"
              className="press grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-sm font-semibold text-ink hover:bg-ink hover:text-paper"
            >
              ✕
            </button>
          </div>

          <h2 className="mt-3 font-serif text-2xl font-bold leading-tight sm:text-3xl">
            {article.title}
          </h2>

          {article.tldr && (
            <p className="mt-4 border-l-2 border-accent pl-4 font-serif text-base italic leading-relaxed text-ink-soft">
              {article.tldr}
            </p>
          )}

          <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {article.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2 border-t border-border/60 pt-6">
              {article.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-ink-muted"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="press mt-8 w-full rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-paper hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
