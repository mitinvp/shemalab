export type Bit = 0 | 1;

export function bit(v: boolean | number): Bit {
  return v ? 1 : 0;
}

export function not(a: Bit): Bit {
  return a ? 0 : 1;
}

export function and(a: Bit, b: Bit): Bit {
  return a && b ? 1 : 0;
}

export function or(a: Bit, b: Bit): Bit {
  return a || b ? 1 : 0;
}

export function nand(a: Bit, b: Bit): Bit {
  return not(and(a, b));
}

export function nor(a: Bit, b: Bit): Bit {
  return not(or(a, b));
}

export function xor(a: Bit, b: Bit): Bit {
  return a !== b ? 1 : 0;
}

export function xnor(a: Bit, b: Bit): Bit {
  return not(xor(a, b));
}

export type GateId = "AND" | "OR" | "NOT" | "NAND" | "NOR" | "XOR" | "XNOR";

export function evalGate(id: GateId, a: Bit, b: Bit): Bit {
  switch (id) {
    case "AND":
      return and(a, b);
    case "OR":
      return or(a, b);
    case "NOT":
      return not(a);
    case "NAND":
      return nand(a, b);
    case "NOR":
      return nor(a, b);
    case "XOR":
      return xor(a, b);
    case "XNOR":
      return xnor(a, b);
  }
}

export function intFromBits(bits: Bit[]): number {
  let acc = 0;
  for (const b of bits) acc = (acc << 1) | b;
  return acc;
}

export function bitsFromInt(n: number, width: number): Bit[] {
  const out: Bit[] = [];
  for (let i = width - 1; i >= 0; i--) out.push(bit((n >> i) & 1));
  return out;
}

export function toggleAt(bits: Bit[], index: number): Bit[] {
  return bits.map((b, i) => (i === index ? not(b) : b));
}

export function halfAdder(a: Bit, b: Bit): { s: Bit; c: Bit } {
  return { s: xor(a, b), c: and(a, b) };
}

export function fullAdder(a: Bit, b: Bit, cin: Bit): { s: Bit; cout: Bit } {
  const s = xor(xor(a, b), cin);
  const cout = or(or(and(a, b), and(a, cin)), and(b, cin));
  return { s, cout };
}

/** bits[0] is MSB. */
export function rippleAdd(
  a: Bit[],
  b: Bit[],
  cin: Bit = 0,
): { sum: Bit[]; cout: Bit } {
  const n = a.length;
  const sum: Bit[] = Array.from({ length: n }, () => 0);
  let c: Bit = cin;
  for (let i = n - 1; i >= 0; i--) {
    const fa = fullAdder(a[i] ?? 0, b[i] ?? 0, c);
    sum[i] = fa.s;
    c = fa.cout;
  }
  return { sum, cout: c };
}

/** sel[0] is MSB of the address. */
export function mux(inputs: Bit[], sel: Bit[]): Bit {
  let idx = 0;
  for (const s of sel) idx = (idx << 1) | s;
  return inputs[idx] ?? 0;
}

export function demux(data: Bit, sel: Bit[]): Bit[] {
  let idx = 0;
  for (const s of sel) idx = (idx << 1) | s;
  const n = 1 << sel.length;
  return Array.from({ length: n }, (_, i) => bit(i === idx && data === 1));
}

export function decoder(sel: Bit[], enable: Bit = 1): Bit[] {
  let idx = 0;
  for (const s of sel) idx = (idx << 1) | s;
  const n = 1 << sel.length;
  return Array.from({ length: n }, (_, i) => bit(enable === 1 && i === idx));
}

/**
 * Priority encoder. `inputs[i]` is Ii; highest i wins.
 * Returns binary code of the winner (MSB first) and GS (valid).
 */
export function priorityEncoder(inputs: Bit[]): { code: Bit[]; valid: Bit } {
  const width = Math.max(1, Math.ceil(Math.log2(inputs.length)));
  let idx = -1;
  for (let i = inputs.length - 1; i >= 0; i--) {
    if (inputs[i] === 1) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return { code: bitsFromInt(0, width), valid: 0 };
  return { code: bitsFromInt(idx, width), valid: 1 };
}

export function compare(
  a: Bit[],
  b: Bit[],
): { gt: Bit; eq: Bit; lt: Bit } {
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return { gt: 1, eq: 0, lt: 0 };
    if (av < bv) return { gt: 0, eq: 0, lt: 1 };
  }
  return { gt: 0, eq: 1, lt: 0 };
}

export type RsState = Bit | "X";

export function rsNor(q: Bit, s: Bit, r: Bit): RsState {
  if (s === 1 && r === 1) return "X";
  if (s === 1) return 1;
  if (r === 1) return 0;
  return q;
}

export function dNext(d: Bit): Bit {
  return d;
}

export function jkNext(q: Bit, j: Bit, k: Bit): Bit {
  if (j === 0 && k === 0) return q;
  if (j === 0 && k === 1) return 0;
  if (j === 1 && k === 0) return 1;
  return not(q);
}

export function tNext(q: Bit, t: Bit): Bit {
  return t === 1 ? not(q) : q;
}

export function shiftRight(bits: Bit[], serialIn: Bit): Bit[] {
  return [serialIn, ...bits.slice(0, -1)];
}

export function shiftLeft(bits: Bit[], serialIn: Bit): Bit[] {
  return [...bits.slice(1), serialIn];
}

export function countNext(
  value: number,
  width: number,
  up: boolean,
  enable: Bit,
  reset: Bit,
): number {
  const mod = 1 << width;
  if (reset === 1) return 0;
  if (enable === 0) return value & (mod - 1);
  const next = up ? value + 1 : value - 1;
  return ((next % mod) + mod) % mod;
}

export function bitsEqual(a: Bit[], b: Bit[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
