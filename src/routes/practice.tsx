import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BitWord, Panel } from "@/components/circuit";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { bitsEqual, type Bit, toggleAt } from "@/lib/digital";
import { useProgress } from "@/lib/progress";
import { useSchoolReady, useSubmitExamResult } from "@/lib/school-client";
import { generateExamSet } from "@/lib/task-generator";
import { examSet, type Task } from "@/lib/tasks";
import { TOPIC_BY_ID, type TopicId } from "@/lib/topics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/practice")({ component: Practice });

function Practice() {
  const [items, setItems] = useState<Task[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [bits, setBits] = useState<Bit[]>([]);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const setExamBest = useProgress((s) => s.setExamBest);
  const examBest = useProgress((s) => s.examBest);
  const ready = useProgress((s) => s.ready);
  const user = useCurrentUser();
  const schoolReady = useSchoolReady();
  const submitExam = useSubmitExamResult();
  const attemptSalt = useRef<string>("");
  const answers = useRef<Record<string, Bit[] | number>>({});

  const start = () => {
    attemptSalt.current = crypto.randomUUID();
    answers.current = {};
    const next =
      schoolReady && user
        ? generateExamSet(user.id, attemptSalt.current)
        : examSet();
    setItems(next);
    setIdx(0);
    setScore(0);
    setDone(false);
    prepare(next[0]);
  };

  const prepare = (task: Task | undefined) => {
    setChoice(null);
    setChecked(false);
    setCorrect(false);
    setBits(task?.kind === "bits" ? task.correct.map(() => 0) : []);
  };

  const task = items?.[idx];

  const check = () => {
    if (!task) return;
    const ok =
      task.kind === "mcq"
        ? choice === task.correct
        : bitsEqual(bits, task.correct);
    setChecked(true);
    setCorrect(ok);
    if (ok) setScore((s) => s + 1);
    answers.current[task.topic] = task.kind === "mcq" ? (choice as number) : bits;
  };

  const nextQ = () => {
    if (!items) return;
    if (idx + 1 >= items.length) {
      setExamBest(score);
      setDone(true);
      if (schoolReady) {
        submitExam.mutate({
          attemptSalt: attemptSalt.current,
          answers: answers.current as Record<TopicId, Bit[] | number>,
        });
      }
      return;
    }
    const n = idx + 1;
    setIdx(n);
    prepare(items[n]);
  };

  return (
    <AppShell current="exam">
      <p className="text-sm font-medium tracking-wide text-muted">Модуль</p>
      <h1 className="mt-2 font-display text-3xl text-fg sm:text-4xl">
        Контрольна з десяти тем
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        По одному питанню з кожної теми лабораторії. Без підказок до перевірки.
        Результат лишається як особистий рекорд у цьому браузері.
      </p>

      {!items ? (
        <div className="mt-8 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <p className="text-sm text-muted">
            Рекорд:{" "}
            <span className="font-mono tabular-nums text-fg">
              {ready ? examBest : "—"}/10
            </span>
          </p>
          <Button type="button" className="mt-4" onClick={start}>
            Почати
          </Button>
        </div>
      ) : done ? (
        <div className="mt-8 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <p className="font-display text-4xl tabular-nums">{score}/10</p>
          <p className="mt-2 text-sm text-muted">
            {score >= 8
              ? "Впевнено. Можна ставити наступний стенд."
              : score >= 5
                ? "База є. Пройдіть макети тем, де помилились."
                : "Варто повернутись до макетів і таблиць істинності."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" onClick={start}>
              <RotateCcw className="size-4" />
              Інший варіант
            </Button>
            <Button asChild variant="secondary">
              <Link to="/">До каталогу</Link>
            </Button>
          </div>
        </div>
      ) : task ? (
        <div className="mt-8 space-y-4">
          <p className="font-mono text-xs text-muted">
            {idx + 1} / {items.length} · {TOPIC_BY_ID[task.topic].title}
          </p>
          <Panel>
            <p className="text-base font-medium text-fg">{task.question}</p>
            {task.kind === "mcq" ? (
              <div className="mt-4 grid gap-2">
                {task.options.map((opt, i) => {
                  const selected = choice === i;
                  const reveal = checked && i === task.correct;
                  const wrong = checked && selected && i !== task.correct;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={checked}
                      onClick={() => setChoice(i)}
                      className={cn(
                        "flex min-h-11 items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-[background-color,color,box-shadow] duration-[var(--motion-quick)]",
                        selected
                          ? "bg-surface-2 text-fg shadow-[var(--shadow-border-hover)]"
                          : "text-muted shadow-[var(--shadow-border)] hover:text-fg",
                        reveal ? "text-ok" : null,
                        wrong ? "text-danger" : null,
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4">
                <BitWord
                  bits={bits}
                  labels={task.labels}
                  onToggle={checked ? undefined : (i) => setBits(toggleAt(bits, i))}
                  readOnly={checked}
                  showDecimal={false}
                />
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {!checked ? (
                <Button
                  type="button"
                  onClick={check}
                  disabled={task.kind === "mcq" && choice === null}
                >
                  <Check className="size-4" />
                  Перевірити
                </Button>
              ) : (
                <Button type="button" onClick={nextQ}>
                  {idx + 1 >= items.length ? "Результат" : "Далі"}
                </Button>
              )}
            </div>
            {checked ? (
              <p className={cn("mt-3 text-sm", correct ? "text-ok" : "text-danger")}>
                {correct ? "Правильно. " : "Не так. "}
                {task.explain}
              </p>
            ) : null}
          </Panel>
        </div>
      ) : null}
    </AppShell>
  );
}
