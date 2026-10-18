import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TopicSimulator } from "@/components/simulators";
import { PracticeTasks } from "@/components/task-panel";
import { TestPanel } from "@/components/test-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COURSE_BY_ID, PRACTICE_SLOTS } from "@/lib/course";
import { useMyProgress, useSchoolReady } from "@/lib/school-client";

export const Route = createFileRoute("/lab/$topicId")({ component: TopicPage });

function TopicPage() {
  const { topicId } = Route.useParams();
  const ready = useSchoolReady();
  const progress = useMyProgress();
  const topic = COURSE_BY_ID[topicId];
  if (!topic) return <Navigate to="/" />;

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
          <article className="space-y-4">
            {topic.theory.map((s) => (
              <section
                key={s.title}
                className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]"
              >
                <h2 className="font-medium text-fg">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                {s.formula ? (
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-sm bg-surface-2 px-3 py-2 font-mono text-xs text-fg">
                    {s.formula}
                  </pre>
                ) : null}
              </section>
            ))}
            <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
              <h2 className="font-medium text-fg">На що звернути увагу</h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
                {topic.notes.map((note) => (
                  <li key={note} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </section>
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
