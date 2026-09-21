import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/circuit";
import { RedirectToSignIn, SignedIn, SignedOut } from "@/lib/auth/gates";
import { signInGoogle } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { isPending } = useCurrentUserState();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInGoogle("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося увійти.");
      setBusy(false);
    }
  };

  if (isPending) return null;

  return (
    <AppShell>
      <SignedIn>
        <RedirectToSignIn to="/" />
      </SignedIn>
      <SignedOut>
        <div className="mx-auto mt-16 max-w-sm">
          <Panel>
            <h1 className="font-display text-2xl text-fg">Вхід</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Увійдіть через Google-акаунт коледжу, щоб бачити свій прогрес і
              звіти зберігались для викладача.
            </p>
            <Button type="button" className="mt-5 w-full" onClick={go} disabled={busy}>
              Увійти через Google
            </Button>
            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          </Panel>
        </div>
      </SignedOut>
    </AppShell>
  );
}
