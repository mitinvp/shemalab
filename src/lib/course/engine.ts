/**
 * Practice + test generation for course topics (per-student, deterministic).
 *
 *  - Practice: PRACTICE_SLOTS tasks per topic. Simulator topics use the
 *    parametric generators from `task-generator.ts`; topics with `extra`
 *    use `extra.ts`; the rest draw from the question bank.
 *  - Test: TEST_SIZE items, a mix of generated tasks (if the topic has any)
 *    and bank questions, drawn per student and per attempt (`salt`).
 *
 * Everything is a pure function of (topic, userId, salt), so the server can
 * regenerate and grade a test without storing it.
 */
import { bitsEqual } from "../digital";
import {
  generateTask,
  hashSeed,
  mulberry32,
  mcqFrom,
  type Rng,
} from "../task-generator";
import type { McqTask, Task } from "../tasks";
import { EXTRA } from "./extra";
import type { BankRow, CourseTopic } from "./types";

export const PRACTICE_SLOTS = 8;
export const TEST_SIZE = 8;
const TEST_GENERATED = 3;

function shuffled<T>(rng: Rng, arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

function bankTask(topic: CourseTopic, index: number, rng: Rng): McqTask {
  const row: BankRow = topic.bank[index]!;
  const { options, correct } = mcqFrom(rng, row[1], [row[2], row[3], row[4]]);
  return {
    id: `${topic.id}-b${index}`,
    topic: topic.id,
    kind: "mcq",
    question: row[0],
    options,
    correct,
    explain: row[5] ?? `Правильна відповідь: ${row[1]}.`,
  };
}

const hasGenerated = (t: CourseTopic): boolean => Boolean(t.sim) || Boolean(t.extra);

function generated(topic: CourseTopic, slot: number, seed: string): Task {
  if (topic.sim) {
    const t = generateTask(topic.sim, slot, seed, topic.simTemplates);
    return { ...t, topic: topic.id, id: `${topic.id}-g${slot}-${hashSeed(seed + slot).toString(36)}` };
  }
  const gens = EXTRA[topic.id]!;
  const rng = mulberry32(hashSeed(`${seed}:${topic.id}:${slot}`));
  const v = gens[slot % gens.length]!(rng);
  return {
    ...v,
    id: `${topic.id}-g${slot}-${hashSeed(seed + slot).toString(36)}`,
    topic: topic.id,
  } as Task;
}

/** Practice task `slot` (0..PRACTICE_SLOTS-1) for this student. */
export function practiceTask(topic: CourseTopic, slot: number, userId: string): Task {
  const seed = `${userId}|${topic.id}`;
  if (hasGenerated(topic)) return generated(topic, slot, seed);
  const order = shuffled(mulberry32(hashSeed(`${seed}|practice`)), topic.bank.map((_, i) => i));
  const idx = order[slot % order.length]!;
  return bankTask(topic, idx, mulberry32(hashSeed(`${seed}|opt|${idx}`)));
}

export function practiceTasks(topic: CourseTopic, userId: string): Task[] {
  return Array.from({ length: PRACTICE_SLOTS }, (_, s) => practiceTask(topic, s, userId));
}

/** One test attempt for this student. `salt` makes each attempt different. */
export function testTasks(topic: CourseTopic, userId: string, salt: string): Task[] {
  const seed = `${userId}|${topic.id}|test|${salt}`;
  const nGen = hasGenerated(topic) ? TEST_GENERATED : 0;
  const items: Task[] = [];
  for (let k = 0; k < nGen; k++) items.push(generated(topic, k, seed));
  const order = shuffled(mulberry32(hashSeed(`${seed}|bank`)), topic.bank.map((_, i) => i));
  for (const idx of order.slice(0, TEST_SIZE - nGen)) {
    items.push(bankTask(topic, idx, mulberry32(hashSeed(`${seed}|opt|${idx}`))));
  }
  return shuffled(mulberry32(hashSeed(`${seed}|order`)), items);
}

export type Answer = number | number[];

export function isCorrect(task: Task, answer: unknown): boolean {
  if (task.kind === "mcq") return typeof answer === "number" && answer === task.correct;
  return (
    Array.isArray(answer) &&
    answer.length === task.correct.length &&
    answer.every((b) => b === 0 || b === 1) &&
    bitsEqual(answer as never, task.correct)
  );
}

export function correctText(task: Task): string {
  return task.kind === "mcq"
    ? (task.options[task.correct] ?? "")
    : task.labels.map((l, i) => `${l}=${task.correct[i]}`).join(", ");
}

/** A task with every answer-revealing field removed (sent to the client during a test). */
export type SecretTask =
  | { id: string; kind: "mcq"; question: string; options: string[] }
  | { id: string; kind: "bits"; question: string; labels: string[] };

export function stripSecrets(task: Task): SecretTask {
  return task.kind === "mcq"
    ? { id: task.id, kind: "mcq", question: task.question, options: task.options }
    : { id: task.id, kind: "bits", question: task.question, labels: task.labels };
}
