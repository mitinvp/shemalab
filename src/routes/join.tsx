import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/circuit";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn, SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useJoinGroup, useMyProfile, useSetMyName } from "@/lib/school-client";

export const Route = createFileRoute("/join")({ component: JoinPage });

function JoinForm() {
  const navigate = useNavigate();
  const profileQuery = useMyProfile();
  const joinGroup = useJoinGroup();
  const setMyName = useSetMyName();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const group = profileQuery.data?.group ?? null;

  if (group) {
    return (
      <Panel>
        <p className="text-sm text-fg">
          Ви в групі <span className="font-medium">{group.name}</span>.
        </p>
        <Button asChild className="mt-4">
          <Link to="/">До каталогу</Link>
        </Button>
      </Panel>
    );
  }

  const submit = async () => {
    if (name.trim()) await setMyName.mutateAsync(name);
    await joinGroup.mutateAsync(code);
    navigate({ to: "/" });
  };

  return (
    <Panel>
      <h1 className="font-display text-2xl text-fg">Приєднатись до групи</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Введіть код групи, який дав викладач, і своє ПІБ — воно буде у звіті.
      </p>
      <div className="mt-5 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Прізвище Ім'я"
          className="min-h-11 w-full rounded-sm bg-surface-2 px-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none placeholder:text-subtle"
        />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="КОД ГРУПИ"
          maxLength={6}
          className="min-h-11 w-full rounded-sm bg-surface-2 px-3 font-mono text-sm tracking-widest text-fg shadow-[var(--shadow-border)] outline-none placeholder:text-subtle"
        />
      </div>
      <Button
        type="button"
        className="mt-4"
        onClick={submit}
        disabled={code.trim().length < 4 || joinGroup.isPending}
      >
        Приєднатись
      </Button>
      {joinGroup.isError ? (
        <p className="mt-3 text-sm text-danger">{joinGroup.error.message}</p>
      ) : null}
    </Panel>
  );
}

function JoinPage() {
  const { isPending } = useCurrentUserState();
  if (isPending) return null;
  return (
    <AppShell>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <div className="mx-auto mt-16 max-w-sm">
          <JoinForm />
        </div>
      </SignedIn>
    </AppShell>
  );
}
