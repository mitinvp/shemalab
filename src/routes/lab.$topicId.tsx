import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TopicSimulator } from "@/components/simulators";
import { TaskPanel } from "@/components/task-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { topicDoneCount, useProgress } from "@/lib/progress";
import { useMyProgress, useSchoolReady } from "@/lib/school-client";
import { GENERATED_TASKS_PER_TOPIC } from "@/lib/task-generator";
import { isTopicId, TASKS_PER_TOPIC, TOPIC_BY_ID } from "@/lib/topics";

export const Route = createFileRoute("/lab/$topicId")({
  component: LabPage,
});

function LabPage() {
  const { topicId } = Route.useParams();
  const ready = useProgress((s) => s.ready);
  const completed = useProgress((s) => s.completed);
  const schoolReady = useSchoolReady();
  const progressQuery = useMyProgress();
  if (!isTopicId(topicId)) return <Navigate to="/" />;
  const topic = TOPIC_BY_ID[topicId];
  const Icon = topic.icon;
  const n = schoolReady
    ? (progressQuery.data?.[topicId] ?? 0)
    : ready
      ? topicDoneCount(completed, topicId)
      : 0;
  const total = schoolReady ? GENERATED_TASKS_PER_TOPIC : TASKS_PER_TOPIC;

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
        <div className="grid size-12 place-items-center rounded-md bg-surface shadow-[var(--shadow-border)]">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-subtle">
            {topic.n} · {topic.en} · {topic.hours}
          </p>
          <h1 className="mt-1 font-display text-3xl text-fg">{topic.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {topic.blurb}
          </p>
        </div>
        <p className="font-mono text-sm tabular-nums text-muted">
          {schoolReady || ready ? `${n}/${total}` : "—"}
        </p>
      </header>

      <Tabs defaultValue="sim" className="mt-8">
        <TabsList>
          <TabsTrigger value="theory">Теорія</TabsTrigger>
          <TabsTrigger value="sim">Макет</TabsTrigger>
          <TabsTrigger value="tasks">Завдання</TabsTrigger>
        </TabsList>
        <TabsContent value="theory">
          <article className="space-y-4">
            {topic.sections.map((s) => (
              <section
                key={s.title}
                className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]"
              >
                <h2 className="font-medium text-fg">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                {s.formula ? (
                  <pre className="mt-3 overflow-x-auto rounded-sm bg-surface-2 px-3 py-2 font-mono text-xs text-fg">
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
        <TabsContent value="sim">
          <TopicSimulator topicId={topicId} />
        </TabsContent>
        <TabsContent value="tasks">
          <TaskPanel topicId={topicId} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
