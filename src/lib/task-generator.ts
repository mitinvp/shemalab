/**
 * Per-student task variants.
 *
 * The original `tasks.ts` ships 5 fixed tasks per topic — identical for every
 * student, which does not scale to a ~25-person group (everyone sees the same
 * numbers and can trade answers). This module generates an effectively
 * unlimited number of variants per topic instead, cycling through several
 * DIFFERENT question templates per topic (not just different numbers in the
 * same template) — the operands are randomized and the correct answer is
 * computed with the SAME pure functions the simulator uses (`@/lib/digital`),
 * never hand-typed, so correctness can't drift from the sim.
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
  halfAdder,
  intFromBits,
  jkNext,
  mux,
  nand,
  nor,
  or,
  priorityEncoder,
  rippleAdd,
  rsNor,
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
const pick = <T>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)] as T;
const fmt = (bits: Bit[]): string => bits.join("");

/** Fisher–Yates shuffle of `[correctText, ...distractors]`, seeded by `rng`. */
function mcqFrom(
  rng: Rng,
  correctText: string,
  distractors: readonly string[],
): { options: string[]; correct: number } {
  const options = [correctText, ...distractors];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = options[i]!;
    options[i] = options[j]!;
    options[j] = tmp;
  }
  return { options, correct: options.indexOf(correctText) };
}

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
function truthRow(g: GateId): string {
  return `${evalGate(g, 0, 0)}${evalGate(g, 0, 1)}${evalGate(g, 1, 0)}${evalGate(g, 1, 1)}`;
}

type Variant = Omit<Task, "id" | "topic">;
type Gen = (rng: Rng) => Variant;

/** `countNext` treats reset/enable priority the same way the simulator does. */
function countNextSafe(value: number, up: boolean, enable: Bit, reset: Bit): number {
  if (reset === 1) return 0;
  if (enable === 0) return value & 0b1111;
  const next = up ? value + 1 : value - 1;
  return ((next % 16) + 16) % 16;
}

// Each topic has several DIFFERENT question templates (not just different
// numbers plugged into one template). `generateTask` cycles through them by
// slot index, so across the 8 slots a student sees a genuine mix of formats.
const GENERATORS: Record<TopicId, readonly Gen[]> = {
  gates: [
    // T0 — evaluate one gate for one input combination.
    (rng) => {
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
    // T1 — identify the gate from its truth table.
    (rng) => {
      const g = pick(rng, GATES);
      const table = truthRow(g);
      const others = GATES.filter((x) => x !== g);
      const shuffled = [...others];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = shuffled[i]!;
        shuffled[i] = shuffled[j]!;
        shuffled[j] = tmp;
      }
      const { options, correct } = mcqFrom(rng, g, shuffled.slice(0, 3));
      return {
        kind: "mcq",
        question: `Для входів AB=00,01,10,11 елемент дає вихід ${table}. Який це логічний елемент?`,
        options,
        correct,
        explain: `${g}: для AB=00,01,10,11 виходи ${table}.`,
      };
    },
    // T2 — full truth table of one gate.
    (rng) => {
      const g = pick(rng, GATES);
      const y00 = evalGate(g, 0, 0);
      const y01 = evalGate(g, 0, 1);
      const y10 = evalGate(g, 1, 0);
      const y11 = evalGate(g, 1, 1);
      return {
        kind: "bits",
        question: `Заповніть вихід елемента ${g} для всіх комбінацій AB: 00, 01, 10, 11.`,
        labels: ["Y(00)", "Y(01)", "Y(10)", "Y(11)"],
        correct: [y00, y01, y10, y11],
        explain: `${g}: ${y00}${y01}${y10}${y11}.`,
      };
    },
  ],

  flipflops: [
    // T0 — one clock edge on D, JK, or T.
    (rng) => {
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
    // T1 — identify the type from its characteristic equation.
    (rng) => {
      const formulas = { D: "Q⁺ = D", T: "Q⁺ = Q⊕T", JK: "Q⁺ = J·Q̄ + K̄·Q" } as const;
      const kind = pick(rng, ["D", "T", "JK"] as const);
      const others = (Object.keys(formulas) as (keyof typeof formulas)[]).filter(
        (k) => k !== kind,
      );
      const { options, correct } = mcqFrom(
        rng,
        formulas[kind],
        others.map((k) => formulas[k]),
      );
      return {
        kind: "mcq",
        question: `Яке характеристичне рівняння відповідає ${kind}-тригеру?`,
        options,
        correct,
        explain: `${kind}-тригер: ${formulas[kind]}.`,
      };
    },
    // T2 — RS-latch (NOR-based), excluding the forbidden S=R=1 combination.
    (rng) => {
      const q = randBit(rng);
      let s: Bit, r: Bit;
      do {
        s = randBit(rng);
        r = randBit(rng);
      } while (s === 1 && r === 1);
      const next = rsNor(q, s, r) as Bit;
      return {
        kind: "bits",
        question: `RS-тригер (на NOR): Q=${q}, S=${s}, R=${r}. Чому дорівнює Q⁺?`,
        labels: ["Q⁺"],
        correct: [next],
        explain:
          s === 1
            ? "S=1, R=0 → встановлення: Q⁺=1."
            : r === 1
              ? "S=0, R=1 → скидання: Q⁺=0."
              : "S=R=0 → стан зберігається.",
      };
    },
  ],

  registers: [
    // T0 — shift register, one clock.
    (rng) => {
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
    // T1 — parallel-load register.
    (rng) => {
      const oldQ = randBits(rng, 4);
      const d = randBits(rng, 4);
      const load = randBit(rng);
      const next = load ? d : oldQ;
      return {
        kind: "bits",
        question: `Регістр із паралельним записом: Q=${fmt(oldQ)}, вхід D3D2D1D0=${fmt(d)}, Load=${load}. Стан після такту?`,
        labels: ["Q3", "Q2", "Q1", "Q0"],
        correct: next,
        explain: load
          ? `Load=1: регістр приймає D → ${fmt(d)}.`
          : `Load=0: попередній стан зберігається → ${fmt(oldQ)}.`,
      };
    },
    // T2 — conceptual: clocks to fully fill a SIPO register.
    (rng) => {
      const width = pick(rng, [4, 8] as const);
      const { options, correct } = mcqFrom(
        rng,
        `${width}`,
        [`${width / 2}`, `${width * 2}`, "1"],
      );
      return {
        kind: "mcq",
        question: `Скільки тактів потрібно ${width}-розрядному послідовному (SIPO) регістру, щоб повністю заповнитися новими даними?`,
        options,
        correct,
        explain: `Кожен такт зсуває дані на один розряд — для ${width} розрядів потрібно ${width} тактів.`,
      };
    },
  ],

  counters: [
    // T0 — one clock (UP/DOWN, Enable, Reset).
    (rng) => {
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
    // T1 — three clocks in a row (Enable held at 1, Reset held at 0).
    (rng) => {
      const value = Math.floor(rng() * 16);
      const up = rng() < 0.5;
      let v = value;
      for (let i = 0; i < 3; i++) v = countNextSafe(v, up, 1, 0);
      return {
        kind: "bits",
        question: `4-бітовий лічильник стартує з Q=${fmt(bitsFromInt(value, 4))}, режим ${up ? "UP" : "DOWN"}, Enable=1 постійно. Яким буде стан Q3…Q0 через 3 такти?`,
        labels: ["Q3", "Q2", "Q1", "Q0"],
        correct: bitsFromInt(v, 4),
        explain: `Три послідовні кроки ${up ? "+1" : "−1"} за модулем 16, починаючи з ${value}: результат ${fmt(bitsFromInt(v, 4))}.`,
      };
    },
    // T2 — conceptual: number of states in an N-bit counter.
    (rng) => {
      const width = pick(rng, [3, 4, 5] as const);
      const correctVal = 1 << width;
      const { options, correct } = mcqFrom(
        rng,
        `${correctVal}`,
        [`${correctVal / 2}`, `${correctVal * 2}`, `${width}`],
      );
      return {
        kind: "mcq",
        question: `Скільки різних станів має ${width}-розрядний двійковий лічильник?`,
        options,
        correct,
        explain: `${width}-розрядний лічильник має 2^${width} = ${correctVal} станів.`,
      };
    },
  ],

  encoders: [
    // T0 — full 8→3 priority encoder.
    (rng) => {
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
    // T1 — conceptual: which of two simultaneously-active inputs wins.
    (rng) => {
      const i = Math.floor(rng() * 8);
      let j = Math.floor(rng() * 8);
      while (j === i) j = Math.floor(rng() * 8);
      const winner = Math.max(i, j);
      const loser = Math.min(i, j);
      const { options, correct } = mcqFrom(rng, `I${winner}`, [
        `I${loser}`,
        "Обидва одночасно",
        "Жоден (невизначено)",
      ]);
      return {
        kind: "mcq",
        question: `У пріоритетному шифраторі одночасно активні входи I${i} та I${j}. Який вхід визначає код на виході?`,
        options,
        correct,
        explain: `Пріоритет має старший вхід: I${winner}.`,
      };
    },
    // T2 — simple (single active input, no priority contention) encoder.
    (rng) => {
      const active = Math.floor(rng() * 8);
      const inputs = bitsFromInt(0, 8).map((_, i) => (i === 7 - active ? 1 : 0)) as Bit[];
      const { code } = priorityEncoder(inputs);
      return {
        kind: "bits",
        question: `Простий шифратор 8→3: активний лише вхід I${active}, решта нульові. Визначте код Y2Y1Y0.`,
        labels: ["Y2", "Y1", "Y0"],
        correct: code,
        explain: `Єдиний активний вхід I${active} дає код ${fmt(code)} (двійковий запис числа ${active}).`,
      };
    },
  ],

  decoders: [
    // T0 — 2-to-4 decoder with enable.
    (rng) => {
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
    // T1 — conceptual: outputs vs address lines.
    (rng) => {
      const n = pick(rng, [2, 3, 4] as const);
      const correctVal = 1 << n;
      const pool = [2, 4, 8, 16].filter((v) => v !== correctVal);
      const { options, correct } = mcqFrom(rng, `${correctVal}`, pool.slice(0, 3).map(String));
      return {
        kind: "mcq",
        question: `Скільки виходів має дешифратор із ${n} адресними лініями?`,
        options,
        correct,
        explain: `${n} адресні лінії дають 2^${n} = ${correctVal} виходів.`,
      };
    },
    // T2 — 3-to-8 decoder.
    (rng) => {
      const sel = randBits(rng, 3);
      const enable: Bit = rng() < 0.8 ? 1 : 0;
      const out = decoder(sel, enable);
      return {
        kind: "bits",
        question: `Дешифратор 3→8, адреса A2A1A0=${fmt(sel)}, E=${enable}. Визначте Y0…Y7.`,
        labels: ["Y0", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7"],
        correct: out,
        explain: enable
          ? `E=1: активним стає лише Y${intFromBits(sel)}.`
          : `E=0 гасить усі виходи незалежно від адреси.`,
      };
    },
  ],

  comparators: [
    // T0 — 4-bit magnitude compare, all three flags.
    (rng) => {
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
    // T1 — same comparison, single-choice format.
    (rng) => {
      const a = randBits(rng, 4);
      const b = randBits(rng, 4);
      const { gt, eq } = compare(a, b);
      const correctText = gt ? "A>B" : eq ? "A=B" : "A<B";
      const rest = ["A>B", "A=B", "A<B"].filter((x) => x !== correctText);
      const { options, correct } = mcqFrom(rng, correctText, [...rest, "неможливо визначити"]);
      return {
        kind: "mcq",
        question: `A=${fmt(a)}, B=${fmt(b)} (беззнакові 4-бітові числа). Яке твердження правильне?`,
        options,
        correct,
        explain: `${intFromBits(a)} проти ${intFromBits(b)} → ${correctText}.`,
      };
    },
    // T2 — narrower 2-bit comparator.
    (rng) => {
      const a = randBits(rng, 2);
      const b = randBits(rng, 2);
      const { gt, eq, lt } = compare(a, b);
      return {
        kind: "bits",
        question: `Порівняйте A=${fmt(a)} і B=${fmt(b)} (беззнакові 2-бітові числа). Визначте прапорці A>B, A=B, A<B.`,
        labels: ["A>B", "A=B", "A<B"],
        correct: [gt, eq, lt],
        explain: `${intFromBits(a)} проти ${intFromBits(b)}.`,
      };
    },
  ],

  adders: [
    // T0 — 4-bit full adder with carry-in.
    (rng) => {
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
    // T1 — half adder (no carry-in).
    (rng) => {
      const a = randBit(rng);
      const b = randBit(rng);
      const { s, c } = halfAdder(a, b);
      return {
        kind: "bits",
        question: `Напівсуматор: A=${a}, B=${b}. Чому дорівнюють сума S і перенос C?`,
        labels: ["S", "C"],
        correct: [s, c],
        explain: `S=A⊕B=${s}, C=A·B=${c}.`,
      };
    },
    // T2 — conceptual: full adders needed for an N-bit adder.
    (rng) => {
      const width = pick(rng, [4, 8, 16] as const);
      const pool = [4, 8, 16].filter((v) => v !== width);
      const { options, correct } = mcqFrom(rng, `${width}`, pool.map(String));
      return {
        kind: "mcq",
        question: `Скільки одно­розрядних повних суматорів потрібно, щоб побудувати ${width}-розрядний суматор?`,
        options,
        correct,
        explain: `По одному повному суматору на кожен розряд — ${width} штук.`,
      };
    },
  ],

  mux: [
    // T0 — 4:1 multiplexer.
    (rng) => {
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
    // T1 — conceptual: address lines needed for an N:1 mux.
    (rng) => {
      const n = pick(rng, [2, 4, 8, 16] as const);
      const correctVal = Math.log2(n);
      const pool = [1, 2, 3, 4].filter((v) => v !== correctVal);
      const { options, correct } = mcqFrom(rng, `${correctVal}`, pool.slice(0, 3).map(String));
      return {
        kind: "mcq",
        question: `Скільки адресних ліній потрібно мультиплексору ${n}:1?`,
        options,
        correct,
        explain: `${n} входів вимагають log2(${n}) = ${correctVal} адресних ліній.`,
      };
    },
    // T2 — narrower 2:1 multiplexer.
    (rng) => {
      const inputs = randBits(rng, 2);
      const sel = randBits(rng, 1);
      const y = mux(inputs, sel);
      return {
        kind: "bits",
        question: `Мультиплексор 2:1, I0I1=${fmt(inputs)}, S0=${fmt(sel)}. Чому дорівнює Y?`,
        labels: ["Y"],
        correct: [y],
        explain: `Адреса S=${intFromBits(sel)} обирає I${intFromBits(sel)}=${inputs[intFromBits(sel)]}.`,
      };
    },
  ],

  demux: [
    // T0 — 1:4 demultiplexer.
    (rng) => {
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
    // T1 — conceptual definition.
    (rng) => {
      const { options, correct } = mcqFrom(
        rng,
        "Скеровує один вхід на один із кількох виходів за адресою",
        [
          "Об'єднує кілька входів в один вихід за адресою",
          "Перетворює позиційний код у двійковий",
          "Перетворює двійковий код у позиційний, завжди без входу даних",
        ],
      );
      return {
        kind: "mcq",
        question: "Що робить демультиплексор?",
        options,
        correct,
        explain: "Демультиплексор — це \"перемикач-розподілювач\": один вхід даних іде на один із N виходів, обраний адресою.",
      };
    },
    // T2 — wider 1:8 demultiplexer.
    (rng) => {
      const d = randBit(rng);
      const sel = randBits(rng, 3);
      const out = demux(d, sel);
      return {
        kind: "bits",
        question: `Демультиплексор 1:8, D=${d}, S2S1S0=${fmt(sel)}. Визначте Y0…Y7.`,
        labels: ["Y0", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7"],
        correct: out,
        explain: d
          ? `Дані D=1 проходять лише на Y${intFromBits(sel)}.`
          : `D=0 — усі виходи нульові незалежно від адреси.`,
      };
    },
  ],
};

function taskId(topic: TopicId, slot: number, seed: string): string {
  return `${topic}-${slot}-${hashSeed(`${seed}:${topic}:${slot}`).toString(36)}`;
}

/** Deterministic task for one (topic, slot) pair under `seed` (normally the user id). */
export function generateTask(topic: TopicId, slot: number, seed: string): Task {
  const rng = mulberry32(hashSeed(`${seed}:${topic}:${slot}`));
  const templates = GENERATORS[topic];
  const gen = templates[slot % templates.length]!;
  // Spreading a `Variant` union here loses the discriminant across the
  // object literal (a TS limitation, not a runtime issue) — the cast is safe
  // because every generator returns a complete, self-consistent shape.
  return { id: taskId(topic, slot, seed), topic, ...gen(rng) } as Task;
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
