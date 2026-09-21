import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RedirectToSignIn, SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useGroupReport } from "@/lib/school-client";
import { GENERATED_TASKS_PER_TOPIC } from "@/lib/task-generator";
import { TOPIC_IDS, TOPIC_BY_ID } from "@/lib/topics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/teacher/$groupId")({ component: ReportPage });

function cellClass(n: number, total: number): string {
  if (n >= total) return "text-ok";
  if (n === 0) return "text-subtle";
  return "text-muted";
}

function ReportTable({ groupId }: { groupId: string }) {
  const reportQuery = useGroupReport(groupId);
  if (reportQuery.isPending) return <p className="text-sm text-muted">Завантаження…</p>;
  if (reportQuery.isError) {
    return <p className="text-sm text-danger">{reportQuery.error.message}</p>;
  }
  const { groupName, rows } = reportQuery.data;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl text-fg sm:text-4xl">{groupName}</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          У групі ще немає студентів — надішліть їм код запрошення.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-border)]">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-subtle">
                <th className="px-3 py-2 font-medium">Студент</th>
                {TOPIC_IDS.map((t) => (
                  <th key={t} className="px-2 py-2 text-center font-mono font-medium">
                    {TOPIC_BY_ID[t].n}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-medium">Разом</th>
                <th className="px-3 py-2 text-center font-medium">Контрольна</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 text-fg">
                    {r.fullName || r.email || r.userId.slice(0, 8)}
                  </td>
                  {TOPIC_IDS.map((t) => (
                    <td
                      key={t}
                      className={cn(
                        "px-2 py-2 text-center font-mono tabular-nums",
                        cellClass(r.perTopic[t], GENERATED_TASKS_PER_TOPIC),
                      )}
                    >
                      {r.perTopic[t]}/{GENERATED_TASKS_PER_TOPIC}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-mono tabular-nums text-fg">
                    {r.totalDone}/{TOPIC_IDS.length * GENERATED_TASKS_PER_TOPIC}
                  </td>
                  <td className="px-3 py-2 text-center font-mono tabular-nums text-fg">
                    {r.examBest ? `${r.examBest.score}/${r.examBest.total}` : "—"}
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
