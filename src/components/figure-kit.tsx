import type { ReactNode } from "react";

/** Theme colours (CSS variables) used by every figure. */
export const C = {
  fg: "var(--color-fg)",
  muted: "var(--color-muted)",
  sig: "var(--color-signal)",
  sigDim: "var(--color-signal-dim)",
  surf: "var(--color-surface-2)",
  border: "var(--color-border)",
  danger: "var(--color-danger)",
  accent: "var(--color-accent)",
};

export function Svg({
  w,
  h,
  label,
  children,
}: {
  w: number;
  h: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={label}
      className="mx-auto block h-auto w-full"
      style={{ maxWidth: w }}
      fontFamily="var(--font-sans)"
      fontSize={14}
    >
      <defs>
        <marker
          id="fk-arr"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10z" fill={C.fg} />
        </marker>
        <marker
          id="fk-arr-sig"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10z" fill={C.sig} />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

export function Txt({
  x,
  y,
  children,
  size = 14,
  anchor = "middle",
  fill = C.fg,
  weight,
  mono,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  anchor?: "start" | "middle" | "end";
  fill?: string;
  weight?: number;
  mono?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      textAnchor={anchor}
      fill={fill}
      fontWeight={weight}
      fontFamily={mono ? "var(--font-mono)" : undefined}
    >
      {children}
    </text>
  );
}

export function Ln({
  x1,
  y1,
  x2,
  y2,
  color = C.fg,
  w = 1.8,
  dash,
  arrow,
  both,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  w?: number;
  dash?: string;
  arrow?: boolean;
  both?: boolean;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={w}
      strokeDasharray={dash}
      strokeLinecap="round"
      markerEnd={arrow || both ? (color === C.sig ? "url(#fk-arr-sig)" : "url(#fk-arr)") : undefined}
      markerStart={both ? (color === C.sig ? "url(#fk-arr-sig)" : "url(#fk-arr)") : undefined}
    />
  );
}

/** Polyline through a list of [x, y] points. */
export function Pl({
  pts,
  color = C.fg,
  w = 1.8,
  dash,
  arrow,
}: {
  pts: [number, number][];
  color?: string;
  w?: number;
  dash?: string;
  arrow?: boolean;
}) {
  return (
    <polyline
      points={pts.map((p) => p.join(",")).join(" ")}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeDasharray={dash}
      strokeLinejoin="round"
      strokeLinecap="round"
      markerEnd={arrow ? (color === C.sig ? "url(#fk-arr-sig)" : "url(#fk-arr)") : undefined}
    />
  );
}

export function Dot({ x, y, color = C.fg }: { x: number; y: number; color?: string }) {
  return <circle cx={x} cy={y} r={3.5} fill={color} />;
}

export function Box({
  x,
  y,
  w,
  h,
  label,
  sub,
  hot,
  size = 14,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: ReactNode;
  sub?: ReactNode;
  hot?: boolean;
  size?: number;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill={hot ? C.sigDim : C.surf}
        stroke={hot ? C.sig : C.fg}
        strokeWidth={1.8}
      />
      {label !== undefined ? (
        <Txt x={x + w / 2} y={y + h / 2 + (sub ? -3 : 5)} size={size} weight={600}>
          {label}
        </Txt>
      ) : null}
      {sub ? (
        <Txt x={x + w / 2} y={y + h / 2 + 15} size={12} fill={C.muted}>
          {sub}
        </Txt>
      ) : null}
    </g>
  );
}

export type GateType = "and" | "or" | "not" | "nand" | "nor" | "xor" | "xnor";

/** Input/output pin offsets of a gate relative to its top-left corner. */
export function gatePorts(type: GateType): { ins: [number, number][]; out: [number, number] } {
  if (type === "not") return { ins: [[0, 20]], out: [48, 20] };
  const bubble = type === "nand" || type === "nor" || type === "xnor";
  return { ins: [[0, 10], [0, 30]], out: [bubble ? 56 : 48, 20] };
}

/** Draws a gate with its top-left corner at (x, y); body is 48×40 px. */
export function Gate({ type, x, y, hot }: { type: GateType; x: number; y: number; hot?: boolean }) {
  const stroke = hot ? C.sig : C.fg;
  const common = { fill: C.surf, stroke, strokeWidth: 1.8, strokeLinejoin: "round" as const };
  let body: ReactNode;
  if (type === "and" || type === "nand") {
    body = <path d="M0 0H26A22 20 0 0 1 26 40H0Z" {...common} />;
  } else if (type === "or" || type === "nor" || type === "xor" || type === "xnor") {
    body = <path d="M0 0Q26 0 48 20Q26 40 0 40Q12 20 0 0Z" {...common} />;
  } else {
    body = <path d="M0 0L40 20L0 40Z" {...common} />;
  }
  const bubbleX = type === "not" ? 44 : 52;
  const hasBubble = type === "not" || type === "nand" || type === "nor" || type === "xnor";
  return (
    <g transform={`translate(${x} ${y})`}>
      {body}
      {type === "xor" || type === "xnor" ? (
        <path d="M-7 0Q5 20 -7 40" fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      ) : null}
      {hasBubble ? <circle cx={bubbleX} cy={20} r={4} fill={C.surf} stroke={stroke} strokeWidth={1.8} /> : null}
    </g>
  );
}

/** D / T / JK style flip-flop box with a clock triangle. Returns pin positions via props. */
export function FFBox({
  x,
  y,
  w = 80,
  h = 80,
  left,
  right,
  clockY,
  title,
  hot,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  left: { label: string; y: number }[];
  right: { label: string; y: number }[];
  clockY: number;
  title?: string;
  hot?: boolean;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={hot ? C.sigDim : C.surf} stroke={hot ? C.sig : C.fg} strokeWidth={1.8} />
      {left.map((p) => (
        <Txt key={p.label + p.y} x={x + 8} y={p.y + 5} anchor="start" size={13} weight={600}>
          {p.label}
        </Txt>
      ))}
      <path d={`M${x} ${clockY - 8}L${x + 12} ${clockY}L${x} ${clockY + 8}`} fill="none" stroke={C.fg} strokeWidth={1.8} />
      {right.map((p) => (
        <Txt key={p.label + p.y} x={x + w - 8} y={p.y + 5} anchor="end" size={13} weight={600}>
          {p.label}
        </Txt>
      ))}
      {title ? (
        <Txt x={x + w / 2} y={y - 8} size={13} fill={C.muted}>
          {title}
        </Txt>
      ) : null}
    </g>
  );
}
