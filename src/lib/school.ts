import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { GENERATED_TASKS_PER_TOPIC, generateTask } from "@/lib/task-generator";
import { TOPIC_IDS, type TopicId } from "@/lib/topics";
import { bitsEqual, type Bit } from "@/lib/digital";

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

// ── Progress ─────────────────────────────────────────────────────────────

export type TopicProgress = Record<TopicId, number>;

export const getMyProgress = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TopicProgress> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ topic: TopicId; n: number }>`
      select topic, count(*)::int as n
      from slot_progress
      where user_id = ${context.userId} and correct = true
      group by topic
    `;
    const out = Object.fromEntries(TOPIC_IDS.map((t) => [t, 0])) as TopicProgress;
    for (const r of rows) out[r.topic] = r.n;
    return out;
  });

/**
 * Grades a submitted answer by RECOMPUTING the canonical task server-side
 * from (topic, slot, userId) — the client's own "correct" claim is never
 * trusted, so opening devtools can't forge a passed slot.
 */
export const recordSlotAttempt = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { topic: TopicId; slot: number; answer: Bit[] | number }) => d)
  .handler(async ({ context, data }): Promise<{ correct: boolean; explain: string }> => {
    const task = generateTask(data.topic, data.slot, context.userId);
    const ok =
      task.kind === "mcq"
        ? typeof data.answer === "number" && data.answer === task.correct
        : Array.isArray(data.answer) && bitsEqual(data.answer, task.correct);

    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into slot_progress (user_id, topic, slot, correct, attempts, updated_at)
      values (${context.userId}, ${data.topic}, ${data.slot}, ${ok}, 1, now())
      on conflict (user_id, topic, slot) do update
        set correct = slot_progress.correct or excluded.correct,
            attempts = slot_progress.attempts + 1,
            updated_at = now()
    `;
    return { correct: ok, explain: task.explain };
  });

export const submitExamResult = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { attemptSalt: string; answers: Record<TopicId, Bit[] | number> }) => d)
  .handler(async ({ context, data }): Promise<{ score: number; total: number }> => {
    let score = 0;
    for (const topic of TOPIC_IDS) {
      const task = generateTask(topic, 0, `${context.userId}#${data.attemptSalt}`);
      const answer = data.answers[topic];
      const ok =
        task.kind === "mcq"
          ? typeof answer === "number" && answer === task.correct
          : Array.isArray(answer) && bitsEqual(answer, task.correct);
      if (ok) score += 1;
    }
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into exam_results (user_id, score, total) values (${context.userId}, ${score}, ${TOPIC_IDS.length})
    `;
    return { score, total: TOPIC_IDS.length };
  });

// ── Teacher report ──────────────────────────────────────────────────────

export type StudentReportRow = {
  userId: string;
  fullName: string | null;
  email: string | null;
  perTopic: Record<TopicId, number>;
  totalDone: number;
  examBest: { score: number; total: number } | null;
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

    const progress = await sql<{ user_id: string; topic: TopicId; n: number }>`
      select sp.user_id, sp.topic, count(*)::int as n
      from slot_progress sp
      join group_members gm on gm.group_id = ${data.groupId} and gm.user_id = sp.user_id
      where sp.correct = true
      group by sp.user_id, sp.topic
    `;

    const examBest = await sql<{ user_id: string; score: number; total: number }>`
      select distinct on (er.user_id) er.user_id, er.score, er.total
      from exam_results er
      join group_members gm on gm.group_id = ${data.groupId} and gm.user_id = er.user_id
      order by er.user_id, er.score desc, er.taken_at desc
    `;

    const rows: StudentReportRow[] = members.map((m) => {
      const perTopic = Object.fromEntries(TOPIC_IDS.map((t) => [t, 0])) as Record<TopicId, number>;
      for (const p of progress) if (p.user_id === m.user_id) perTopic[p.topic] = p.n;
      const totalDone = Object.values(perTopic).reduce((a, b) => a + b, 0);
      const best = examBest.find((e) => e.user_id === m.user_id) ?? null;
      return {
        userId: m.user_id,
        fullName: m.full_name,
        email: m.email,
        perTopic,
        totalDone,
        examBest: best ? { score: best.score, total: best.total } : null,
      };
    });

    return { groupName: group[0].name, rows };
  });

export { GENERATED_TASKS_PER_TOPIC };
