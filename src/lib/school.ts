import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  COURSE_BY_ID,
  COURSE_TOPIC_IDS,
  PRACTICE_SLOTS,
  TEST_SIZE,
  correctText,
  isCorrect,
  practiceTask,
  stripSecrets,
  testTasks,
  type SecretTask,
} from "@/lib/course";

export type Role = "student" | "teacher";

export type MyProfile = {
  role: Role;
  fullName: string | null;
  email: string | null;
  /** Present for a student once they've joined a group. */
  group: { id: string; name: string } | null;
};

/**
 * Teacher emails, one per line/comma in the TEACHER_EMAILS env var
 * (e.g. "mitin@zac.org.ua"). Anyone else who signs in is a student by
 * default. Set by whoever deploys the app — see the deployment notes.
 */
function teacherEmails(): Set<string> {
  const raw = process.env.TEACHER_EMAILS ?? "";
  return new Set(
    raw
      .split(/[,\n]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

function randomCode(len = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * Ensures a `profile` row exists for the caller (role decided once, from
 * TEACHER_EMAILS, on first sign-in) and returns it plus their group, if any.
 */
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MyProfile> => {
    const { getSql } = await import("@/lib/db");
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const sql = await getSql();

    const existing = await sql<{ role: Role; full_name: string | null }>`
      select role, full_name from profile where user_id = ${context.userId}
    `;

    // this reads the session cookie directly — correct once deployed; on a
    // host with partitioned/third-party-cookie restrictions this could come
    // back null, which only affects the TEACHER_EMAILS auto-detection here.
    const user = await getSessionUser();
    const email = user?.email ?? null;

    let role: Role = existing[0]?.role ?? "student";
    const fullName = existing[0]?.full_name ?? null;

    if (existing.length === 0) {
      role = email && teacherEmails().has(email.toLowerCase()) ? "teacher" : "student";
      await sql`
        insert into profile (user_id, role) values (${context.userId}, ${role})
        on conflict (user_id) do nothing
      `;
    }

    const group = await sql<{ id: string; name: string }>`
      select g.id, g.name
      from group_members gm
      join groups g on g.id = gm.group_id
      where gm.user_id = ${context.userId}
      limit 1
    `;

    return {
      role,
      fullName,
      email,
      group: group[0] ?? null,
    };
  });

/** Student sets/updates their display name (shown to their teacher in the report). */
export const setMyName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { fullName: string }) => d)
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const name = data.fullName.trim().slice(0, 200);
    await sql`
      update profile set full_name = ${name || null} where user_id = ${context.userId}
    `;
  });

// ── Groups (teacher) ────────────────────────────────────────────────────

export type GroupSummary = { id: string; name: string; inviteCode: string; memberCount: number };

async function requireTeacher(userId: string): Promise<void> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ role: Role }>`select role from profile where user_id = ${userId}`;
  if (rows[0]?.role !== "teacher") {
    throw new Error("Тільки викладач може виконати цю дію.");
  }
}

export const listMyGroups = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<GroupSummary[]> => {
    await requireTeacher(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<
      { id: string; name: string; invite_code: string; member_count: number }
    >`
      select g.id, g.name, g.invite_code, count(gm.user_id)::int as member_count
      from groups g
      left join group_members gm on gm.group_id = g.id
      where g.teacher_id = ${context.userId}
      group by g.id
      order by g.created_at desc
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      inviteCode: r.invite_code,
      memberCount: r.member_count,
    }));
  });

export const createGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string }) => d)
  .handler(async ({ context, data }): Promise<GroupSummary> => {
    await requireTeacher(context.userId);
    const name = data.name.trim().slice(0, 200);
    if (!name) throw new Error("Вкажіть назву групи.");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const id = crypto.randomUUID();

    for (let attempt = 0; attempt < 5; attempt++) {
      const inviteCode = randomCode();
      try {
        await sql`
          insert into groups (id, teacher_id, name, invite_code)
          values (${id}, ${context.userId}, ${name}, ${inviteCode})
        `;
        return { id, name, inviteCode, memberCount: 0 };
      } catch (err) {
        // Unique violation on invite_code — retry with a fresh code.
        if (attempt === 4) throw err;
      }
    }
    throw new Error("Не вдалося створити групу.");
  });

/** Student joins a group by 6-symbol invite code. Re-joining is a no-op. */
export const joinGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { code: string }) => d)
  .handler(async ({ context, data }): Promise<{ id: string; name: string }> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const code = data.code.trim().toUpperCase();
    const rows = await sql<{ id: string; name: string }>`
      select id, name from groups where invite_code = ${code}
    `;
    const group = rows[0];
    if (!group) throw new Error("Групу з таким кодом не знайдено.");
    await sql`
      insert into group_members (group_id, user_id) values (${group.id}, ${context.userId})
      on conflict (group_id, user_id) do nothing
    `;
    return group;
  });

// ── Progress & tests ─────────────────────────────────────────────────────

export type MyProgress = {
  /** Practice slots passed, per course topic. */
  practice: Record<string, number>;
  /** Best and latest test result per course topic (only topics with attempts). */
  tests: Record<string, { best: number; last: number; total: number; attempts: number }>;
};

export const getMyProgress = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MyProgress> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const practiceRows = await sql<{ topic: string; n: number }>`
      select topic, count(*)::int as n
      from slot_progress
      where user_id = ${context.userId} and correct = true
      group by topic
    `;
    const testRows = await sql<{
      topic: string;
      best: number;
      total: number;
      attempts: number;
      last: number;
    }>`
      select t.topic,
             max(t.score)::int as best,
             max(t.total)::int as total,
             count(*)::int as attempts,
             (array_agg(t.score order by t.taken_at desc))[1]::int as last
      from test_results t
      where t.user_id = ${context.userId}
      group by t.topic
    `;
    const practice: Record<string, number> = {};
    for (const id of COURSE_TOPIC_IDS) practice[id] = 0;
    for (const r of practiceRows) if (r.topic in practice) practice[r.topic] = Math.min(r.n, PRACTICE_SLOTS);
    const tests: MyProgress["tests"] = {};
    for (const r of testRows) {
      if (!(r.topic in COURSE_BY_ID)) continue;
      tests[r.topic] = { best: r.best, last: r.last, total: r.total, attempts: r.attempts };
    }
    return { practice, tests };
  });

/**
 * Grades a practice answer by RECOMPUTING the canonical task server-side from
 * (topic, slot, userId) — the client's own "correct" claim is never trusted.
 */
export const recordSlotAttempt = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { topic: string; slot: number; answer: unknown }) => d)
  .handler(async ({ context, data }): Promise<{ correct: boolean }> => {
    const topic = COURSE_BY_ID[data.topic];
    if (!topic) throw new Error("Невідома тема.");
    if (!Number.isInteger(data.slot) || data.slot < 0 || data.slot >= PRACTICE_SLOTS) {
      throw new Error("Невірний номер завдання.");
    }
    const task = practiceTask(topic, data.slot, context.userId);
    const ok = isCorrect(task, data.answer);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into slot_progress (user_id, topic, slot, correct, attempts, updated_at)
      values (${context.userId}, ${topic.id}, ${data.slot}, ${ok}, 1, now())
      on conflict (user_id, topic, slot) do update
        set correct = slot_progress.correct or excluded.correct,
            attempts = slot_progress.attempts + 1,
            updated_at = now()
    `;
    return { correct: ok };
  });

/** Which practice slots the student has already passed (so the UI can mark them). */
export const getPassedSlots = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { topic: string }) => d)
  .handler(async ({ context, data }): Promise<number[]> => {
    if (!COURSE_BY_ID[data.topic]) return [];
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ slot: number }>`
      select slot from slot_progress
      where user_id = ${context.userId} and topic = ${data.topic} and correct = true
      order by slot
    `;
    return rows.map((r) => r.slot);
  });

// ── Tests (per-student, drawn from the question bank) ────────────────────

/** Starts a test attempt: returns the student's own questions WITHOUT answers. */
export const startTest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { topic: string }) => d)
  .handler(async ({ context, data }): Promise<{ salt: string; items: SecretTask[] }> => {
    const topic = COURSE_BY_ID[data.topic];
    if (!topic) throw new Error("Невідома тема.");
    const salt = crypto.randomUUID();
    return { salt, items: testTasks(topic, context.userId, salt).map(stripSecrets) };
  });

export type TestReview = { ok: boolean; correct: string; explain: string };

/** Grades a finished attempt by regenerating it from (user, topic, salt). */
export const submitTest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { topic: string; salt: string; answers: unknown[] }) => d)
  .handler(
    async ({ context, data }): Promise<{ score: number; total: number; review: TestReview[] }> => {
      const topic = COURSE_BY_ID[data.topic];
      if (!topic) throw new Error("Невідома тема.");
      if (typeof data.salt !== "string" || data.salt.length < 8 || data.salt.length > 64) {
        throw new Error("Невірний тест.");
      }
      const tasks = testTasks(topic, context.userId, data.salt);
      const review: TestReview[] = tasks.map((task, i) => ({
        ok: isCorrect(task, data.answers?.[i]),
        correct: correctText(task),
        explain: task.explain,
      }));
      const score = review.filter((r) => r.ok).length;
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      await sql`
        insert into test_results (user_id, topic, score, total)
        values (${context.userId}, ${topic.id}, ${score}, ${tasks.length})
      `;
      return { score, total: tasks.length, review };
    },
  );

export { PRACTICE_SLOTS, TEST_SIZE };

// ── Teacher report ──────────────────────────────────────────────────────

export type StudentReportRow = {
  userId: string;
  fullName: string | null;
  email: string | null;
  practice: Record<string, number>;
  testBest: Record<string, { score: number; total: number } | null>;
  practiceDone: number;
  testsDone: number;
};

export const getGroupReport = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { groupId: string }) => d)
  .handler(async ({ context, data }): Promise<{ groupName: string; rows: StudentReportRow[] }> => {
    await requireTeacher(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();

    const group = await sql<{ name: string; teacher_id: string }>`
      select name, teacher_id from groups where id = ${data.groupId}
    `;
    if (!group[0] || group[0].teacher_id !== context.userId) {
      throw new Error("Групу не знайдено.");
    }

    const members = await sql<{ user_id: string; full_name: string | null; email: string | null }>`
      select gm.user_id, p.full_name, u.email
      from group_members gm
      left join profile p on p.user_id = gm.user_id
      left join "user" u on u.id = gm.user_id
      where gm.group_id = ${data.groupId}
      order by coalesce(p.full_name, u.email)
    `;

    const practice = await sql<{ user_id: string; topic: string; n: number }>`
      select sp.user_id, sp.topic, count(*)::int as n
      from slot_progress sp
      join group_members gm on gm.group_id = ${data.groupId} and gm.user_id = sp.user_id
      where sp.correct = true
      group by sp.user_id, sp.topic
    `;

    const tests = await sql<{ user_id: string; topic: string; score: number; total: number }>`
      select distinct on (tr.user_id, tr.topic) tr.user_id, tr.topic, tr.score, tr.total
      from test_results tr
      join group_members gm on gm.group_id = ${data.groupId} and gm.user_id = tr.user_id
      order by tr.user_id, tr.topic, tr.score desc, tr.taken_at desc
    `;

    const rows: StudentReportRow[] = members.map((m) => {
      const pr: Record<string, number> = {};
      const tb: StudentReportRow["testBest"] = {};
      for (const id of COURSE_TOPIC_IDS) {
        pr[id] = 0;
        tb[id] = null;
      }
      for (const p of practice) {
        if (p.user_id === m.user_id && p.topic in pr) pr[p.topic] = Math.min(p.n, PRACTICE_SLOTS);
      }
      for (const t of tests) {
        if (t.user_id === m.user_id && t.topic in tb) tb[t.topic] = { score: t.score, total: t.total };
      }
      return {
        userId: m.user_id,
        fullName: m.full_name,
        email: m.email,
        practice: pr,
        testBest: tb,
        practiceDone: Object.values(pr).reduce((a, b) => a + b, 0),
        testsDone: Object.values(tb).filter(Boolean).length,
      };
    });

    return { groupName: group[0].name, rows };
  });
