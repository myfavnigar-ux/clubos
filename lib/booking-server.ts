import { database } from "./db";
import { AuthError, type Identity } from "./firebase-server";
import { WORKSPACE as w, occupied, input } from "./teams-server";
import type { ClubEvent } from "./data";
export async function registerBooking(b: Record<string, any>, user: Identity) {
  const db = database(),
    eventId = input(b.eventId),
    name = input(b.name, 2, 80),
    institution = input(b.institution, 2, 120),
    now = new Date().toISOString();
  const ev = await db
    .prepare("SELECT * FROM events WHERE workspace=? AND id=?")
    .bind(w, eventId)
    .first<any>();
  if (!ev) throw new AuthError("Event not found.", 404);
  const event: ClubEvent = JSON.parse(ev.data);
  if (event.paused || ev.deadline < now)
    throw new AuthError(
      "Registration is paused or closed for this event.",
      409,
    );
  let teamId: string | null = null,
    teamName = "",
    members = [{ uid: user.uid, name }];
  const participation = b.participation ?? event.participation ?? "individual";
  if (!["individual", "team"].includes(participation))
    throw new AuthError("Choose Solo or Team registration.", 400);
  if (participation === "team") {
    teamId = input(b.teamId);
    const team = await db
      .prepare("SELECT * FROM teams WHERE id=? AND leader=? AND event_id=?")
      .bind(teamId, user.uid, eventId)
      .first<any>();
    if (!team)
      throw new AuthError("Select a group you lead for this event.", 403);
    teamName = team.name;
    members = (
      await db
        .prepare(
          "SELECT uid,name FROM team_members WHERE team_id=? AND status='accepted' ORDER BY uid",
        )
        .bind(teamId)
        .all<{ uid: string; name: string }>()
    ).results;
    if (
      members.length < (event.teamMin || 2) ||
      members.length > (event.teamMax || 4)
    )
      throw new AuthError(
        `Your team needs ${event.teamMin || 2}–${event.teamMax || 4} accepted members, including its leader.`,
        409,
      );
  }
  const trxId = event.fee > 0 ? input(b.trxId, 6, 64).toUpperCase() : "";
  if (trxId && !/^[A-Z0-9-]+$/.test(trxId))
    throw new AuthError(
      "Enter a valid transaction ID using letters, numbers or hyphens.",
      400,
    );
  if (event.fee > 0 && !event.paymentNumber)
    throw new AuthError(
      "The organizer must configure a payment number before accepting payments.",
      409,
    );
  if (event.fee > 0 && Number(b.quotedFee) !== event.fee)
    throw new AuthError(
      "The fee has changed. Refresh the event before making a payment.",
      409,
    );
  const memberJSON = JSON.stringify(members),
    uids = JSON.stringify(members.map((m) => m.uid));
  const duplicate = await db
    .prepare(
      `SELECT r.id FROM registrations r WHERE workspace=? AND event_id=? AND status IN ${occupied} AND (owner_uid IN (SELECT value FROM json_each(?)) OR EXISTS(SELECT 1 FROM json_each(r.members) m WHERE json_extract(m.value,'$.uid') IN (SELECT value FROM json_each(?)))) LIMIT 1`,
    )
    .bind(w, eventId, uids, uids)
    .first();
  if (duplicate)
    throw new AuthError(
      "You or a teammate already have an active registration for this event.",
      409,
    );
  const conflict = await db
    .prepare(
      `SELECT json_extract(e.data,'$.title') AS title FROM registrations r JOIN events e ON e.workspace=r.workspace AND e.id=r.event_id WHERE r.workspace=? AND r.status IN ${occupied} AND r.event_id<>? AND e.start<? AND e.end>? AND (r.owner_uid IN (SELECT value FROM json_each(?)) OR EXISTS(SELECT 1 FROM json_each(r.members) m WHERE json_extract(m.value,'$.uid') IN (SELECT value FROM json_each(?)))) LIMIT 1`,
    )
    .bind(w, eventId, ev.end, ev.start, uids, uids)
    .first<any>();
  if (conflict && !b.acknowledgeConflict)
    return {
      error: `You or a teammate have a schedule conflict with ${conflict.title}. Confirm that you understand the overlap.`,
      conflict: true,
    };
  const payment = JSON.stringify(
      event.fee > 0
        ? {
            amount: event.fee,
            number: event.paymentNumber,
            method: event.paymentMethod,
          }
        : {},
    ),
    status = event.fee > 0 ? "pending_payment" : "confirmed";
  // One atomic statement rechecks capacity, event version, team consent and member uniqueness.
  const result = await db
    .prepare(
      `INSERT INTO registrations(id,workspace,event_id,name,email,institution,status,own,created,owner_uid,team_id,team_name,members,trx_id,payment)
 SELECT ?,?,?,?,?,?,?,0,?,?,?,?,?,?,? WHERE
 EXISTS(SELECT 1 FROM events e WHERE e.workspace=? AND e.id=? AND e.data=? AND e.deadline>=? AND COALESCE(json_extract(e.data,'$.paused'),0)=0 AND (SELECT COUNT(*) FROM registrations r WHERE r.workspace=e.workspace AND r.event_id=e.id AND r.status IN ${occupied})<e.capacity)
 AND (? IS NULL OR (SELECT json_group_array(json_object('uid',uid,'name',name)) FROM (SELECT uid,name FROM team_members WHERE team_id=? AND status='accepted' ORDER BY uid))=?)
 AND NOT EXISTS(SELECT 1 FROM registrations r WHERE workspace=? AND event_id=? AND status IN ${occupied} AND (owner_uid IN (SELECT value FROM json_each(?)) OR EXISTS(SELECT 1 FROM json_each(r.members) m WHERE json_extract(m.value,'$.uid') IN (SELECT value FROM json_each(?)))))
 AND (?='' OR NOT EXISTS(SELECT 1 FROM registrations WHERE workspace=? AND trx_id=? AND json_extract(payment,'$.number')=? AND status IN ${occupied}))
 ON CONFLICT(workspace,event_id,email) DO UPDATE SET name=excluded.name,institution=excluded.institution,status=excluded.status,created=excluded.created,team_id=excluded.team_id,team_name=excluded.team_name,members=excluded.members,trx_id=excluded.trx_id,payment=excluded.payment WHERE registrations.status='cancelled' AND registrations.owner_uid=excluded.owner_uid RETURNING id`,
    )
    .bind(
      crypto.randomUUID(),
      w,
      eventId,
      name,
      user.email,
      institution,
      status,
      now,
      user.uid,
      teamId,
      teamName,
      memberJSON,
      trxId,
      payment,
      w,
      eventId,
      ev.data,
      now,
      teamId,
      teamId,
      memberJSON,
      w,
      eventId,
      uids,
      uids,
      trxId,
      w,
      trxId,
      event.paymentNumber || "",
    )
    .first<any>();
  if (!result)
    throw new AuthError(
      "Registration changed: check available slots, accepted teammates, or a transaction ID already submitted. Refresh and try again.",
      409,
    );
  return { ticket: result.id };
}
