import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TopicSimulator } from "@/components/simulators";
import { PracticeTasks } from "@/components/task-panel";
import { TestPanel } from "@/components/test-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Figure } from "@/components/figures";
import { COURSE_BY_ID, EXTRAS, PRACTICE_SLOTS } from "@/lib/course";
import { useMyProgress, useSchoolReady } from "@/lib/school-client";

export const Route = createFileRoute("/lab/$topicId")({ component: TopicPage });

function TopicPage() {
  const { topicId } = Route.useParams();
  const ready = useSchoolReady();
  const progress = useMyProgress();
  const topic = COURSE_BY_ID[topicId];
  if (!topic) return <Navigate to="/" />;

  const extras = EXTRAS[topic.id];
  const done = progress.data?.practice[topic.id] ?? 0;
  const test = progress.data?.tests[topic.id];

  return (
    <AppShell current="home">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        Каталог
      </Link>

      <header className="mt-4 flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-subtle">
            Модуль {topic.module} · Тема {topic.n} · лекції {topic.lecture} год
            {topic.self ? ` · самостійно ${topic.self} год` : ""}
          </p>
          <h1 className="mt-1 font-display text-3xl text-fg">{topic.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{topic.blurb}</p>
          {topic.lab ? <p className="mt-2 text-sm text-accent">{topic.lab}</p> : null}
        </div>
        {ready ? (
          <div className="font-mono text-sm tabular-nums text-muted">
            <p>
              практика {done}/{PRACTICE_SLOTS}
            </p>
            <p>тест {test ? `${test.best}/${test.total}` : "—"}</p>
          </div>
        ) : null}
      </header>

      <Tabs defaultValue="theory" className="mt-8">
        <TabsList>
          <TabsTrigger value="theory">Теорія</TabsTrigger>
          <TabsTrigger value="practice">Практика</TabsTrigger>
          <TabsTrigger value="test">Тест</TabsTrigger>
        </TabsList>

        <TabsContent value="theory">
          <article className="space-y-5">
            {topic.theory.map((sec, idx) => (
              <div key={sec.title} className="space-y-4">
                <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
                  <h2 className="text-lg font-medium text-fg">{sec.title}</h2>
                  <p className="mt-2 text-base leading-relaxed text-muted">{sec.body}</p>
                  {sec.formula ? (
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-sm bg-surface-2 px-3 py-2 font-mono text-sm text-fg">
                      {sec.formula}
                    </pre>
                  ) : null}
                </section>
                {(extras?.figures ?? [])
                  .filter((f) => (f.after ?? 0) === idx)
                  .map((f) => (
                    <Figure key={f.id} id={f.id} caption={f.caption} />
                  ))}
              </div>
            ))}
            {extras?.example ? (
              <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
                <h2 className="text-lg font-medium text-fg">Приклад</h2>
                <p className="mt-1 text-base text-fg">{extras.example.title}</p>
                <ol className="mt-3 list-decimal space-y-2 pl-6 text-base leading-relaxed text-muted marker:text-subtle">
                  {extras.example.steps.map((st) => (
                    <li key={st}>{st}</li>
                  ))}
                </ol>
              </section>
            ) : null}
            <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
              <h2 className="text-lg font-medium text-fg">На що звернути увагу</h2>
              <ul className="mt-3 space-y-2 text-base leading-relaxed text-muted">
                {topic.notes.map((note) => (
                  <li key={note} className="flex gap-2">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </section>
            {extras?.terms.length ? (
              <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
                <h2 className="text-lg font-medium text-fg">Ключові терміни</h2>
                <dl className="mt-3 space-y-3 text-base leading-relaxed">
                  {extras.terms.map(([term, def]) => (
                    <div key={term}>
                      <dt className="font-medium text-fg">{term}</dt>
                      <dd className="text-muted">{def}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
          </article>
        </TabsContent>

        <TabsContent value="practice" className="space-y-6">
          {topic.sim ? <TopicSimulator topicId={topic.sim} /> : null}
          <PracticeTasks topic={topic} />
        </TabsContent>

        <TabsContent value="test">
          <TestPanel topic={topic} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
