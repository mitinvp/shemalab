import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { COURSE_BY_ID, LAB_BY_ID, type LabVariant } from "@/lib/course";
import { useMyProfile, useMyProgress, useSchoolReady } from "@/lib/school-client";

export const Route = createFileRoute("/labwork/$labId")({ component: LabPage });

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <h2 className="text-lg font-medium text-fg">{title}</h2>
      <div className="mt-3 text-base leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function List({ items, ordered }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`space-y-2 pl-6 ${ordered ? "list-decimal" : "list-disc"} marker:text-subtle`}>
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </Tag>
  );
}

function VariantView({ v, open }: { v: LabVariant; open?: boolean }) {
  return (
    <>
      <List items={v.task} ordered />
      <details className="mt-4 rounded-sm bg-surface-2 px-3 py-2" open={open}>
        <summary className="cursor-pointer text-sm font-medium text-fg">Контрольні відповіді для самоперевірки</summary>
        <div className="mt-2 text-base">
          <List items={v.check} />
        </div>
      </details>
    </>
  );
}

function LabPage() {
  const { labId } = Route.useParams();
  const lab = LAB_BY_ID[labId];
  const user = useCurrentUser();
  const ready = useSchoolReady();
  const profile = useMyProfile();
  const progress = useMyProgress();
  const [email, setEmail] = useState("");
  if (!lab) return <Navigate to="/" />;
  const topic = COURSE_BY_ID[lab.topicId];
  const isTeacher = profile.data?.role === "teacher";
  const myEmail = user?.primaryEmail ?? null;

  return (
    <AppShell current="home">
      <Link
        to="/lab/$topicId"
        params={{ topicId: lab.topicId }}
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        Тема {topic?.n}: {topic?.title}
      </Link>

      <header className="mt-4">
        <p className="font-mono text-xs text-subtle">Лабораторна робота № {lab.number}</p>
        <h1 className="mt-1 font-display text-3xl text-fg">{lab.title}</h1>
        {progress.data?.labs.includes(lab.id) ? (
          <p className="mt-2 inline-block rounded-sm bg-signal-dim px-3 py-1 text-sm text-ok">✓ Лабораторну прийнято викладачем</p>
        ) : null}
      </header>

      <div className="mt-6 space-y-5">
        <Card title="Мета">
          <p>{lab.goal}</p>
        </Card>
        <Card title="Обладнання та програмне забезпечення">
          <List items={lab.equipment} />
        </Card>

        <Card title="Ваш варіант">
          {ready && myEmail ? (
            <VariantView v={lab.variant(myEmail)} />
          ) : (
            <p>Увійдіть через Google-акаунт, щоб отримати персональний варіант завдання.</p>
          )}
        </Card>

        <Card title="Хід роботи">
          <List items={lab.steps} ordered />
        </Card>
        <Card title="Вимоги до звіту">
          <List items={lab.report} />
        </Card>
        <Card title="Контрольні запитання">
          <List items={lab.questions} ordered />
        </Card>

        {isTeacher ? (
          <Card title="Для викладача: варіант студента">
            <p className="text-sm">Введіть email студента (як у звіті групи) — побачите його варіант і правильні відповіді.</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@zac.org.ua"
              className="mt-3 min-h-11 w-full rounded-sm bg-surface-2 px-3 text-base text-fg shadow-[var(--shadow-border)] outline-none focus:shadow-[var(--shadow-border-hover)]"
            />
            {email.includes("@") ? (
              <div className="mt-4">
                <VariantView v={lab.variant(email.trim())} open />
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
