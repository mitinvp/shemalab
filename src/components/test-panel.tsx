import { useState } from "react";
import { Loader2 } from "lucide-react";
import { TEST_SIZE, type CourseTopic, type SecretTask } from "@/lib/course";
import type { Bit } from "@/lib/digital";
import {
  useMyProgress,
  useSchoolReady,
  useStartTest,
  useSubmitTest,
} from "@/lib/school-client";
import type { TestReview } from "@/lib/school";
import { cn } from "@/lib/utils";
import { BitsAnswer, McqOptions } from "./task-panel";
import { Panel } from "./circuit";
import { Button } from "./ui/button";

type Attempt = { salt: string; items: SecretTask[] };
type Result = { score: number; total: number; review: TestReview[] };

function TestQuestion({
  item,
  index,
  value,
  onChange,
  review,
}: {
  item: SecretTask;
  index: number;
  value: number | Bit[] | null;
  onChange: (v: number | Bit[]) => void;
  review?: TestReview;
}) {
  return (
    <Panel>
      <p className="mb-3 text-sm font-medium text-fg">
        <span className="mr-2 font-mono text-xs text-muted">{index + 1}.</span>
        {item.question}
      </p>
      {item.kind === "mcq" ? (
        <McqOptions
          options={item.options}
          choice={typeof value === "number" ? value : null}
          onChoose={(i) => onChange(i)}
          locked={Boolean(review)}
        />
      ) : (
        <BitsAnswer
          labels={item.labels}
          value={Array.isArray(value) ? value : item.labels.map(() => 0 as Bit)}
          onChange={onChange}
          locked={Boolean(review)}
        />
      )}
      {review ? (
        <p className={cn("mt-3 text-sm", review.ok ? "text-ok" : "text-danger")}>
          {review.ok ? "Правильно. " : `Неправильно. Правильна відповідь: ${review.correct}. `}
          {review.explain}
        </p>
      ) : null}
    </Panel>
  );
}

/** Test tab: questions drawn from the bank for this student; graded on the server. */
export function TestPanel({ topic }: { topic: CourseTopic }) {
  const ready = useSchoolReady();
  const progress = useMyProgress();
  const start = useStartTest(topic.id);
  const submit = useSubmitTest(topic.id);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<(number | Bit[] | null)[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  if (!ready) {
    return (
      <Panel>
        <p className="text-sm text-muted">
          Увійдіть через Google-акаунт, щоб пройти тест. Кожен студент отримує власні питання з бази.
        </p>
      </Panel>
    );
  }

  const stats = progress.data?.tests[topic.id];

  const begin = async () => {
    setResult(null);
    const a = await start.mutateAsync();
    setAttempt(a);
    setAnswers(a.items.map((it) => (it.kind === "bits" ? it.labels.map(() => 0 as Bit) : null)));
  };

  const finish = async () => {
    if (!attempt) return;
    const r = await submit.mutateAsync({
      salt: attempt.salt,
      answers: answers.map((a) => (a === null ? -1 : a)),
    });
    setResult(r);
  };

  if (!attempt) {
    return (
      <Panel>
        <h2 className="font-medium text-fg">Тест за темою</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {TEST_SIZE} питань, підібраних саме для вас із бази питань теми. Результат записується для
          викладача; тест можна пройти повторно — питання будуть іншими.
        </p>
        {stats ? (
          <p className="mt-3 text-sm text-muted">
            Спроб: <span className="font-mono text-fg">{stats.attempts}</span> · найкращий результат:{" "}
            <span className="font-mono text-fg">
              {stats.best}/{stats.total}
            </span>
          </p>
        ) : null}
        <Button className="mt-4" type="button" onClick={begin} disabled={start.isPending}>
          {start.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Почати тест
        </Button>
        {start.isError ? <p className="mt-3 text-sm text-danger">{start.error.message}</p> : null}
      </Panel>
    );
  }

  const allAnswered = answers.every((a) => a !== null);

  return (
    <div className="space-y-4">
      {result ? (
        <Panel>
          <p className="text-sm text-muted">Результат</p>
          <p className="mt-1 font-display text-3xl tabular-nums text-fg">
            {result.score}
            <span className="text-lg text-muted"> / {result.total}</span>
          </p>
          <Button
            className="mt-4"
            type="button"
            onClick={() => {
              setAttempt(null);
              setResult(null);
            }}
          >
            Пройти ще раз
          </Button>
        </Panel>
      ) : null}
      {attempt.items.map((item, i) => (
        <TestQuestion
          key={item.id}
          item={item}
          index={i}
          value={answers[i] ?? null}
          onChange={(v) => setAnswers((prev) => prev.map((p, j) => (j === i ? v : p)))}
          review={result?.review[i]}
        />
      ))}
      {!result ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={finish} disabled={!allAnswered || submit.isPending}>
            {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Завершити тест
          </Button>
          {!allAnswered ? (
            <span className="text-sm text-muted">Дайте відповідь на всі питання.</span>
          ) : null}
          {submit.isError ? <span className="text-sm text-danger">{submit.error.message}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
