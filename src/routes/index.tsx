import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { COURSE_TOPICS, MODULES, PRACTICE_SLOTS } from "@/lib/course";
import { useMyProgress, useSchoolReady } from "@/lib/school-client";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const ready = useSchoolReady();
  const progress = useMyProgress();
  const practiceDone = Object.values(progress.data?.practice ?? {}).reduce((a, b) => a + b, 0);
  const testsDone = Object.keys(progress.data?.tests ?? {}).length;
  const totalPractice = COURSE_TOPICS.length * PRACTICE_SLOTS;

  return (
    <AppShell current="home">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <p className="text-sm font-medium tracking-wide text-muted">Комп'ютерна схемотехніка</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.1] text-fg sm:text-5xl">
            Лабораторія на столі.
            <span className="block text-muted">Без паяльника.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            25 тем робочої програми у трьох модулях. У кожній темі — теорія, практика (макети й
            власні завдання) та тест із бази питань: у кожного студента свій варіант.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/lab/$topicId" params={{ topicId: "t01" }}>
                Почати з теми 1
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <p className="text-xs font-medium text-muted">Мій прогрес</p>
          {ready ? (
            <>
              <p className="mt-2 font-display text-3xl tabular-nums">
                {practiceDone}
                <span className="ml-1 text-lg text-muted">/ {totalPractice} завдань</span>
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-signal transition-[width] duration-[var(--motion-fast)] ease-[var(--ease-smooth-out)]"
                  style={{ width: `${(practiceDone / totalPractice) * 100}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted">
                Пройдено тестів:{" "}
                <span className="font-mono tabular-nums text-fg">
                  {testsDone}/{COURSE_TOPICS.length}
                </span>
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Увійдіть через Google-акаунт, щоб виконувати завдання й тести та зберігати результати.
            </p>
          )}
        </div>
      </section>

      <div className="mt-14 space-y-12">
        {MODULES.map((mod) => (
          <section key={mod.id}>
            <div className="mb-4">
              <h2 className="font-display text-xl text-fg">{mod.title}</h2>
              <p className="mt-1 text-sm text-muted">{mod.lead}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {COURSE_TOPICS.filter((t) => t.module === mod.id).map((topic) => {
                const p = progress.data?.practice[topic.id] ?? 0;
                const test = progress.data?.tests[topic.id];
                return (
                  <Link
                    key={topic.id}
                    to="/lab/$topicId"
                    params={{ topicId: topic.id }}
                    className="group rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-border-hover)]"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs text-subtle">
                        {String(topic.n).padStart(2, "0")}
                      </span>
                      <span className="font-medium text-fg">{topic.title}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{topic.blurb}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-muted">
                      {topic.sim ? <span className="text-accent">макет</span> : null}
                      {topic.lab ? <span>ЛР</span> : null}
                      {ready ? (
                        <>
                          <span>практика {p}/{PRACTICE_SLOTS}</span>
                          <span>
                            тест {test ? `${test.best}/${test.total}` : "—"}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
