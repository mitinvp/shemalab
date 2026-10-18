import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn, SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { COURSE_TOPICS, PRACTICE_SLOTS } from "@/lib/course";
import type { StudentReportRow } from "@/lib/school";
import { useGroupReport } from "@/lib/school-client";
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
    </div>
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
