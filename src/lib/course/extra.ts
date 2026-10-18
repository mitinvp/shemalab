/**
 * Parametric generators for course topics that have no simulator:
 * t01 (алгебра логіки), t04 (карти Карно), t17 (АЦП), t18 (ЦАП), t19 (памʼять).
 * Correct answers are always computed, never typed by hand.
 */
import type { Bit } from "../digital";
import { mcqFrom, pick, randBit, type Rng, type Variant } from "../task-generator";

type Gen = (rng: Rng) => Variant;

const uk = (x: number, digits = 3): string =>
  String(Number(x.toFixed(digits))).replace(".", ",");
const bin = (n: number, width: number): string => n.toString(2).padStart(width, "0");
const bar = (s: string): string => `${s}\u0305`;

/** Pick `count` distinct values, `first` always included, others from `pool` in order. */
function distinctOptions<T>(first: T, pool: readonly T[], count = 4): T[] {
  const out: T[] = [first];
  for (const v of pool) {
    if (out.length >= count) break;
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

// ── t01: алгебра логіки ────────────────────────────────────────────────────
const EXPRS: { s: string; f: (a: Bit, b: Bit, c: Bit) => boolean }[] = [
  { s: `A·${bar("B")} + C`, f: (a, b, c) => (a === 1 && b === 0) || c === 1 },
  { s: `(A + B)·${bar("C")}`, f: (a, b, c) => (a === 1 || b === 1) && c === 0 },
  { s: `(A ⊕ B) + C`, f: (a, b, c) => a !== b || c === 1 },
  { s: `A·B + ${bar("B")}·C`, f: (a, b, c) => (a === 1 && b === 1) || (b === 0 && c === 1) },
  { s: `(A + ${bar("B")})·(B + C)`, f: (a, b, c) => (a === 1 || b === 0) && (b === 1 || c === 1) },
  { s: `${bar("A")}·${bar("B")} + A·C`, f: (a, b, c) => (a === 0 && b === 0) || (a === 1 && c === 1) },
  { s: `НЕ(A·B) + C`, f: (a, b, c) => !(a === 1 && b === 1) || c === 1 },
  { s: `(A + B + C)·${bar("A")}`, f: (a, b, c) => (a === 1 || b === 1 || c === 1) && a === 0 },
];

const LAWS: { name: string; expr: string }[] = [
  { name: "Переставний (комутативний)", expr: "A + B = B + A" },
  { name: "Сполучний (асоціативний)", expr: "A + (B + C) = (A + B) + C" },
  { name: "Розподільний (дистрибутивний)", expr: "A·(B + C) = A·B + A·C" },
  { name: "Поглинання", expr: "A + A·B = A" },
  { name: "Де Моргана", expr: `НЕ(A·B) = ${bar("A")} + ${bar("B")}` },
  { name: "Ідемпотентності (повторення)", expr: "A + A = A" },
  { name: "Подвійного заперечення", expr: "НЕ(НЕ A) = A" },
  { name: "Доповнення (виключення третього)", expr: `A + ${bar("A")} = 1` },
];

const SIMPLIFY: [string, string, string, string, string][] = [
  [`A + A·B`, "A", "B", "A·B", "A + B"],
  [`A·(A + B)`, "A", "B", "A + B", "A·B"],
  [`A + ${bar("A")}·B`, "A + B", "A·B", "B", "A"],
  [`A·B + A·${bar("B")}`, "A", "B", "A·B", "1"],
  [`(A + B)·(A + ${bar("B")})`, "A", "B", "0", "A + B"],
  [`A + ${bar("A")}`, "1", "0", "A", bar("A")],
  [`A·${bar("A")}`, "0", "1", "A", bar("A")],
  [`A·B + ${bar("A")}·B`, "B", "A", "A·B", "1"],
];

const t01: Gen[] = [
  (rng) => {
    const e = pick(rng, EXPRS);
    const a = randBit(rng), b = randBit(rng), c = randBit(rng);
    const y: Bit = e.f(a, b, c) ? 1 : 0;
    return {
      kind: "bits",
      question: `Обчисліть F = ${e.s} для A=${a}, B=${b}, C=${c}.`,
      labels: ["F"],
      correct: [y],
      explain: `Підставляємо значення в вираз і виконуємо операції за пріоритетом: F = ${y}.`,
    };
  },
  (rng) => {
    const law = pick(rng, LAWS);
    const others = LAWS.filter((l) => l !== law).map((l) => l.name);
    const shuffledOthers = [...others].sort(() => rng() - 0.5).slice(0, 3);
    const { options, correct } = mcqFrom(rng, law.name, shuffledOthers);
    return {
      kind: "mcq",
      question: `Яким законом алгебри логіки є тотожність ${law.expr}?`,
      options,
      correct,
      explain: `${law.expr} — це закон «${law.name}».`,
    };
  },
  (rng) => {
    const [expr, ans, w1, w2, w3] = pick(rng, SIMPLIFY);
    const { options, correct } = mcqFrom(rng, ans, [w1, w2, w3]);
    return {
      kind: "mcq",
      question: `Спростіть вираз ${expr}.`,
      options,
      correct,
      explain: `${expr} = ${ans} (за законами поглинання, склеювання та доповнення).`,
    };
  },
];

// ── t04: карти Карно (мінімізація через Куайна–Мак-Класкі) ───────────────────
type Imp = { mask: number; val: number };
const popcount = (x: number): number => x.toString(2).replace(/0/g, "").length;
const covers = (imp: Imp, m: number): boolean => (m & ~imp.mask) === imp.val;

function primeImplicants(n: number, minterms: number[]): Imp[] {
  let current = new Map<string, Imp>();
  for (const m of minterms) current.set(`0:${m}`, { mask: 0, val: m });
  const primes = new Map<string, Imp>();
  while (current.size > 0) {
    const list = [...current.values()];
    const used = new Set<string>();
    const next = new Map<string, Imp>();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!, b = list[j]!;
        if (a.mask !== b.mask) continue;
        const diff = a.val ^ b.val;
        if (diff === 0 || (diff & (diff - 1)) !== 0) continue;
        used.add(`${a.mask}:${a.val}`);
        used.add(`${b.mask}:${b.val}`);
        const mask = a.mask | diff;
        const val = a.val & ~diff;
        next.set(`${mask}:${val}`, { mask, val });
      }
    }
    for (const [k, v] of current) if (!used.has(k)) primes.set(k, v);
    current = next;
  }
  void n;
  return [...primes.values()];
}

function combos<T>(arr: readonly T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, acc: T[]) => {
    if (acc.length === k) { out.push([...acc]); return; }
    for (let i = start; i < arr.length; i++) { acc.push(arr[i]!); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []);
  return out;
}

/** Minimal SOP cover, or null when the minimum is not unique. */
function minimalCover(n: number, minterms: number[]): Imp[] | null {
  const primes = primeImplicants(n, minterms);
  for (let k = 1; k <= primes.length; k++) {
    const good = combos(primes, k).filter((c) =>
      minterms.every((m) => c.some((p) => covers(p, m))),
    );
    if (good.length === 0) continue;
    const lits = (c: Imp[]) => c.reduce((s, p) => s + n - popcount(p.mask), 0);
    const best = Math.min(...good.map(lits));
    const bests = good.filter((c) => lits(c) === best);
    return bests.length === 1 ? bests[0]! : null;
  }
  return null;
}

const VARS = ["A", "B", "C", "D"];
function sopString(n: number, cover: Imp[]): string {
  const terms = cover.map((p) => {
    const lits: string[] = [];
    for (let i = 0; i < n; i++) {
      const bit = 1 << (n - 1 - i);
      if (p.mask & bit) continue;
      lits.push(p.val & bit ? VARS[i]! : bar(VARS[i]!));
    }
    return lits.length ? lits.join("·") : "1";
  });
  return terms.sort().join(" + ");
}

function randomFunction(rng: Rng, n: number): { minterms: number[]; cover: Imp[] } {
  const size = 1 << n;
  for (let attempt = 0; attempt < 200; attempt++) {
    const k = 3 + Math.floor(rng() * (size - 5));
    const set = new Set<number>();
    while (set.size < k) set.add(Math.floor(rng() * size));
    const minterms = [...set].sort((a, b) => a - b);
    const cover = minimalCover(n, minterms);
    if (cover) return { minterms, cover };
  }
  // Guaranteed fallback with a unique minimal cover.
  const minterms = n === 3 ? [1, 3, 5, 7] : [0, 1, 4, 5, 8, 9, 12, 13];
  return { minterms, cover: minimalCover(n, minterms)! };
}

function karnaughMcq(rng: Rng, n: number): Variant {
  const { minterms, cover } = randomFunction(rng, n);
  const correct = sopString(n, cover);
  const size = 1 << n;
  const wrong = new Set<string>();
  for (let tries = 0; tries < 300 && wrong.size < 3; tries++) {
    const set = new Set(minterms);
    const flips = 1 + Math.floor(rng() * 2);
    for (let f = 0; f < flips; f++) {
      const m = Math.floor(rng() * size);
      if (set.has(m)) set.delete(m); else set.add(m);
    }
    if (set.size === 0 || set.size === size) continue;
    const c = minimalCover(n, [...set].sort((a, b) => a - b));
    if (!c) continue;
    const s = sopString(n, c);
    if (s !== correct) wrong.add(s);
  }
  const wrongList = [...wrong];
  while (wrongList.length < 3) wrongList.push(`${correct} + ${VARS[wrongList.length % n]}`);
  const { options, correct: idx } = mcqFrom(rng, correct, wrongList.slice(0, 3));
  const names = VARS.slice(0, n).join(", ");
  return {
    kind: "mcq",
    question: `Функція F(${names}) = Σm(${minterms.join(", ")}). Яка її мінімальна ДНФ (за картою Карно)?`,
    options,
    correct: idx,
    explain: `Об'єднуємо сусідні одиниці в найбільші блоки 2ᵏ клітинок: F = ${correct}.`,
  };
}

const t04: Gen[] = [
  (rng) => karnaughMcq(rng, 3),
  (rng) => karnaughMcq(rng, 4),
  (rng) => {
    const n = 3;
    const { minterms, cover } = randomFunction(rng, n);
    const expr = sopString(n, cover);
    const point = Math.floor(rng() * (1 << n));
    const y: Bit = minterms.includes(point) ? 1 : 0;
    return {
      kind: "bits",
      question: `Мінімізована функція F = ${expr}. Чому дорівнює F при A=${(point >> 2) & 1}, B=${(point >> 1) & 1}, C=${point & 1}?`,
      labels: ["F"],
      correct: [y],
      explain: `Підставляємо значення змінних у кожен доданок: F = ${y}.`,
    };
  },
];

// ── t17: АЦП ───────────────────────────────────────────────────────────────
const t17: Gen[] = [
  (rng) => {
    const n = pick(rng, [3, 4, 5, 6] as const);
    const uref10 = pick(rng, [40, 50, 80, 100] as const);
    const uin10 = 1 + Math.floor(rng() * (uref10 - 1));
    const levels = 1 << n;
    const N = Math.floor((uin10 * levels) / uref10);
    const pool = [N + 1, N - 1, N + 2, N - 2, N + 3, N - 3].filter((v) => v >= 0 && v < levels);
    const codes = distinctOptions(N, pool).map((v) => bin(v, n));
    const { options, correct } = mcqFrom(rng, codes[0]!, codes.slice(1));
    return {
      kind: "mcq",
      question: `${n}-розрядний АЦП з Uref = ${uk(uref10 / 10)} В. На вхід подано Uвх = ${uk(uin10 / 10)} В. Який двійковий код на виході?`,
      options,
      correct,
      explain: `Крок квантування = Uref/2ⁿ = ${uk(uref10 / 10 / levels, 4)} В; N = ⌊Uвх/крок⌋ = ${N} = ${bin(N, n)}.`,
    };
  },
  (rng) => {
    const n = pick(rng, [4, 5, 6, 8] as const);
    const uref = pick(rng, [4, 5, 8, 10, 16] as const);
    const lsb = (uref * 1000) / (1 << n);
    const f = (x: number) => `${uk(x, 2)} мВ`;
    const vals = distinctOptions(f(lsb), [f(lsb * 2), f(lsb / 2), f(lsb * 4), f(lsb / 4)]);
    const { options, correct } = mcqFrom(rng, vals[0]!, vals.slice(1));
    return {
      kind: "mcq",
      question: `Який крок квантування (роздільна здатність) ${n}-розрядного АЦП з Uref = ${uref} В?`,
      options,
      correct,
      explain: `Крок = Uref/2ⁿ = ${uref}/${1 << n} В = ${f(lsb)}.`,
    };
  },
  (rng) => {
    const dmv = pick(rng, [20, 10, 5, 2] as const);
    const ratio = 5000 / dmv;
    const need = Math.ceil(Math.log2(ratio));
    const nums = distinctOptions(need, [need - 1, need + 1, need + 2, need - 2]);
    const { options, correct } = mcqFrom(rng, String(nums[0]), nums.slice(1).map(String));
    return {
      kind: "mcq",
      question: `Скільки розрядів має мати АЦП з Uref = 5 В, щоб крок квантування не перевищував ${dmv} мВ?`,
      options,
      correct,
      explain: `2ⁿ ≥ 5000/${dmv} = ${ratio}, тож n = ${need}.`,
    };
  },
];

// ── t18: ЦАП ───────────────────────────────────────────────────────────────
const t18: Gen[] = [
  (rng) => {
    const n = pick(rng, [3, 4, 5] as const);
    const uref = pick(rng, [5, 8, 10, 16] as const);
    const levels = 1 << n;
    const N = 1 + Math.floor(rng() * (levels - 2));
    const f = (v: number) => `${uk((uref * v) / levels)} В`;
    const pool = [N + 1, N - 1, N + 2, N - 2, N + 3, N - 3, N + 4, N - 4].filter((v) => v > 0 && v < levels);
    const vals = distinctOptions(f(N), pool.map(f));
    const { options, correct } = mcqFrom(rng, vals[0]!, vals.slice(1));
    return {
      kind: "mcq",
      question: `${n}-розрядний ЦАП, Uref = ${uref} В. На вхід подано код ${bin(N, n)}. Чому дорівнює Uвих?`,
      options,
      correct,
      explain: `Uвих = Uref·N/2ⁿ = ${uref}·${N}/${levels} = ${f(N)}.`,
    };
  },
  (rng) => {
    const n = pick(rng, [3, 4, 5] as const);
    const uref = pick(rng, [8, 16, 32] as const);
    const levels = 1 << n;
    const N = 1 + Math.floor(rng() * (levels - 2));
    const uout = (uref * N) / levels;
    const pool = [N + 1, N - 1, N + 2, N - 2, N + 3, N - 3, N + 4, N - 4].filter((v) => v > 0 && v < levels);
    const codes = distinctOptions(N, pool).map((v) => bin(v, n));
    const { options, correct } = mcqFrom(rng, codes[0]!, codes.slice(1));
    return {
      kind: "mcq",
      question: `${n}-розрядний ЦАП з Uref = ${uref} В. Який код потрібно подати, щоб отримати Uвих = ${uk(uout)} В?`,
      options,
      correct,
      explain: `N = Uвих·2ⁿ/Uref = ${uk(uout)}·${levels}/${uref} = ${N} = ${bin(N, n)}.`,
    };
  },
  (rng) => {
    const n = pick(rng, [4, 6, 8] as const);
    const uref = pick(rng, [5, 8, 10] as const);
    const f = (x: number) => `${uk(x, 4)} В`;
    const vals = distinctOptions(f(uref / 2), [f(uref / 4), f(uref / (1 << n)), f(uref)]);
    const { options, correct } = mcqFrom(rng, vals[0]!, vals.slice(1));
    return {
      kind: "mcq",
      question: `Який внесок старшого розряду (MSB) у вихідну напругу ${n}-розрядного ЦАП з Uref = ${uref} В?`,
      options,
      correct,
      explain: `Вага старшого розряду — половина опорної напруги: Uref/2 = ${f(uref / 2)}.`,
    };
  },
];

// ── t19: памʼять ───────────────────────────────────────────────────────────
const fmtBytes = (b: number): string => (b >= 1024 ? `${b / 1024} КБ` : `${b} байт`);

const t19: Gen[] = [
  (rng) => {
    const a = pick(rng, [10, 11, 12, 13, 14, 15, 16] as const);
    const w = pick(rng, [8, 16] as const);
    const bytes = (2 ** a * w) / 8;
    const vals = distinctOptions(fmtBytes(bytes), [fmtBytes(bytes * 2), fmtBytes(bytes / 2), fmtBytes(bytes * 4)]);
    const { options, correct } = mcqFrom(rng, vals[0]!, vals.slice(1));
    return {
      kind: "mcq",
      question: `Мікросхема памʼяті має ${a} адресних ліній і ${w}-бітну шину даних. Яка її ємність?`,
      options,
      correct,
      explain: `Ємність = 2^${a} слів × ${w} біт = ${fmtBytes(bytes)}.`,
    };
  },
  (rng) => {
    const kb = pick(rng, [1, 2, 4, 8, 16, 32, 64, 128] as const);
    const a = Math.log2(kb * 1024);
    const nums = distinctOptions(a, [a + 1, a - 1, a + 2, a - 2]);
    const { options, correct } = mcqFrom(rng, String(nums[0]), nums.slice(1).map(String));
    return {
      kind: "mcq",
      question: `Скільки адресних ліній потрібно для памʼяті ємністю ${kb} КБ із 8-бітною шиною даних?`,
      options,
      correct,
      explain: `${kb} КБ = ${kb * 1024} байт = 2^${a}, тож потрібно ${a} адресних ліній.`,
    };
  },
  (rng) => {
    const a = pick(rng, [4, 5, 6] as const); // chip depth 2^a K words
    const extra = pick(rng, [1, 2, 3] as const);
    const wide = pick(rng, [8, 16, 32] as const);
    const count = 2 ** extra * (wide / 8);
    const nums = distinctOptions(count, [count / 2, count * 2, count + 1, count * 4].filter((v) => v >= 1));
    const { options, correct } = mcqFrom(rng, String(nums[0]), nums.slice(1).map(String));
    return {
      kind: "mcq",
      question: `Скільки мікросхем ${2 ** a}К×8 потрібно, щоб побудувати памʼять ${2 ** (a + extra)}К×${wide}?`,
      options,
      correct,
      explain: `У глибину: ${2 ** (a + extra)}/${2 ** a} = ${2 ** extra}; у ширину: ${wide}/8 = ${wide / 8}. Разом ${count}.`,
    };
  },
];

export const EXTRA: Record<string, readonly Gen[]> = { t01, t04, t17, t18, t19 };
