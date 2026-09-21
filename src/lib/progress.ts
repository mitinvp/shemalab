import { create } from "zustand";
import { TASKS_PER_TOPIC, TOPIC_IDS, type TopicId } from "./topics";

const KEY = "schemalab-progress-v1";

type ProgressState = {
  ready: boolean;
  completed: Record<TopicId, string[]>;
  examBest: number;
  hydrate: () => void;
  completeTask: (topic: TopicId, taskId: string) => void;
  reset: () => void;
  setExamBest: (score: number) => void;
};

function emptyCompleted(): Record<TopicId, string[]> {
  const out = {} as Record<TopicId, string[]>;
  for (const id of TOPIC_IDS) out[id] = [];
  return out;
}

function persist(completed: Record<TopicId, string[]>, examBest: number) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ completed, examBest }));
  } catch {
    /* ignore quota */
  }
}

export const useProgress = create<ProgressState>((set, get) => ({
  ready: false,
  completed: emptyCompleted(),
  examBest: 0,
  hydrate: () => {
    if (get().ready) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          completed?: Record<string, string[]>;
          examBest?: number;
        };
        const completed = emptyCompleted();
        for (const id of TOPIC_IDS) {
          completed[id] = parsed.completed?.[id] ?? [];
        }
        set({
          ready: true,
          completed,
          examBest: typeof parsed.examBest === "number" ? parsed.examBest : 0,
        });
        return;
      }
    } catch {
      /* fall through */
    }
    set({ ready: true });
  },
  completeTask: (topic, taskId) => {
    const completed = { ...get().completed };
    const list = completed[topic] ?? [];
    if (list.includes(taskId)) return;
    completed[topic] = [...list, taskId];
    const examBest = get().examBest;
    set({ completed });
    persist(completed, examBest);
  },
  reset: () => {
    const completed = emptyCompleted();
    set({ completed, examBest: 0 });
    persist(completed, 0);
  },
  setExamBest: (score) => {
    const examBest = Math.max(get().examBest, score);
    set({ examBest });
    persist(get().completed, examBest);
  },
}));

export function topicDoneCount(
  completed: Record<TopicId, string[]>,
  topic: TopicId,
): number {
  return completed[topic]?.length ?? 0;
}

export function totalDone(completed: Record<TopicId, string[]>): number {
  return TOPIC_IDS.reduce((acc, id) => acc + topicDoneCount(completed, id), 0);
}

export const TOTAL_TASKS = TOPIC_IDS.length * TASKS_PER_TOPIC;
