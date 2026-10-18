import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { COURSE_TOPICS, PRACTICE_SLOTS } from "@/lib/course";
import { useMyProfile, useMyProgress, useSchoolReady } from "@/lib/school-client";
import { cn } from "@/lib/utils";

function ChipMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-7 text-fg" aria-hidden>
      <rect
        x="8"
        y="6"
        width="16"
        height="20"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4 11 h4 M4 16 h4 M4 21 h4 M24 11 h4 M24 16 h4 M24 21 h4"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect x="12" y="12" width="8" height="8" rx="1" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

export function AppShell({
  children,
  current,
}: {
  children: ReactNode;
  current?: "home";
}) {
  const ready = useSchoolReady();
  const progress = useMyProgress();
  const done = Object.values(progress.data?.practice ?? {}).reduce((a, b) => a + b, 0);
  const total = COURSE_TOPICS.length * PRACTICE_SLOTS;

  return (
    <div className="lab-grid min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-bg/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex min-h-11 items-center gap-2.5 text-fg"
            aria-label="СхемаЛаб — на головну"
          >
            <ChipMark />
            <span className="font-display text-lg leading-none">СхемаЛаб</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            <NavLink to="/" active={current === "home"}>
              Каталог
            </NavLink>
            <AccountNav />
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full bg-signal transition-[width] duration-[var(--motion-fast)] ease-[var(--ease-smooth-out)]"
                style={{ width: `${ready ? (done / total) * 100 : 0}%` }}
              />
            </div>
            <span className="font-mono text-xs tabular-nums text-muted">
              {ready ? `${done}/${total}` : "—"}
            </span>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 pb-20">{children}</div>
    </div>
  );
}

function AccountNav() {
  const { user, isPending } = useCurrentUserState();
  const schoolReady = useSchoolReady();
  const profileQuery = useMyProfile();

  if (!authEnabled || isPending) return null;

  if (!user) {
    return (
      <NavLink to="/login" active={false}>
        Увійти
      </NavLink>
    );
  }

  const role = profileQuery.data?.role;
  const hasGroup = Boolean(profileQuery.data?.group);

  return (
    <>
      {role === "teacher" ? (
        <NavLink to="/teacher" active={false}>
          Кабінет викладача
        </NavLink>
      ) : schoolReady && !hasGroup ? (
        <NavLink to="/join" active={false}>
          Приєднатись до групи
        </NavLink>
      ) : null}
      <button
        type="button"
        onClick={() => signOut("/")}
        className="inline-flex h-11 min-h-11 items-center gap-1.5 rounded-sm px-3 text-sm font-medium text-muted transition-colors duration-[var(--motion-quick)] hover:text-fg"
        title="Вийти"
      >
        <LogOut className="size-4" />
      </button>
    </>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: "/" | "/practice" | "/login" | "/teacher" | "/join";
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex h-11 min-h-11 items-center rounded-sm px-3 text-sm font-medium transition-colors duration-[var(--motion-quick)]",
        active ? "text-fg" : "text-muted hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}
