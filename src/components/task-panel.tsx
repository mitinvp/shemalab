import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { bitsEqual, type Bit, toggleAt } from "@/lib/digital";
import {
  PRACTICE_SLOTS,
  practiceTasks,
  type CourseTopic,
} from "@/lib/course";
import type { SecretTask } from "@/lib/course";
import { usePassedSlots, useRecordSlotAttempt, useSchoolReady } from "@/lib/school-client";
import type { Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { BitWord, Panel } from "./circuit";
import { Button } from "./ui/button";

/** Option list for a multiple-choice question. */
export function McqOptions({
  options,
  choice,
  onChoose,
  correctIndex,
  wrongIndex,
  locked,
}: {
  options: string[];
  choice: number | null;
  onChoose: (i: number) => void;
  correctIndex?: number;
  wrongIndex?: number;
  locked?: boolean;
}) {
  return (
    <div className="grid gap-2">
      {options.map((opt, i) => {
        const selected = choice === i;
        return (
          <button
            key={i}
            type="button"
            disabled={locked}
            onClick={() => onChoose(i)}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-sm px-3 py-2 text-left text-base transition-[background-color,box-shadow,color] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
              selected
                ? "bg-surface-2 text-fg shadow-[var(--shadow-border-hover)]"
                : "text-muted shadow-[var(--shadow-border)] hover:text-fg",
              correctIndex === i ? "text-ok" : null,
              wrongIndex === i ? "text-danger" : null,
            )}
          >
            <span className="mr-2 font-mono text-xs text-subtle">
              {String.fromCharCode(1040 + i)}.
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Interactive bit word for "set the output bits" questions. */
export function BitsAnswer({
  labels,
  value,
  onChange,
  locked,
}: {
  labels: string[];
  value: Bit[];
  onChange: (next: Bit[]) => void;
  locked: boolean;
}) {
  return (
    <BitWord
      bits={value}
      labels={labels}
      onToggle={locked ? undefined : (i) => onChange(toggleAt(value, i))}
      readOnly={locked}
      showDecimal={false}
    />
  );
}

/** A secret (answer-less) task has the same shape for input purposes. */
function newBits(task: Task | SecretTask): Bit[] {
  return task.kind === "bits" ? task.labels.map(() => 0 as Bit) : [];
}

function TaskCard({
  task,
  index,
  done,
  onSolved,
}: {
  task: Task;
  index: number;
  done: boolean;
  onSolved: (answer: Bit[] | number) => void;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const [bits, setBits] = useState<Bit[]>(newBits(task));
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  const check = () => {
    const ok =
      task.kind === "mcq" ? choice === task.correct : bitsEqual(bits, task.correct);
    setChecked(true);
    setCorrect(ok);
    if (ok) onSolved(task.kind === "mcq" ? (choice as number) : bits);
  };

  return (
    <Panel>
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-base font-medium text-fg">
          <span className="mr-2 font-mono text-xs text-muted">{index + 1}.</span>
          {task.question}
        </p>
        {done ? <span className="shrink-0 font-mono text-xs text-ok">зараховано</span> : null}
      </div>

      {task.kind === "mcq" ? (
        <McqOptions
          options={task.options}
          choice={choice}
          onChoose={(i) => {
            setChoice(i);
            setChecked(false);
          }}
          correctIndex={checked ? task.correct : undefined}
          wrongIndex={checked && choice !== null && choice !== task.correct ? choice : undefined}
        />
      ) : (
        <BitsAnswer labels={task.labels} value={bits} onChange={setBits} locked={checked && correct} />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={check} disabled={task.kind === "mcq" && choice === null}>
          <Check className="size-4" />
          Перевірити
        </Button>
        {checked && !correct ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setChecked(false);
              setCorrect(false);
            }}
          >
            <RotateCcw className="size-4" />
            Ще раз
          </Button>
        ) : null}
      </div>

      {checked ? (
        <p className={cn("mt-3 text-sm", correct ? "text-ok" : "text-danger")}>
          {correct ? "Правильно. " : "Не так. "}
          {task.explain}
        </p>
      ) : null}
    </Panel>
  );
}

/** Practice tab: this student's own PRACTICE_SLOTS tasks for the topic. */
export function PracticeTasks({ topic }: { topic: CourseTopic }) {
  const ready = useSchoolReady();
  const user = useCurrentUser();
  const passed = usePassedSlots(topic.id);
  const record = useRecordSlotAttempt(topic.id);

  if (!ready || !user) {
    return (
      <Panel>
        <p className="text-sm text-muted">
          Увійдіть через Google-акаунт, щоб отримати власний набір завдань — результат зберігається і
          видимий викладачу.
        </p>
      </Panel>
    );
  }

  const tasks = practiceTasks(topic, user.id);
  const done = new Set(passed.data ?? []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {passed.isPending ? "…" : done.size} з {PRACTICE_SLOTS} зараховано. У кожного студента — свій
        набір завдань і чисел.
      </p>
      {tasks.map((task, i) => (
        <TaskCard
          key={task.id}
          task={task}
          index={i}
          done={done.has(i)}
          onSolved={(answer) => record.mutate({ slot: i, answer })}
        />
      ))}
    </div>
  );
}
