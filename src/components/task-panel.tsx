import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { bitsEqual, type Bit, toggleAt } from "@/lib/digital";
import { useProgress } from "@/lib/progress";
import { useMyProgress, useRecordSlotAttempt, useSchoolReady } from "@/lib/school-client";
import { generateTopicTasks } from "@/lib/task-generator";
import { tasksFor } from "@/lib/tasks";
import type { Task } from "@/lib/tasks";
import type { TopicId } from "@/lib/topics";
import { cn } from "@/lib/utils";
import { BitWord, Panel } from "./circuit";
import { Button } from "./ui/button";

function AnswerBits({
  task,
  value,
  onChange,
  locked,
}: {
  task: Extract<Task, { kind: "bits" }>;
  value: Bit[];
  onChange: (next: Bit[]) => void;
  locked: boolean;
}) {
  return (
    <BitWord
      bits={value}
      labels={task.labels}
      onToggle={locked ? undefined : (i) => onChange(toggleAt(value, i))}
      readOnly={locked}
      showDecimal={false}
    />
  );
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
  const [bits, setBits] = useState<Bit[]>(
    task.kind === "bits" ? task.correct.map(() => 0) : [],
  );
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  const check = () => {
    const ok =
      task.kind === "mcq"
        ? choice === task.correct
        : bitsEqual(bits, task.correct);
    setChecked(true);
    setCorrect(ok);
    if (ok) onSolved(task.kind === "mcq" ? (choice as number) : bits);
  };

  const retry = () => {
    setChecked(false);
    setCorrect(false);
  };

  return (
    <Panel>
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-fg">
          <span className="mr-2 font-mono text-xs text-muted">{index + 1}.</span>
          {task.question}
        </p>
        {done ? (
          <span className="shrink-0 font-mono text-xs text-ok">зараховано</span>
        ) : null}
      </div>

      {task.kind === "mcq" ? (
        <div className="grid gap-2">
          {task.options.map((opt, i) => {
            const selected = choice === i;
            const reveal = checked && i === task.correct;
            const wrong = checked && selected && i !== task.correct;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setChoice(i);
                  setChecked(false);
                }}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-[background-color,box-shadow,color] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
                  selected
                    ? "bg-surface-2 text-fg shadow-[var(--shadow-border-hover)]"
                    : "text-muted shadow-[var(--shadow-border)] hover:text-fg",
                  reveal ? "text-ok" : null,
                  wrong ? "text-danger" : null,
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
      ) : (
        <AnswerBits task={task} value={bits} onChange={setBits} locked={checked && correct} />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={check}
          disabled={task.kind === "mcq" && choice === null}
        >
          <Check className="size-4" />
          Перевірити
        </Button>
        {checked && !correct ? (
          <Button type="button" variant="ghost" onClick={retry}>
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

/** Signed in with a server-backed group: each student gets their own generated variants. */
function ServerTaskPanel({ topicId, userId }: { topicId: TopicId; userId: string }) {
  const tasks = generateTopicTasks(topicId, userId);
  const progressQuery = useMyProgress();
  const recordAttempt = useRecordSlotAttempt();
  const doneCount = progressQuery.data?.[topicId] ?? 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {progressQuery.isPending ? "…" : doneCount} з {tasks.length} зараховано. Для кожного
        студента — свій набір чисел; результат зберігається на сервері й видно викладачу.
      </p>
      {tasks.map((task, i) => (
        <TaskCard
          key={task.id}
          task={task}
          index={i}
          done={progressQuery.isSuccess && i < doneCount}
          onSolved={(answer) => recordAttempt.mutate({ topic: topicId, slot: i, answer })}
        />
      ))}
    </div>
  );
}

/** Signed out / auth disabled (dev & sandbox preview): original static tasks + localStorage. */
function LocalTaskPanel({ topicId }: { topicId: TopicId }) {
  const tasks = tasksFor(topicId);
  const completeTask = useProgress((s) => s.completeTask);
  const completed = useProgress((s) => s.completed[topicId] ?? []);
  const doneCount = completed.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {doneCount} з {tasks.length} зараховано. Відповідь можна виправити, зарахування
        зберігається в цьому браузері.
      </p>
      {tasks.map((task, i) => (
        <TaskCard
          key={task.id}
          task={task}
          index={i}
          done={completed.includes(task.id)}
          onSolved={() => completeTask(topicId, task.id)}
        />
      ))}
    </div>
  );
}

export function TaskPanel({ topicId }: { topicId: TopicId }) {
  const schoolReady = useSchoolReady();
  const user = useCurrentUser();
  if (schoolReady && user) return <ServerTaskPanel topicId={topicId} userId={user.id} />;
  return <LocalTaskPanel topicId={topicId} />;
}
