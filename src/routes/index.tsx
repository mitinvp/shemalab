import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  TOTAL_TASKS,
  topicDoneCount,
  totalDone,
  useProgress,
} from "@/lib/progress";
import { GROUPS, TASKS_PER_TOPIC, TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const ready = useProgress((s) => s.ready);
  const completed = useProgress((s) => s.completed);
  const examBest = useProgress((s) => s.examBest);
  const reset = useProgress((s) => s.reset);
  const done = ready ? totalDone(completed) : 0;

  return (
    <AppShell current="home">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <p className="text-sm font-medium tracking-wide text-muted">
            Цифрова схемотехніка
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[1.1] text-fg sm:text-5xl">
            Лабораторія на столі.
            <span className="block text-muted">Без паяльника.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Десять вузлів програми: від логічних елементів до регістрів і
            суматорів. Перемикайте входи, дивіться таблиці істинності й здавайте
            короткі вправи з автоперевіркою.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/lab/$topicId" params={{ topicId: "gates" }}>
                Почати з елементів
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/practice">Контрольна з 10 тем</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <p className="text-xs font-medium text-muted">Прогрес у цьому браузері</p>
          <p className="mt-2 font-display text-3xl tabular-nums">
            {ready ? done : "—"}
            <span className="ml-1 text-lg text-muted">/ {TOTAL_TASKS}</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-signal transition-[width] duration-[var(--motion-fast)] ease-[var(--ease-smooth-out)]"
              style={{ width: `${ready ? (done / TOTAL_TASKS) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-muted">
            Найкраща контрольна:{" "}
            <span className="font-mono tabular-nums text-fg">
              {ready ? examBest : "—"}/10
            </span>
          </p>
        </div>
      </section>

      <div className="mt-14 space-y-10">
        {GROUPS.map((group) => (
          <section key={group.id}>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl text-fg">{group.title}</h2>
              <p className="text-sm text-muted">{group.lead}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {TOPICS.filter((t) => t.group === group.id).map((topic) => {
                const n = ready ? topicDoneCount(completed, topic.id) : 0;
                const Icon = topic.icon;
                return (
                  <Link
                    key={topic.id}
                    to="/lab/$topicId"
                    params={{ topicId: topic.id }}
                    className="group rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-border-hover)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid size-11 place-items-center rounded-sm bg-surface-2 text-fg">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-subtle">
                            {topic.n}
                          </span>
                          <span className="truncate font-medium text-fg">
                            {topic.title}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-muted">
                          {topic.blurb}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                            <div
                              className={cn(
                                "h-full bg-signal transition-[width] duration-[var(--motion-fast)]",
                              )}
                              style={{
                                width: `${(n / TASKS_PER_TOPIC) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="font-mono text-xs tabular-nums text-muted">
                            {ready ? `${n}/${TASKS_PER_TOPIC}` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          {
            t: "Макет",
            d: "DIP-корпус, світлодіоди рівнів, такт CLK і жива таблиця істинності.",
          },
          {
            t: "Теорія",
            d: "Короткі формулювання з лекції: формули, заборонені стани, модулі.",
          },
          {
            t: "Завдання",
            d: "Пʼять вправ на тему. Неправильну відповідь можна виправити одразу.",
          },
        ].map((item) => (
          <div
            key={item.t}
            className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]"
          >
            <h3 className="font-medium text-fg">{item.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.d}</p>
          </div>
        ))}
      </section>

      {ready && done > 0 ? (
        <p className="mt-10 text-center">
          <button
            type="button"
            onClick={reset}
            className="text-sm text-subtle underline-offset-4 hover:text-muted hover:underline"
          >
            Скинути прогрес у цьому браузері
          </button>
        </p>
      ) : null}
    </AppShell>
  );
}

