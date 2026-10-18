import type { TopicId } from "../topics";

export type Theory = { title: string; body: string; formula?: string };

/** Compact bank row: [question, correct, wrong1, wrong2, wrong3, explain?]. */
export type BankRow = readonly [string, string, string, string, string, string?];

export type CourseTopic = {
  id: string; // "t01".."t25"
  n: number;
  module: 1 | 2 | 3;
  title: string;
  blurb: string;
  /** Hours from the working programme (РП). */
  lecture: number;
  self: number;
  /** Lab work attached to this topic in the РП, if any. */
  lab?: string;
  /** Interactive simulator + generated tasks of this kind, if any. */
  sim?: TopicId;
  /** Restrict which generator templates of `sim` this topic uses. */
  simTemplates?: readonly number[];
  /** Topic has parametric generators in `extra.ts`. */
  extra?: boolean;
  theory: Theory[];
  notes: string[];
  bank: readonly BankRow[];
};

export type CourseModule = { id: 1 | 2 | 3; title: string; lead: string };
