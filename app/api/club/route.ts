import { pushAction, notifyUser } from "@/lib/push-server";
import { registerBooking } from "@/lib/booking-server";
import { teamAction } from "@/lib/teams-server";
import { database } from "@/lib/db";
import { fests, events, ClubEvent, Fest } from "@/lib/data";
import { catalogFests, catalogEvents } from "@/lib/catalog-additions";
import { identity, AuthError, type Identity } from "@/lib/firebase-server";
import { safeCover } from "@/lib/community-types";
export const dynamic = "force-dynamic";
const sharedWorkspace = "clubos-public-v1";
const now = () => new Date().toISOString();
const active = "status IN ('confirmed','checked_in','pending_payment')";
function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", Vary: "Authorization" },
  });
}
async function workspace() {
  if (
    !(await database()
      .prepare("SELECT id FROM workspaces WHERE id=?")
      .bind(sharedWorkspace)
      .first())
  )
    await seed();
  return sharedWorkspace;
}
function validateText(x: unknown, min = 1, max = 180) {
  if (typeof x !== "string" || x.trim().length < min || x.length > max)
    throw new Error("Please complete all required fields correctly.");
  return x.trim();
}
async function seed() {
  const db = database(),
    id = sharedWorkspace;
  const statements = [
    db
      .prepare("INSERT OR IGNORE INTO workspaces(id,created) VALUES(?,?)")
      .bind(id, now()),
  ];
  for (const f of fests)
    statements.push(
      db
        .prepare("INSERT OR IGNORE INTO festivals VALUES(?,?,?)")
        .bind(id, f.id, JSON.stringify(f)),
    );
  for (const e of events)
    statements.push(
      db
        .prepare("INSERT OR IGNORE INTO events VALUES(?,?,?,?,?,?,?,?)")
        .bind(
          id,
          e.id,
          e.festId,
          JSON.stringify(e),
          e.capacity,
          new Date(e.deadline).toISOString(),
          new Date(e.start).toISOString(),
          new Date(e.end).toISOString(),
        ),
    );
  const names = [
    "Samira Ahmed",
    "Arif Rahman",
    "Nusrat Jahan",
    "Rafi Hasan",
    "Tanha Islam",
    "Sajid Khan",
    "Meher Noor",
    "Adnan Rahim",
    "Farhan Ahmed",
    "Nabila Hossain",
    "Rayan Karim",
    "Ishrat Jahan",
    "Sadia Akter",
    "Zayan Ahmed",
    "Ayesha Noor",
    "Fahim Hasan",
  ];
  for (let i = 0; i < names.length; i++) {
    const eventId =
      i < 4
        ? "design"
        : i < 9
          ? "ai-web"
          : i < 12
            ? "robo"
            : i < 14
              ? "code-sprint"
              : "quiz";
    statements.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO registrations(id,workspace,event_id,name,email,institution,status,own,created) VALUES(?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          eventId,
          i === 4 ? "Student Explorer" : names[i],
          i === 4 ? "student@example.test" : `participant${i + 1}@example.test`,
          i % 2 ? "Dhaka Residential Model College" : "Dhaka College",
          i === 7 ? "checked_in" : "confirmed",
          0,
          now(),
        ),
    );
  }
  await db.batch(statements);
  await expandCatalog(id);
  return id;
}
async function snapshot(id: string, user: Identity | null) {
  const db = database();
  const [fs, es, rs, totals] = await db.batch([
    db
      .prepare("SELECT data FROM festivals WHERE workspace=? ORDER BY rowid")
      .bind(id),
    db
      .prepare("SELECT data FROM events WHERE workspace=? ORDER BY start")
      .bind(id),
    db
      .prepare(
        "SELECT id,event_id AS eventId,owner_uid AS ownerUid,name,email,institution,status,CASE WHEN owner_uid=? OR EXISTS(SELECT 1 FROM json_each(registrations.members) m WHERE json_extract(m.value,'$.uid')=?) THEN 1 ELSE 0 END AS own,created,team_id AS teamId,team_name AS teamName,members,trx_id AS trxId,payment FROM registrations WHERE workspace=? AND (?=1 OR owner_uid=? OR EXISTS(SELECT 1 FROM json_each(registrations.members) m WHERE json_extract(m.value,'$.uid')=?)) ORDER BY created DESC",
      )
      .bind(
        user?.uid || "",
        user?.uid || "",
        id,
        user?.admin ? 1 : 0,
        user?.uid || "",
        user?.uid || "",
      ),
    db
      .prepare(
        "SELECT event_id,COUNT(*) AS total FROM registrations WHERE workspace=? AND status IN ('confirmed','checked_in','pending_payment') GROUP BY event_id",
      )
      .bind(id),
  ]);
  return {
    fests: fs.results.map((r: any) => JSON.parse(r.data)),
    events: es.results.map((r: any) => JSON.parse(r.data)),
    registrations: rs.results.map((r: any) => ({
      ...r,
      members: JSON.parse(r.members),
      payment: JSON.parse(r.payment),
      trxId: user?.admin || r.ownerUid === user?.uid ? r.trxId : "",
      email: user?.admin || r.ownerUid === user?.uid ? r.email : "",
    })),
    serverTime: now(),
    seatCounts: Object.fromEntries(
      totals.results.map((r: any) => [r.event_id, r.total]),
    ),
    viewer: user
      ? {
          uid: user.uid,
          email: user.email,
          verified: user.verified,
          admin: user.admin,
        }
      : null,
    demo: false,
  };
}
// Add the expanded sample catalog to existing workspaces without overwriting
// organizer edits, registrations or status changes. Composite keys make retries safe.
async function expandCatalog(id: string) {
  const db = database();
  const statements = catalogFests.map((f) =>
    db
      .prepare("INSERT OR IGNORE INTO festivals VALUES(?,?,?)")
      .bind(id, f.id, JSON.stringify(f)),
  );
  for (const e of catalogEvents) {
    statements.push(
      db
        .prepare("INSERT OR IGNORE INTO events VALUES(?,?,?,?,?,?,?,?)")
        .bind(
          id,
          e.id,
          e.festId,
          JSON.stringify(e),
          e.capacity,
          new Date(e.deadline).toISOString(),
          new Date(e.start).toISOString(),
          new Date(e.end).toISOString(),
        ),
    );
  }
  const names = [
    "Mahi Rahman",
    "Adiba Khan",
    "Tahsin Ahmed",
    "Raisa Noor",
    "Nafis Hasan",
    "Anika Islam",
    "Rudra Das",
    "Maliha Karim",
  ];
  for (const [index, e] of catalogEvents.entries()) {
    statements.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO registrations(id,workspace,event_id,name,email,institution,status,own,created) VALUES(?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          e.id,
          names[index],
          `sample-${e.id}@example.test`,
          "Dhaka Residential Model College",
          "confirmed",
          0,
          now(),
        ),
    );
  }
  await db.batch(statements);
}
export async function GET(req: Request) {
  try {
    const user = await identity(req);
    return json(await snapshot(await workspace(), user));
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    console.error("ClubOS load failed", e);
    return json(
      { error: "The event directory could not load. Please try again." },
      503,
    );
  }
}
export async function POST(req: Request) {
  try {
    if (Number(req.headers.get("content-length") || 0) > 20000)
      return json({ error: "Request too large." }, 413);
    const raw = await req.text();
    if (raw.length > 20000) return json({ error: "Request too large." }, 413);
    const origin = req.headers.get("origin");
    if (!origin || new URL(origin).host !== new URL(req.url).host)
      return json({ error: "Request origin not allowed." }, 403);
    const user = await identity(req);
    if (!user) throw new AuthError("Sign in to continue.");
    if (!user.verified && !user.admin)
      throw new AuthError("Verify your email address before continuing.", 403);
    const db = database(),
      w = await workspace();
    const b = JSON.parse(raw) as Record<string, any>;
    if (
      !user.admin &&
      ![
        "register",
        "directory",
        "searchUsers",
        "teams",
        "createTeam",
        "invite",
        "respondInvite",
        "pushConfig",
        "subscribePush",
        "unsubscribePush",
        "testPush",
      ].includes(b.action) &&
      !(b.action === "status" && b.status === "cancelled")
    )
      throw new AuthError(
        "Only an authorized organizer can perform this action.",
        403,
      );
    if (
      ["pushConfig", "subscribePush", "unsubscribePush", "testPush"].includes(
        b.action,
      )
    )
      return json(await pushAction(b, user));
    if (
      [
        "directory",
        "searchUsers",
        "teams",
        "createTeam",
        "invite",
        "respondInvite",
      ].includes(b.action)
    ) {
      const result = await teamAction(b, user);
      if (result.notifyUid && result.notification)
        await notifyUser(result.notifyUid, result.notification).catch(() => {});
      const { notifyUid, notification, ...safeResult } = result;
      return json(safeResult);
    }
    if (b.action === "register") {
      const result = await registerBooking(b, user);
      if (result.conflict) return json(result, 409);
      return json({ ...result, data: await snapshot(w, user) });
    }
    if (
      b.action === "checkIn" ||
      (b.action === "status" && b.status === "checked_in")
    ) {
      const id = validateText(b.id)
        .replace(/^clubos:/i, "")
        .toLowerCase();
      const result = await db
        .prepare(
          "UPDATE registrations SET status='checked_in' WHERE workspace=? AND id=? AND status='confirmed' RETURNING id",
        )
        .bind(w, id)
        .first();
      if (!result) {
        const existing = await db
          .prepare(
            "SELECT status FROM registrations WHERE workspace=? AND id=?",
          )
          .bind(w, id)
          .first<any>();
        return json(
          {
            error: !existing
              ? "Ticket not found in this workspace."
              : existing.status === "cancelled"
                ? "This ticket has been cancelled. Restore it before check-in."
                : existing.status === "pending_payment"
                  ? "Verify payment before check-in."
                  : "This participant is already checked in.",
          },
          existing ? 409 : 404,
        );
      }
      return json({ data: await snapshot(w, user) });
    }
    if (b.action === "status") {
      const id = validateText(b.id),
        status = validateText(b.status);
      if (!["confirmed", "cancelled", "checked_in"].includes(status))
        return json({ error: "Invalid registration status." }, 400);
      const row = await db
        .prepare(
          "SELECT event_id,status,owner_uid,team_id,payment FROM registrations WHERE workspace=? AND id=?",
        )
        .bind(w, id)
        .first<any>();
      if (!row || (!user.admin && row.owner_uid !== user.uid))
        return json({ error: "Registration not found." }, 404);
      if (
        row.status === "cancelled" &&
        status !== "cancelled" &&
        (row.team_id || JSON.parse(row.payment).amount > 0)
      )
        return json(
          {
            error:
              "Ask the participant to register again, with current payment details and team consent.",
          },
          409,
        );
      const result = await db
        .prepare(
          `UPDATE registrations SET status=? WHERE workspace=? AND id=? AND (?='cancelled' OR (NOT EXISTS(SELECT 1 FROM registrations other WHERE other.workspace=registrations.workspace AND other.event_id=registrations.event_id AND other.id<>registrations.id AND other.status IN ('confirmed','checked_in','pending_payment') AND (other.owner_uid=registrations.owner_uid OR EXISTS(SELECT 1 FROM json_each(other.members) m WHERE json_extract(m.value,'$.uid')=registrations.owner_uid))) AND (status IN ('confirmed','checked_in','pending_payment') OR EXISTS(SELECT 1 FROM events e WHERE e.workspace=? AND e.id=registrations.event_id AND e.deadline>=? AND COALESCE(json_extract(e.data,'$.paused'),0)=0 AND (SELECT COUNT(*) FROM registrations r WHERE r.workspace=e.workspace AND r.event_id=e.id AND r.${active})<e.capacity)))) RETURNING id`,
        )
        .bind(status, w, id, status, w, now())
        .first();
      if (!result)
        return json(
          {
            error:
              "Cannot restore registration: the event is full or its deadline has passed.",
          },
          409,
        );
      return json({ data: await snapshot(w, user) });
    }
    if (b.action === "saveFest") {
      const id = b.id ? validateText(b.id) : crypto.randomUUID();
      const previous = await db
        .prepare("SELECT data FROM festivals WHERE workspace=? AND id=?")
        .bind(w, id)
        .first<any>();
      const original: Partial<Fest> = previous ? JSON.parse(previous.data) : {};
      const f: Fest = {
        id,
        name: validateText(b.name, 3, 80),
        eyebrow: original.eyebrow || "A NEW CAMPUS EXPERIENCE",
        description: validateText(b.description, 10, 600),
        date: validateText(b.date, 3, 60),
        venue: validateText(b.venue, 3, 120),
        color: original.color || "purple",
      };
      await db
        .prepare(
          "INSERT INTO festivals VALUES(?,?,?) ON CONFLICT(workspace,id) DO UPDATE SET data=excluded.data",
        )
        .bind(w, id, JSON.stringify(f))
        .run();
      return json({ data: await snapshot(w, user) });
    }
    if (b.action === "saveEvent") {
      const id = b.id ? validateText(b.id) : crypto.randomUUID();
      const previous = await db
        .prepare("SELECT data FROM events WHERE workspace=? AND id=?")
        .bind(w, id)
        .first<any>();
      const original: Partial<ClubEvent> = previous
        ? JSON.parse(previous.data)
        : {};
      const icons: Record<string, string> = {
        Development: "code",
        Programming: "terminal",
        Robotics: "bot",
        Design: "pen",
        Gaming: "game",
        Quiz: "spark",
        Workshop: "spark",
      };
      const e: ClubEvent = {
        id,
        festId: validateText(b.festId),
        title: validateText(b.title, 3, 80),
        category: validateText(b.category, 2, 40),
        description: validateText(b.description, 15, 6000),
        thumbnail:
          typeof b.thumbnail === "string"
            ? b.thumbnail.trim()
            : original.thumbnail || "",
        imageAlt:
          typeof b.imageAlt === "string"
            ? validateText(b.imageAlt, 0, 240)
            : original.imageAlt || "",
        requirements:
          typeof b.requirements === "string"
            ? validateText(b.requirements, 0, 2000)
            : original.requirements || "",
        eligibility:
          typeof b.eligibility === "string"
            ? validateText(b.eligibility, 0, 1200)
            : original.eligibility || "",
        rules:
          typeof b.rules === "string"
            ? validateText(b.rules, 0, 3000)
            : original.rules || "",
        format: ["In person", "Online", "Hybrid"].includes(b.format)
          ? b.format
          : original.format || "In person",
        paused: typeof b.paused === "boolean" ? b.paused : !!original.paused,
        start: validateText(b.start),
        end: validateText(b.end),
        deadline: validateText(b.deadline),
        venue: validateText(b.venue, 3, 120),
        capacity: Number(b.capacity),
        fee: Number(b.fee ?? original.fee ?? 0),
        paymentNumber: String(
          b.paymentNumber ?? original.paymentNumber ?? "",
        ).trim(),
        paymentMethod: String(
          b.paymentMethod ?? original.paymentMethod ?? "bKash",
        ).trim(),
        participation:
          b.participation === "team"
            ? "team"
            : b.participation === "individual"
              ? "individual"
              : original.participation || "individual",
        teamMin: Number(b.teamMin ?? original.teamMin ?? 2),
        teamMax: Number(b.teamMax ?? original.teamMax ?? 4),
        icon:
          original.category === b.category && original.icon
            ? original.icon
            : icons[b.category] || "code",
        level: validateText(b.level || "All levels"),
      };
      if (
        !Number.isFinite(e.fee) ||
        e.fee < 0 ||
        e.fee > 100000 ||
        Math.abs(Math.round(e.fee * 100) - e.fee * 100) > 0.00001
      )
        return json(
          {
            error:
              "Fee must be between ৳0 and ৳100,000, with at most two decimals.",
          },
          400,
        );
      if (
        e.fee > 0 &&
        (!/^\+?[0-9]{7,15}$/.test(e.paymentNumber!) ||
          !["bKash", "Nagad", "Rocket", "Bank / other"].includes(
            e.paymentMethod!,
          ))
      )
        return json(
          {
            error:
              "Paid events need a valid receiving number and payment method.",
          },
          400,
        );
      if (
        !Number.isInteger(e.teamMin) ||
        !Number.isInteger(e.teamMax) ||
        e.teamMin! < 2 ||
        e.teamMax! < e.teamMin! ||
        e.teamMax! > 8
      )
        return json(
          {
            error:
              "Team size must be 2–8, with minimum no greater than maximum.",
          },
          400,
        );
      const booked = await db
        .prepare(
          "SELECT id FROM registrations WHERE workspace=? AND event_id=? AND status IN ('confirmed','checked_in','pending_payment') LIMIT 1",
        )
        .bind(w, id)
        .first();
      if (
        booked &&
        ((original.participation || "individual") !== e.participation ||
          (original.teamMin || 2) !== e.teamMin ||
          (original.teamMax || 4) !== e.teamMax)
      )
        return json(
          {
            error:
              "Participation type and team limits cannot change while registrations are active.",
          },
          409,
        );
      if (e.thumbnail && (!safeCover(e.thumbnail) || e.thumbnail.length > 1500))
        return json(
          { error: "Use an https image URL or a ClubOS illustration path." },
          400,
        );
      if (!Number.isInteger(e.capacity) || e.capacity < 1 || e.capacity > 10000)
        return json(
          { error: "Capacity must be a whole number between 1 and 10,000." },
          400,
        );
      if (
        [e.start, e.end, e.deadline].some(
          (t) => !Number.isFinite(Date.parse(t)),
        ) ||
        Date.parse(e.end) <= Date.parse(e.start) ||
        Date.parse(e.deadline) > Date.parse(e.start)
      )
        return json(
          {
            error:
              "Use valid dates: registration deadline before the start, and end after the start.",
          },
          400,
        );
      if (
        !(await db
          .prepare("SELECT id FROM festivals WHERE workspace=? AND id=?")
          .bind(w, e.festId)
          .first())
      )
        return json({ error: "Choose an existing festival." }, 400);
      const saved = await db
        .prepare(
          "INSERT INTO events VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(workspace,id) DO UPDATE SET fest_id=excluded.fest_id,data=excluded.data,capacity=excluded.capacity,deadline=excluded.deadline,start=excluded.start,end=excluded.end WHERE (SELECT COUNT(*) FROM registrations r WHERE r.workspace=excluded.workspace AND r.event_id=excluded.id AND r.status IN ('confirmed','checked_in','pending_payment')) <= excluded.capacity RETURNING id",
        )
        .bind(
          w,
          id,
          e.festId,
          JSON.stringify(e),
          e.capacity,
          new Date(e.deadline).toISOString(),
          new Date(e.start).toISOString(),
          new Date(e.end).toISOString(),
        )
        .first();
      if (!saved)
        return json(
          {
            error:
              "Capacity cannot be lower than the number of active registrations.",
          },
          409,
        );
      return json({ data: await snapshot(w, user) });
    }
    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    console.error("ClubOS action failed", e);
    return json(
      {
        error:
          e instanceof Error && e.message.startsWith("Please")
            ? e.message
            : "That change could not be saved. Please try again.",
      },
      400,
    );
  }
}
