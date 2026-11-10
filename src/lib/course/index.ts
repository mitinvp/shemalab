import { M1 } from "./module1";
import { M2A } from "./module2a";
import { M2B } from "./module2b";
import { M3 } from "./module3";
import { MORE_1 } from "./bank-more-1";
import { MORE_2 } from "./bank-more-2";
import { MORE_3 } from "./bank-more-3";
import type { CourseModule, CourseTopic } from "./types";

const MORE = { ...MORE_1, ...MORE_2, ...MORE_3 };

export * from "./types";
export { EXTRAS, type TopicExtras } from "./extras";
export { LABS, LAB_BY_ID, type LabWork, type LabVariant } from "./labs";
export {
  PRACTICE_SLOTS,
  TEST_SIZE,
  practiceTask,
  practiceTasks,
  testTasks,
  isCorrect,
  correctText,
  stripSecrets,
  questionKey,
  type SecretTask,
} from "./engine";

export const MODULES: CourseModule[] = [
  { id: 1, title: "Модуль 1. Типові вузли обчислювальної техніки", lead: "Теми 1–4: логічні елементи, комбінаційні схеми, карти Карно." },
  { id: 2, title: "Модуль 2. Комбінаційні вузли та основні пристрої комп'ютерів", lead: "Теми 5–18: тригери, регістри, лічильники, шифратори, мультиплексори, суматори, АЦП/ЦАП." },
  { id: 3, title: "Модуль 3. Памʼять та мікропроцесори", lead: "Теми 19–25: памʼять, мікропроцесори, AVR, Arduino, автомати." },
];

export const COURSE_TOPICS: CourseTopic[] = [...M1, ...M2A, ...M2B, ...M3].map((t) => ({
  ...t,
  bank: [...t.bank, ...(MORE[t.id] ?? [])],
}));

export const COURSE_BY_ID: Record<string, CourseTopic> = Object.fromEntries(
  COURSE_TOPICS.map((t) => [t.id, t]),
);

export const COURSE_TOPIC_IDS: string[] = COURSE_TOPICS.map((t) => t.id);

export function getCourseTopic(id: string): CourseTopic | undefined {
  return COURSE_BY_ID[id];
}
