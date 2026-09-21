/**
 * Per-student task variants.
 *
 * The original `tasks.ts` ships 5 fixed tasks per topic — identical for every
 * student, which does not scale to a ~25-person group (everyone sees the same
 * numbers and can trade answers). This module generates an effectively
 * unlimited number of numeric variants per topic instead: the question is
 * built from randomized operands, and the correct answer is computed with the
 * SAME pure functions the simulator uses (`@/lib/digital`), not hand-typed —
 * so correctness can't drift from the sim.
 *
 * Determinism: `generateTask(topic, slot, seed)` is a pure function of its
 * inputs (seed is normally the signed-in user id, or `${userId}:${salt}` for
 * a fresh exam attempt). Same inputs -> same task, every time, on every
 * device — no storage needed to know what a student is looking at, and the
 * server can independently recompute the task to grade an answer, so a
 * tampered client-side "correct" flag can't be trusted or needed.
 */
import {
  and,
  bitsFromInt,
  compare,
  decoder,
  demux,
  dNext,
  intFromBits,
  jkNext,
  mux,
  nand,
  nor,
  or,
  priorityEncoder,
  rippleAdd,
  shiftLeft,
  shiftRight,
  tNext,
  xnor,
  xor,
  type Bit,
} from "./digital";
import { TOPIC_IDS, type TopicId } from "./topics";
import type { Task } from "./tasks";

/** Generated variants per topic. Matches `TASKS_PER_TOPIC` used for the UI counter. */
export const GENERATED_TASKS_PER_TOPIC = 8;

// ── Seeded PRNG ──────────────────────────────────────────────────────────
// mulberry32, seeded from a string hash (xmur3-ish). Deterministic across
// JS engines/platforms — no Math.random, no Date, no crypto.

function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const randBit = (rng: Rng): Bit => (rng() < 0.5 ? 0 : 1);
const randBits = (rng: Rng, n: number): Bit[] =>
  Array.from({ length: n }, () => randBit(rng));
const pick = <T>(rng: Rng, arr: readonly T[]): T =>
  arr[Math.floor(rng() * arr.length)] as T;
const fmt = (bits: Bit[]): string => bits.join("");

type GateId = "AND" | "OR" | "NAND" | "NOR" | "XOR" | "XNOR";
const GATES: readonly GateId[] = ["AND", "OR", "NAND", "NOR", "XOR", "XNOR"];
function evalGate(id: GateId, a: Bit, b: Bit): Bit {
  switch (id) {
    case "AND":
      return and(a, b);
    case "OR":
      return or(a, b);
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

type Variant = Omit<Task, "id" | "topic">;
type Gen = (rng: Rng) => Variant;

const GENERATORS: Record<TopicId, Gen> = {
  gates: (rng) => {
    const g = pick(rng, GATES);
    const a = randBit(rng);
    const b = randBit(rng);
    const y = evalGate(g, a, b);
    return {
      kind: "bits",
      question: `Обчисліть вихід елемента ${g} для A=${a}, B=${b}.`,
      labels: ["Y"],
      correct: [y],
      explain: `${g}(${a}, ${b}) = ${y}.`,
    };
  },

  flipflops: (rng) => {
    const kind = pick(rng, ["D", "JK", "T"] as const);
    const q = randBit(rng);
    if (kind === "D") {
      const d = randBit(rng);
      const next = dNext(d);
      return {
        kind: "bits",
        question: `D-тригер: поточний Q=${q}, D=${d}. Чому дорівнює Q⁺ по фронту CLK?`,
        labels: ["Q⁺"],
        correct: [next],
        explain: `У D-тригера Q⁺ = D = ${next}.`,
      };
    }
    if (kind === "JK") {
      const j = randBit(rng);
      const k = randBit(rng);
      const next = jkNext(q, j, k);
      return {
        kind: "bits",
        question: `JK-тригер: Q=${q}, J=${j}, K=${k}. Чому дорівнює Q⁺ по фронту CLK?`,
        labels: ["Q⁺"],
        correct: [next],
        explain: `J=${j}, K=${k} з Q=${q} → Q⁺=${next}.`,
      };
    }
    const t = randBit(rng);
    const next = tNext(q, t);
    return {
      kind: "bits",
      question: `T-тригер: Q=${q}, T=${t}. Чому дорівнює Q⁺ по фронту CLK?`,
      labels: ["Q⁺"],
      correct: [next],
      explain: `Q⁺ = Q⊕T = ${next}.`,
    };
  },

  registers: (rng) => {
    const q = randBits(rng, 4);
    const shr = rng() < 0.5;
    const si = randBit(rng);
    const next = shr ? shiftRight(q, si) : shiftLeft(q, si);
    return {
      kind: "bits",
      question: `Зсувний регістр Q3Q2Q1Q0=${fmt(q)}, режим ${shr ? "SHR (управо)" : "SHL (уліво)"}, SI=${si}. Стан після одного такту?`,
      labels: ["Q3", "Q2", "Q1", "Q0"],
      correct: next,
      explain: `${shr ? "Зсув управо" : "Зсув уліво"} на один розряд: ${fmt(q)} → ${fmt(next)}.`,
    };
  },

  counters: (rng) => {
    const value = Math.floor(rng() * 16);
    const up = rng() < 0.5;
    const enable: Bit = rng() < 0.85 ? 1 : 0;
    const reset: Bit = enable === 1 && rng() < 0.15 ? 1 : 0;
    const next = countNextSafe(value, up, enable, reset);
    return {
      kind: "bits",
      question: `4-бітовий лічильник Q=${fmt(bitsFromInt(value, 4))}, напрям ${up ? "UP" : "DOWN"}, Enable=${enable}, Reset=${reset}. Стан Q3…Q0 після такту?`,
      labels: ["Q3", "Q2", "Q1", "Q0"],
      correct: bitsFromInt(next, 4),
      explain: reset
        ? "Reset=1 має пріоритет і обнуляє лічильник."
        : enable
          ? `Enable=1: рахунок ${up ? "+1" : "−1"} за модулем 16 → ${fmt(bitsFromInt(next, 4))}.`
          : `Enable=0: стан не змінюється (${fmt(bitsFromInt(next, 4))}).`,
    };
  },

  encoders: (rng) => {
    const inputs = randBits(rng, 8);
    const { code, valid } = priorityEncoder(inputs);
    return {
      kind: "bits",
      question: `Пріоритетний шифратор 8→3, входи I7…I0 = ${fmt(inputs)}. Визначте код Y2Y1Y0 і сигнал GS.`,
      labels: ["Y2", "Y1", "Y0", "GS"],
      correct: [...code, valid],
      explain: valid
        ? `Найстарший одиничний вхід визначає код; GS=1.`
        : `Усі входи нульові → код 000, GS=0.`,
    };
  },

  decoders: (rng) => {
    const sel = randBits(rng, 2);
    const enable: Bit = rng() < 0.8 ? 1 : 0;
    const out = decoder(sel, enable);
    return {
      kind: "bits",
      question: `Дешифратор 2→4, адреса A1A0=${fmt(sel)}, E=${enable}. Визначте Y0 Y1 Y2 Y3.`,
      labels: ["Y0", "Y1", "Y2", "Y3"],
      correct: out,
      explain: enable
        ? `E=1: активним стає лише Y${intFromBits(sel)}.`
        : `E=0 гасить усі виходи незалежно від адреси.`,
    };
  },

  comparators: (rng) => {
    const a = randBits(rng, 4);
    const b = randBits(rng, 4);
    const { gt, eq, lt } = compare(a, b);
    return {
      kind: "bits",
      question: `Порівняйте A=${fmt(a)} і B=${fmt(b)} (беззнакові 4-бітові числа). Визначте прапорці A>B, A=B, A<B.`,
      labels: ["A>B", "A=B", "A<B"],
      correct: [gt, eq, lt],
      explain: `${intFromBits(a)} проти ${intFromBits(b)}.`,
    };
  },

  adders: (rng) => {
    const a = randBits(rng, 4);
    const b = randBits(rng, 4);
    const cin = randBit(rng);
    const { sum, cout } = rippleAdd(a, b, cin);
    return {
      kind: "bits",
      question: `4-бітовий суматор: A=${fmt(a)}, B=${fmt(b)}, Cin=${cin}. Визначте S3…S0 і Cout.`,
      labels: ["S3", "S2", "S1", "S0", "Cout"],
      correct: [...sum, cout],
      explain: `${intFromBits(a)} + ${intFromBits(b)} + ${cin} = ${intFromBits(a) + intFromBits(b) + cin}.`,
    };
  },

  mux: (rng) => {
    const inputs = randBits(rng, 4);
    const sel = randBits(rng, 2);
    const y = mux(inputs, sel);
    return {
      kind: "bits",
      question: `Мультиплексор 4:1, I0I1I2I3=${fmt(inputs)}, S1S0=${fmt(sel)}. Чому дорівнює Y?`,
      labels: ["Y"],
      correct: [y],
      explain: `Адреса S=${intFromBits(sel)} обирає I${intFromBits(sel)}=${inputs[intFromBits(sel)]}.`,
    };
  },

  demux: (rng) => {
    const d = randBit(rng);
    const sel = randBits(rng, 2);
    const out = demux(d, sel);
    return {
      kind: "bits",
      question: `Демультиплексор 1:4, D=${d}, S1S0=${fmt(sel)}. Визначте Y0 Y1 Y2 Y3.`,
      labels: ["Y0", "Y1", "Y2", "Y3"],
      correct: out,
      explain: d
        ? `Дані D=1 проходять лише на Y${intFromBits(sel)}.`
        : `D=0 — усі виходи нульові незалежно від адреси.`,
    };
  },
};

/** `countNext` treats reset/enable priority the same way the simulator does. */
function countNextSafe(value: number, up: boolean, enable: Bit, reset: Bit): number {
  if (reset === 1) return 0;
  if (enable === 0) return value & 0b1111;
  const next = up ? value + 1 : value - 1;
  return ((next % 16) + 16) % 16;
}

function taskId(topic: TopicId, slot: number, seed: string): string {
  return `${topic}-${slot}-${hashSeed(`${seed}:${topic}:${slot}`).toString(36)}`;
}

/** Deterministic task for one (topic, slot) pair under `seed` (normally the user id). */
export function generateTask(topic: TopicId, slot: number, seed: string): Task {
  const rng = mulberry32(hashSeed(`${seed}:${topic}:${slot}`));
  // Spreading a `Variant` union here loses the discriminant across the
  // object literal (a TS limitation, not a runtime issue) — every generator
  // above always returns a `kind: "bits"` shape, so the cast is safe.
  return { id: taskId(topic, slot, seed), topic, ...GENERATORS[topic](rng) } as Task;
}

/** All `GENERATED_TASKS_PER_TOPIC` variants for one topic, under `seed`. */
export function generateTopicTasks(
  topic: TopicId,
  seed: string,
  count: number = GENERATED_TASKS_PER_TOPIC,
): Task[] {
  return Array.from({ length: count }, (_, slot) => generateTask(topic, slot, seed));
}

/**
 * One task per topic (the "Контрольна"). `attemptSalt` lets a student get a
 * fresh set on retake while keeping everything else deterministic/gradeable.
 */
export function generateExamSet(seed: string, attemptSalt: string): Task[] {
  const combinedSeed = `${seed}#${attemptSalt}`;
  return TOPIC_IDS.map((topic) => generateTask(topic, 0, combinedSeed));
}
