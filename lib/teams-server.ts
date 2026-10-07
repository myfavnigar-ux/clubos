import { database } from "./db";
import { AuthError, type Identity } from "./firebase-server";
export const WORKSPACE = "clubos-public-v1";
export const occupied = "('confirmed','checked_in','pending_payment')";
const stamp = () => new Date().toISOString();
export function input(value: unknown, min = 1, max = 120) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max
  )
    throw new AuthError("Please complete all required fields correctly.", 400);
  return value.trim();
}
export async function teamSnapshot(user: Identity) {
  const db = database();
  const groups = await db
    .prepare(
      `SELECT t.*, (SELECT id FROM registrations r WHERE r.team_id=t.id AND r.status IN ${occupied} LIMIT 1) AS registrationId FROM teams t WHERE t.leader=? OR EXISTS(SELECT 1 FROM team_members m WHERE m.team_id=t.id AND m.uid=? AND m.status IN ('invited','accepted')) ORDER BY created DESC LIMIT 100`,
    )
    .bind(user.uid, user.uid)
    .all<any>();
  return Promise.all(
    groups.results.map(async (g) => {
      const members = await db
        .prepare(
          "SELECT uid,name,status,updated FROM team_members WHERE team_id=? ORDER BY updated",
        )
        .bind(g.id)
        .all();
      return { ...g, members: members.results };
    }),
  );
}
export async function teamAction(b: Record<string, any>, user: Identity) {
  const db = database();
  if (b.action === "directory") {
    await db
      .prepare(
        "INSERT INTO directory(uid,name,searchable) VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET name=excluded.name,searchable=excluded.searchable",
      )
      .bind(user.uid, input(b.name, 2, 80), b.searchable === false ? 0 : 1)
      .run();
    return {
      ok: true,
      directory: await db
        .prepare("SELECT name,searchable FROM directory WHERE uid=?")
        .bind(user.uid)
        .first(),
    };
  }
  if (b.action === "searchUsers") {
    const query = input(b.query, 2, 60).replace(/[\\%_]/g, "\\$&");
    const users = await db
      .prepare(
        "SELECT uid,name FROM directory WHERE searchable=1 AND uid<>? AND name LIKE ? ESCAPE '\\' ORDER BY name LIMIT 12",
      )
      .bind(user.uid, `%${query}%`)
      .all();
    return { users: users.results };
  }
  if (b.action === "teams")
    return {
      teams: await teamSnapshot(user),
      directory: await db
        .prepare("SELECT name,searchable FROM directory WHERE uid=?")
        .bind(user.uid)
        .first(),
    };
  if (b.action === "createTeam") {
    const eventId = input(b.eventId),
      name = input(b.name, 2, 60),
      id = crypto.randomUUID();
    const row = await db
      .prepare("SELECT data,deadline FROM events WHERE workspace=? AND id=?")
      .bind(WORKSPACE, eventId)
      .first<any>();
    if (!row || JSON.parse(row.data).paused || row.deadline < stamp())
      throw new AuthError("Choose an open team event.", 409);
    let me = await db
      .prepare("SELECT name FROM directory WHERE uid=?")
      .bind(user.uid)
      .first<any>();
    if (!me) {
      const leaderName = input(b.leaderName, 2, 80);
      await db
        .prepare(
          "INSERT INTO directory(uid,name,searchable) VALUES(?,?,0) ON CONFLICT(uid) DO NOTHING",
        )
        .bind(user.uid, leaderName)
        .run();
      me = await db
        .prepare("SELECT name FROM directory WHERE uid=?")
        .bind(user.uid)
        .first<any>();
    }
    const count = await db
      .prepare("SELECT COUNT(*) AS n FROM teams WHERE leader=?")
      .bind(user.uid)
      .first<any>();
    if (count.n >= 30)
      throw new AuthError("You have reached the limit of 30 groups.", 409);
    await db.batch([
      db
        .prepare("INSERT INTO teams VALUES(?,?,?,?,?)")
        .bind(id, eventId, user.uid, name, stamp()),
      db
        .prepare("INSERT INTO team_members VALUES(?,?,?,?,?)")
        .bind(id, user.uid, me.name, "accepted", stamp()),
    ]);
    return { teams: await teamSnapshot(user), teamId: id };
  }
  const id = input(b.teamId);
  const team = await db
    .prepare(
      "SELECT t.*,e.data,e.deadline FROM teams t JOIN events e ON e.id=t.event_id AND e.workspace=? WHERE t.id=?",
    )
    .bind(WORKSPACE, id)
    .first<any>();
  if (!team) throw new AuthError("Group not found.", 404);
  // Every membership mutation also checks this in SQL, so registration and response races are safe.
  const unlocked = `NOT EXISTS(SELECT 1 FROM registrations r WHERE r.team_id=? AND r.status IN ${occupied})`;
  if (team.deadline < stamp())
    throw new AuthError("This event's registration has closed.", 409);
  if (b.action === "invite") {
    if (team.leader !== user.uid)
      throw new AuthError("Only the group leader can invite members.", 403);
    const target = input(b.uid);
    if (target === user.uid)
      throw new AuthError("You are already the group leader.", 400);
    const result = await db
      .prepare(
        `INSERT INTO team_members(team_id,uid,name,status,updated) SELECT ?,uid,name,'invited',? FROM directory WHERE uid=? AND searchable=1 AND ${unlocked} AND (SELECT COUNT(*) FROM team_members WHERE team_id=?)<12 ON CONFLICT(team_id,uid) DO NOTHING RETURNING uid`,
      )
      .bind(id, stamp(), target, id, id)
      .first();
    if (!result)
      throw new AuthError(
        "This member was already invited, the group is registered, or the invitation limit was reached.",
        409,
      );
    return {
      teams: await teamSnapshot(user),
      notifyUid: target,
      notification: {
        title: "A teammate is looking for you",
        body: `You have a collaboration invitation to ${team.name}. Accept or decline in My teams.`,
        url: "/#teams",
        tag: `invite-${id}`,
      },
    };
  }
  if (b.action === "respondInvite") {
    if (
      !["accepted", "declined"].includes(b.status) ||
      team.leader === user.uid
    )
      throw new AuthError("Invalid invitation response.", 400);
    const result = await db
      .prepare(
        `UPDATE team_members SET status=?,updated=? WHERE team_id=? AND uid=? AND status IN ('invited','accepted') AND ${unlocked} AND (?='declined' OR (SELECT COUNT(*) FROM team_members WHERE team_id=? AND status='accepted')<?) RETURNING uid`,
      )
      .bind(
        b.status,
        stamp(),
        id,
        user.uid,
        id,
        b.status,
        id,
        JSON.parse(team.data).teamMax || 4,
      )
      .first();
    if (!result)
      throw new AuthError(
        "This invitation is no longer available, the team is full, or registration has already been submitted.",
        409,
      );
    return {
      teams: await teamSnapshot(user),
      notifyUid: team.leader,
      notification: {
        title: "Team invitation updated",
        body: `A teammate ${b.status} your invitation to ${team.name}.`,
        url: "/#teams",
        tag: `reply-${id}-${user.uid}`,
      },
    };
  }
  throw new AuthError("Unknown group action.", 400);
}
