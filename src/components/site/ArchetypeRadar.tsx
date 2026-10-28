import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DIMENSION_LABELS, type Dimension } from "@/lib/quiz";

const KEYS: Dimension[] = ["C", "O", "N", "S", "A", "D"];

export function ArchetypeRadar({
  scores,
  signature,
  signatureName,
  confidence,
}: {
  scores: Record<string, number>;
  signature?: Record<string, number> | null;
  signatureName?: string;
  confidence?: number;
}) {
  const data = KEYS.map((k) => ({
    key: k,
    label: DIMENSION_LABELS[k],
    you: Number((scores[k] ?? 0).toFixed(2)),
    ...(signature ? { sig: Number((signature[k] ?? 0).toFixed(2)) } : {}),
  }));

  return (
    <div className="card-paper p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Archetype radar</p>
          <p className="mt-1 text-xs text-ink-muted">
            Your six-dimension profile{signatureName ? ` vs. the ${signatureName} signature` : ""}
          </p>
        </div>
        {confidence != null && (
          <span className="shrink-0 rounded bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>

      <div className="mt-3 h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="currentColor" className="text-border" />
            <PolarAngleAxis
              dataKey="key"
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-ink-muted"
            />
            <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
            {signature && (
              <Radar
                name={signatureName ?? "Signature"}
                dataKey="sig"
                stroke="var(--color-ink)"
                strokeDasharray="4 3"
                fill="var(--color-ink)"
                fillOpacity={0.08}
              />
            )}
            <Radar
              name="Your profile"
              dataKey="you"
              stroke="var(--color-accent)"
              fill="var(--color-accent)"
              fillOpacity={0.22}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
        {data.map((d) => (
          <li key={d.key} className="flex justify-between">
            <span>
              {d.key} · {d.label}
            </span>
            <span className="text-ink">{d.you.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
