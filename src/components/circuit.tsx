import { Play } from "lucide-react";
import type { ReactNode } from "react";
import type { Bit } from "@/lib/digital";
import { intFromBits } from "@/lib/digital";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

export function Led({
  on,
  label,
  size = "md",
}: {
  on: boolean;
  label?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {label ? (
        <span className="font-mono text-xs text-muted">{label}</span>
      ) : null}
      <div
        className={cn(
          "grid place-items-center rounded-full border font-mono tabular-nums transition-[background-color,box-shadow,color,border-color] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
          size === "md" ? "size-8 text-xs" : "size-6 text-[10px]",
          on
            ? "border-signal bg-signal text-accent-fg shadow-[var(--shadow-signal)]"
            : "border-border bg-signal-dim text-muted",
        )}
      >
        {on ? 1 : 0}
      </div>
    </div>
  );
}

export function BitSwitch({
  value,
  onToggle,
  label,
  disabled,
}: {
  value: Bit;
  onToggle?: () => void;
  label?: string;
  disabled?: boolean;
}) {
  const interactive = Boolean(onToggle) && !disabled;
  return (
    <div className="flex flex-col items-center gap-1">
      {label ? (
        <span className="font-mono text-xs text-muted">{label}</span>
      ) : null}
      <button
        type="button"
        disabled={!interactive}
        onClick={onToggle}
        aria-pressed={value === 1}
        className={cn(
          "flex size-11 min-h-11 flex-col justify-between rounded-sm p-1 font-mono text-[10px] tabular-nums transition-[background-color,box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
          value === 1
            ? "bg-signal text-accent-fg shadow-[var(--shadow-signal)]"
            : "bg-surface-2 text-muted shadow-[var(--shadow-border)]",
          interactive
            ? "hover:shadow-[var(--shadow-border-hover)]"
            : "cursor-default opacity-90",
        )}
      >
        <span className={cn("leading-none", value === 1 ? "opacity-100" : "opacity-30")}>
          1
        </span>
        <span className={cn("leading-none", value === 0 ? "opacity-100" : "opacity-30")}>
          0
        </span>
      </button>
    </div>
  );
}

export function BitWord({
  bits,
  onToggle,
  labels,
  readOnly,
  showDecimal = true,
}: {
  bits: Bit[];
  onToggle?: (index: number) => void;
  labels?: string[];
  readOnly?: boolean;
  showDecimal?: boolean;
}) {
  const n = bits.length;
  return (
    <div className="flex flex-wrap items-end gap-2">
      {bits.map((b, i) => (
        <BitSwitch
          key={i}
          value={b}
          label={labels?.[i] ?? `b${n - 1 - i}`}
          onToggle={readOnly ? undefined : () => onToggle?.(i)}
          disabled={readOnly}
        />
      ))}
      {showDecimal ? (
        <div className="mb-1 ml-1 font-mono text-sm tabular-nums text-muted">
          = {intFromBits(bits)}
          <span className="text-subtle">₁₀</span>
        </div>
      ) : null}
    </div>
  );
}

export function ClockBar({
  onPulse,
  hint,
}: {
  onPulse: () => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={onPulse} className="min-w-40">
        <Play className="size-4" />
        Імпульс CLK
      </Button>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
        className,
      )}
    >
      {title ? (
        <h3 className="mb-3 text-sm font-medium text-muted">{title}</h3>
      ) : null}
      {children}
    </section>
  );
}

export function DipChip({
  name,
  part,
  left,
  right,
}: {
  name: string;
  part: string;
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="flex items-stretch justify-center gap-0 overflow-x-auto py-2">
      <div className="flex flex-col justify-center gap-3 pr-2">{left}</div>
      <div className="relative min-w-40 rounded-md bg-surface-2 px-6 py-8 text-center shadow-[var(--shadow-border),var(--shadow-inset)]">
        <div className="absolute left-1/2 top-0 h-2.5 w-10 -translate-x-1/2 -translate-y-px rounded-b-full bg-bg shadow-[var(--shadow-border)]" />
        <div className="font-mono text-[10px] tracking-[0.18em] text-subtle uppercase">
          {part}
        </div>
        <div className="mt-2 font-display text-lg text-fg">{name}</div>
      </div>
      <div className="flex flex-col justify-center gap-3 pl-2">{right}</div>
    </div>
  );
}

export function TruthTable({
  headers,
  rows,
  activeRow,
}: {
  headers: string[];
  rows: (string | number)[][];
  activeRow?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-56 border-collapse text-center font-mono text-sm tabular-nums">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="border-b border-border px-3 py-2 text-xs font-medium text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                "transition-colors duration-[var(--motion-quick)]",
                activeRow === i ? "bg-signal-dim text-signal" : "text-fg",
              )}
            >
              {row.map((cell, j) => (
                <td key={j} className="border-b border-border/60 px-3 py-1.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Waveform({
  samples,
  label,
}: {
  samples: Bit[];
  label: string;
}) {
  const w = 240;
  const h = 36;
  const n = Math.max(samples.length, 1);
  const step = w / n;
  const y = (b: Bit) => (b === 1 ? 8 : 28);
  const d = samples
    .map((b, i) => {
      const x0 = i * step;
      const x1 = (i + 1) * step;
      const yy = y(b);
      if (i === 0) return `M ${x0} ${yy} L ${x1} ${yy}`;
      const prev = y(samples[i - 1] ?? 0);
      return `L ${x0} ${prev} L ${x0} ${yy} L ${x1} ${yy}`;
    })
    .join(" ");
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 font-mono text-xs text-muted">{label}</span>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-9 w-full max-w-xs text-signal"
        aria-hidden
      >
        <path
          d={d || `M 0 28 L ${w} 28`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    </div>
  );
}

export function ModeRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 min-h-10 rounded-sm px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
        active
          ? "bg-accent text-accent-fg"
          : "bg-surface-2 text-muted shadow-[var(--shadow-border)] hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

export function GateGlyph({
  kind,
  invert,
}: {
  kind: "and" | "or" | "xor" | "not";
  invert?: boolean;
}) {
  return (
    <svg viewBox="0 0 88 56" className="h-16 w-24 text-fg" aria-hidden>
      {kind === "and" ? (
        <path
          d="M16 8 H44 Q72 8 72 28 Q72 48 44 48 H16 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      ) : null}
      {kind === "or" ? (
        <path
          d="M18 8 Q40 8 72 28 Q40 48 18 48 Q28 28 18 8 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      ) : null}
      {kind === "xor" ? (
        <>
          <path
            d="M12 8 Q22 28 12 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M22 8 Q44 8 76 28 Q44 48 22 48 Q32 28 22 8 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </>
      ) : null}
      {kind === "not" ? (
        <path
          d="M18 8 L70 28 L18 48 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      ) : null}
      {invert ? (
        <circle
          cx="80"
          cy="28"
          r="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      ) : null}
    </svg>
  );
}
