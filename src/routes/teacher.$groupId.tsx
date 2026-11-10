import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn, SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { COURSE_TOPICS, LABS, PRACTICE_SLOTS, questionKey } from "@/lib/course";
import type { StudentReportRow } from "@/lib/school";
import { useGroupReport, useQuestionStats, useSetLabAccepted } from "@/lib/school-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/teacher/$groupId")({ component: ReportPage });

const name = (r: StudentReportRow): string => r.fullName || r.email || r.userId.slice(0, 8);

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(groupName: string, rows: StudentReportRow[]) {
  const header = [
    "Студент",
    "Email",
    ...COURSE_TOPICS.flatMap((t) => [`Т${t.n} практика`, `Т${t.n} тест`]),
    "Завдань усього",
    "Тестів пройдено",
    ...LABS.map((l) => `ЛР ${l.number}`),
    "ЛР прийнято",
  ];
  const lines = rows.map((r) => [
    name(r),
    r.email ?? "",
    ...COURSE_TOPICS.flatMap((t) => {
      const tb = r.testBest[t.id];
      return [r.practice[t.id] ?? 0, tb ? `${tb.score}/${tb.total}` : ""];
    }),
    r.practiceDone,
    r.testsDone,
    ...LABS.map((l) => (r.labs[l.id] ? "так" : "")),
    r.labsDone,
  ]);
  const text = [header, ...lines].map((l) => l.map(csvCell).join(";")).join("\n");
  const blob = new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${groupName}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function ReportTable({ groupId }: { groupId: string }) {
  const reportQuery = useGroupReport(groupId);
  if (reportQuery.isPending) return <p className="text-sm text-muted">Завантаження…</p>;
  if (reportQuery.isError) return <p className="text-sm text-danger">{reportQuery.error.message}</p>;
  const { groupName, rows } = reportQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-fg sm:text-4xl">{groupName}</h1>
        {rows.length > 0 ? (
          <Button type="button" variant="secondary" onClick={() => downloadCsv(groupName, rows)}>
            <Download className="size-4" />
            Експорт CSV
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted">
        У клітинці: зараховані завдання практики (з {PRACTICE_SLOTS}) і найкращий результат тесту.
        Заголовки колонок — номери тем робочої програми.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">У групі ще немає студентів — надішліть їм код запрошення.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-border)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-subtle">
                <th className="sticky left-0 bg-surface px-3 py-2 font-medium">Студент</th>
                {COURSE_TOPICS.map((t) => (
                  <th key={t.id} className="px-2 py-2 text-center font-mono font-medium" title={t.title}>
                    {t.n}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-medium">Завд.</th>
                <th className="px-3 py-2 text-center font-medium">Тести</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b border-border/40 last:border-0">
                  <td className="sticky left-0 whitespace-nowrap bg-surface px-3 py-2 text-fg">{name(r)}</td>
                  {COURSE_TOPICS.map((t) => {
                    const p = r.practice[t.id] ?? 0;
                    const tb = r.testBest[t.id];
                    return (
                      <td key={t.id} className="px-2 py-1.5 text-center font-mono text-xs tabular-nums">
                        <div className={cn(p >= PRACTICE_SLOTS ? "text-ok" : p === 0 ? "text-subtle" : "text-muted")}>
                          {p}/{PRACTICE_SLOTS}
                        </div>
                        <div className={cn(tb ? "text-fg" : "text-subtle")}>
                          {tb ? `${tb.score}/${tb.total}` : "—"}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-mono tabular-nums text-fg">
                    {r.practiceDone}/{COURSE_TOPICS.length * PRACTICE_SLOTS}
                  </td>
                  <td className="px-3 py-2 text-center font-mono tabular-nums text-fg">
                    {r.testsDone}/{COURSE_TOPICS.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 ? <LabsTable groupId={groupId} rows={rows} /> : null}
      {rows.length > 0 ? <QuestionStats groupId={groupId} /> : null}
    </div>
  );
}

function LabsTable({ groupId, rows }: { groupId: string; rows: StudentReportRow[] }) {
  const set = useSetLabAccepted(groupId);
  return (
    <section className="space-y-3 pt-6">
      <h2 className="font-display text-xl text-fg">Лабораторні роботи</h2>
      <p className="text-sm text-muted">Натисніть клітинку, щоб позначити роботу як прийняту (повторне натискання знімає позначку).</p>
      <div className="overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-border)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs text-subtle">
              <th className="sticky left-0 bg-surface px-3 py-2 font-medium">Студент</th>
              {LABS.map((l) => (
                <th key={l.id} className="px-3 py-2 text-center font-mono font-medium" title={l.title}>
                  ЛР {l.number}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-medium">Разом</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className="border-b border-border/40 last:border-0">
                <td className="sticky left-0 whitespace-nowrap bg-surface px-3 py-2 text-fg">{name(r)}</td>
                {LABS.map((l) => {
                  const on = r.labs[l.id];
                  return (
                    <td key={l.id} className="px-1 py-1 text-center">
                      <button
                        type="button"
                        aria-pressed={on}
                        disabled={set.isPending}
                        onClick={() => set.mutate({ userId: r.userId, labId: l.id, accepted: !on })}
                        className={cn(
                          "inline-flex size-10 items-center justify-center rounded-sm font-mono text-base transition-colors duration-[var(--motion-quick)]",
                          on ? "bg-signal-dim text-ok" : "text-subtle hover:text-fg",
                        )}
                      >
                        {on ? "✓" : "—"}
                      </button>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center font-mono tabular-nums text-fg">
                  {r.labsDone}/{LABS.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {set.isError ? <p className="text-sm text-danger">{set.error.message}</p> : null}
    </section>
  );
}

function QuestionStats({ groupId }: { groupId: string }) {
  const stats = useQuestionStats(groupId);
  const lookup = new Map<string, string>();
  for (const t of COURSE_TOPICS) for (const row of t.bank) lookup.set(`${t.id}:${questionKey(row[0])}`, row[0]);
  const topicN = (id: string) => COURSE_TOPICS.find((t) => t.id === id)?.n ?? "?";
  return (
    <section className="space-y-3 pt-6">
      <h2 className="font-display text-xl text-fg">Найскладніші питання тестів</h2>
      <p className="text-sm text-muted">
        Питання з банку, на які група відповідає гірше за все (враховано питання щонайменше з трьома відповідями).
        Якщо майже всі помиляються — можливо, питання сформульоване нечітко.
      </p>
      {stats.isPending ? (
        <p className="text-sm text-muted">Завантаження…</p>
      ) : stats.isError ? (
        <p className="text-sm text-danger">{stats.error.message}</p>
      ) : stats.data.length === 0 ? (
        <p className="text-sm text-muted">Поки що замало відповідей: статистика зʼявиться після кількох пройдених тестів.</p>
      ) : (
        <ol className="space-y-2">
          {stats.data.map((q) => {
            const pct = Math.round((q.correctN / q.n) * 100);
            return (
              <li key={`${q.topic}:${q.qkey}`} className="rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
                <div className="flex flex-wrap items-baseline gap-x-3 font-mono text-xs tabular-nums">
                  <span className={pct < 40 ? "text-danger" : "text-muted"}>вірно {pct}%</span>
                  <span className="text-subtle">
                    {q.correctN}/{q.n} відповідей · тема {topicN(q.topic)}
                  </span>
                </div>
                <p className="mt-1 text-base text-fg">{lookup.get(`${q.topic}:${q.qkey}`) ?? "(питання вилучено з банку)"}</p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function ReportPage() {
  const { groupId } = Route.useParams();
  const { isPending } = useCurrentUserState();
  if (isPending) return null;
  return (
    <AppShell>
      <Link
        to="/teacher"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        Групи
      </Link>
      <div className="mt-4">
        <SignedOut>
          <RedirectToSignIn />
        </SignedOut>
        <SignedIn>
          <ReportTable groupId={groupId} />
        </SignedIn>
      </div>
    </AppShell>
  );
}
