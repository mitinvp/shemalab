import type { Bit } from "./digital";

/** Multiple-choice task. `topic` is a course topic id ("t01"…) or a simulator kind. */
export type McqTask = {
  id: string;
  topic: string;
  kind: "mcq";
  question: string;
  options: string[];
  correct: number;
  explain: string;
};

/** "Set the output bits" task. */
export type BitsTask = {
  id: string;
  topic: string;
  kind: "bits";
  question: string;
  labels: string[];
  correct: Bit[];
  explain: string;
};

export type Task = McqTask | BitsTask;
