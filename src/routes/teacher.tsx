import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/circuit";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn, SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useCreateGroup, useMyGroups, useMyProfile } from "@/lib/school-client";

export const Route = createFileRoute("/teacher")({ component: TeacherPage });

function TeacherDashboard() {
  const profileQuery = useMyProfile();
  const groupsQuery = useMyGroups();
  const createGroup = useCreateGroup();
  const [name, setName] = useState("");

  if (profileQuery.isPending) return <p className="mt-8 text-sm text-muted">Завантаження…</p>;
  if (profileQuery.data && profileQuery.data.role !== "teacher") {
    return (
      <Panel>
        <p className="text-sm text-fg">Цей розділ доступний лише викладачу.</p>
      </Panel>
    );
  }

  const submit = async () => {
    if (!name.trim()) return;
    await createGroup.mutateAsync(name.trim());
    setName("");
  };

  return (
    <div className="space-y-6">
      <Panel>
        <h2 className="font-medium text-fg">Нова група</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Наприклад, КІ-21"
            className="min-h-11 min-w-48 flex-1 rounded-sm bg-surface-2 px-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none placeholder:text-subtle"
          />
          <Button type="button" onClick={submit} disabled={createGroup.isPending}>
            <Plus className="size-4" />
            Створити
          </Button>
        </div>
      </Panel>

      <div className="space-y-3">
        {groupsQuery.data?.length === 0 ? (
          <p className="text-sm text-muted">Груп ще немає — створіть першу вище.</p>
        ) : null}
        {groupsQuery.data?.map((g) => (
          <Panel key={g.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link
                  to="/teacher/$groupId"
                  params={{ groupId: g.id }}
                  className="font-medium text-fg hover:underline"
                >
                  {g.name}
                </Link>
                <p className="mt-1 font-mono text-xs text-muted">
                  {g.memberCount} студент(ів)
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(g.inviteCode)}
                className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-surface-2 px-3 font-mono text-sm tracking-widest text-fg shadow-[var(--shadow-border)]"
                title="Скопіювати код запрошення"
              >
                {g.inviteCode}
                <Copy className="size-3.5" />
              </button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function TeacherPage() {
  const { isPending } = useCurrentUserState();
  if (isPending) return null;
  return (
    <AppShell>
      <p className="text-sm font-medium tracking-wide text-muted">Кабінет викладача</p>
      <h1 className="mt-2 font-display text-3xl text-fg sm:text-4xl">Групи</h1>
      <div className="mt-8">
        <SignedOut>
          <RedirectToSignIn />
        </SignedOut>
        <SignedIn>
          <TeacherDashboard />
        </SignedIn>
      </div>
    </AppShell>
  );
}
