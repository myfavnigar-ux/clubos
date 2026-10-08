import {
  fests,
  events,
  type Snapshot,
  type Registration,
  type ClubEvent,
} from "./data";

// Public evaluation credentials. These are NOT Firebase users or server credentials.
export const DEMO_PASSWORD = "ClubOS-Judge-2026";
export const demoUsers = [
  {
    uid: "judge-student",
    email: "student@clubos.demo",
    displayName: "Demo Student",
    admin: false,
  },
  {
    uid: "judge-partner",
    email: "partner@clubos.demo",
    displayName: "Demo Partner",
    admin: false,
  },
  {
    uid: "judge-organizer",
    email: "organizer@clubos.demo",
    displayName: "Demo Organizer",
    admin: true,
  },
];
export type DemoUser = (typeof demoUsers)[number];
type Team = {
  id: string;
  name: string;
  event_id: string;
  leader: string;
  registrationId?: string;
  members: { uid: string; name: string; status: string }[];
};
export type DemoState = {
  version: 1;
  fests: Snapshot["fests"];
  events: ClubEvent[];
  registrations: Registration[];
  teams: Team[];
  directory: { uid: string; name: string; searchable: number }[];
};
export const DEMO_KEY = "clubos-public-judge-sandbox-v1";
export function newDemo(now = Date.now()): DemoState {
  // Shift the catalog into the future so the evaluation remains usable after judging day.
  const shift = Math.max(0, now + 14 * 86400000 - Date.parse(events[0].start));
  const catalog = events.map((e) => ({
    ...e,
    start: new Date(Date.parse(e.start) + shift).toISOString(),
    end: new Date(Date.parse(e.end) + shift).toISOString(),
    deadline: new Date(Date.parse(e.deadline) + shift).toISOString(),
  }));
  const gaming = catalog.find((e) => e.id === "gaming");
  if (gaming) gaming.deadline = new Date(now - 86400000).toISOString();
  const paid = catalog.find((e) => e.id === "robo");
  if (paid) {
    paid.fee = 200;
    paid.paymentNumber = "DEMO-NO-PAYMENT";
    paid.paymentMethod = "Demo only";
  }
  const registrations: Registration[] = Array.from({ length: 4 }, (_, i) => ({
    id: `demo-full-${i}`,
    eventId: "design",
    name: `Sample Participant ${i + 1}`,
    email: `sample${i + 1}@example.test`,
    institution: "Example College",
    status: "confirmed",
    own: 0,
    created: new Date(now).toISOString(),
  }));
  registrations.push({
    id: "demo-review",
    eventId: "robo",
    name: "Sample Payment",
    email: "payment@example.test",
    institution: "Example College",
    status: "pending_payment",
    own: 0,
    trxId: "DEMO-TRX-001",
    payment: { amount: 200, number: "DEMO-NO-PAYMENT", method: "Demo only" },
    created: new Date(now).toISOString(),
  });
  return {
    version: 1,
    fests: fests.map((f) => {
      const first = catalog
        .filter((e) => e.festId === f.id)
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];
      return {
        ...f,
        date: first
          ? new Date(first.start).toLocaleDateString("en-GB", {
              timeZone: "Asia/Dhaka",
              day: "numeric",
              month: "short",
              year: "numeric",
            }) + " onwards"
          : f.date,
      };
    }),
    events: catalog,
    registrations,
    teams: [],
    directory: demoUsers
      .filter((u) => !u.admin)
      .map((u) => ({ uid: u.uid, name: u.displayName, searchable: 1 })),
  };
}
export function demoSnapshot(s: DemoState, u: DemoUser): Snapshot {
  const active = s.registrations.filter((r) => r.status !== "cancelled");
  return {
    fests: s.fests,
    events: s.events,
    registrations: s.registrations
      .filter(
        (r) =>
          u.admin ||
          r.ownerUid === u.uid ||
          r.members?.some((m) => m.uid === u.uid),
      )
      .map((r) => ({
        ...r,
        own:
          r.ownerUid === u.uid || r.members?.some((m) => m.uid === u.uid)
            ? 1
            : 0,
      })),
    seatCounts: Object.fromEntries(
      s.events.map((e) => [
        e.id,
        active.filter((r) => r.eventId === e.id).length,
      ]),
    ),
    viewer: { uid: u.uid, admin: u.admin, email: u.email, verified: true },
    serverTime: new Date().toISOString(),
  };
}
function required(v: unknown, min = 2, max = 6000): string {
  if (typeof v !== "string" || v.trim().length < min || v.length > max)
    throw new Error("Complete all required fields correctly.");
  return v.trim();
}
function teamView(s: DemoState, u: DemoUser) {
  return {
    teams: s.teams.filter(
      (t) =>
        t.leader === u.uid ||
        t.members.some(
          (m) => m.uid === u.uid && ["accepted", "invited"].includes(m.status),
        ),
    ),
    directory: s.directory.find((d) => d.uid === u.uid) || null,
  };
}
export function demoAction(
  s: DemoState,
  u: DemoUser,
  b: Record<string, any>,
  now = Date.now(),
): Record<string, any> {
  const active = () => s.registrations.filter((r) => r.status !== "cancelled");
  const available = (e: ClubEvent) =>
    !e.paused &&
    Date.parse(e.deadline) >= now &&
    active().filter((r) => r.eventId === e.id).length < e.capacity;
  if (b.action === "teams") return teamView(s, u);
  if (b.action === "directory") {
    const d = s.directory.find((d) => d.uid === u.uid);
    if (d) {
      d.name = required(b.name, 2, 80);
      d.searchable = b.searchable === false ? 0 : 1;
    }
    return teamView(s, u);
  }
  if (b.action === "searchUsers")
    return {
      users: s.directory.filter(
        (d) =>
          d.uid !== u.uid &&
          d.searchable &&
          d.name.toLowerCase().includes(required(b.query, 2, 60).toLowerCase()),
      ),
    };
  if (b.action === "createTeam") {
    const e = s.events.find((e) => e.id === b.eventId);
    if (!e || !available(e)) throw new Error("Choose an open event.");
    if (s.teams.filter((t) => t.leader === u.uid).length >= 20)
      throw new Error("Reset the demo to create more teams.");
    const teamId = crypto.randomUUID();
    s.teams.push({
      id: teamId,
      event_id: e.id,
      name: required(b.name, 2, 60),
      leader: u.uid,
      members: [{ uid: u.uid, name: u.displayName, status: "accepted" }],
    });
    return { ...teamView(s, u), teamId };
  }
  if (b.action === "invite" || b.action === "respondInvite") {
    const t = s.teams.find((t) => t.id === b.teamId);
    if (!t || t.registrationId) throw new Error("This team cannot be changed.");
    if (b.action === "invite") {
      if (t.leader !== u.uid)
        throw new Error("Only the leader can invite members.");
      const d = s.directory.find((d) => d.uid === b.uid && d.searchable);
      const previous = t.members.find((m) => m.uid === d?.uid);
      if (!d || (previous && previous.status !== "declined"))
        throw new Error("Choose a new teammate.");
      if (t.members.filter((m) => m.status !== "declined").length >= 8)
        throw new Error("Team limit reached.");
      if (previous) previous.status = "invited";
      else t.members.push({ uid: d.uid, name: d.name, status: "invited" });
    } else {
      const m = t.members.find(
        (m) =>
          m.uid === u.uid &&
          (m.status === "invited" ||
            (m.status === "accepted" &&
              b.status === "declined" &&
              t.leader !== u.uid)),
      );
      if (!m || !["accepted", "declined"].includes(b.status))
        throw new Error("Invitation not found.");
      m.status = b.status;
    }
    return teamView(s, u);
  }
  if (b.action === "register") {
    const e = s.events.find((e) => e.id === b.eventId);
    if (!e || !available(e))
      throw new Error("This event is full, paused or past its deadline.");
    if (!["individual", "team"].includes(b.participation))
      throw new Error("Choose Solo or Team.");
    if (Number(b.quotedFee) !== e.fee)
      throw new Error("The fee changed. Reopen the form.");
    const team =
      b.participation === "team"
        ? s.teams.find(
            (t) =>
              t.id === b.teamId && t.leader === u.uid && t.event_id === e.id,
          )
        : undefined;
    if (b.participation === "team" && !team)
      throw new Error("Choose a team you lead.");
    const members = team
      ? team.members
          .filter((m) => m.status === "accepted")
          .map(({ uid, name }) => ({ uid, name }))
      : [{ uid: u.uid, name: required(b.name, 2, 80) }];
    if (
      team &&
      (members.length < (e.teamMin || 2) || members.length > (e.teamMax || 4))
    )
      throw new Error("Wait for enough teammates to accept the invitation.");
    const overlaps = (r: Registration) =>
      r.ownerUid === u.uid ||
      r.members?.some((m) => members.some((n) => n.uid === m.uid));
    if (active().some((r) => r.eventId === e.id && overlaps(r)))
      throw new Error(
        "A participant already has a registration for this event.",
      );
    if (
      !b.acknowledgeConflict &&
      active().some((r) => {
        const other = s.events.find((o) => o.id === r.eventId);
        return (
          overlaps(r) &&
          other &&
          Date.parse(other.start) < Date.parse(e.end) &&
          Date.parse(other.end) > Date.parse(e.start)
        );
      })
    )
      return {
        conflict: true,
        error:
          "This event overlaps with your schedule. Acknowledge the conflict to continue.",
      };
    const trxId = e.fee ? required(b.trxId, 4, 80) : "";
    if (trxId && active().some((r) => r.trxId === trxId))
      throw new Error("This demo Trx ID has already been used.");
    const id = crypto.randomUUID();
    s.registrations.push({
      id,
      eventId: e.id,
      name: required(b.name, 2, 80),
      email: u.email,
      institution: required(b.institution, 2, 120),
      ownerUid: u.uid,
      own: 1,
      status: e.fee ? "pending_payment" : "confirmed",
      created: new Date(now).toISOString(),
      members,
      teamId: team?.id,
      teamName: team?.name,
      trxId,
      payment: e.fee
        ? { amount: e.fee, method: "Demo only", number: "DEMO-NO-PAYMENT" }
        : {},
    });
    if (team) team.registrationId = id;
    return { ticket: id, data: demoSnapshot(s, u) };
  }
  if (!u.admin && !(b.action === "status" && b.status === "cancelled"))
    throw new Error("Organizer access is required.");
  if (b.action === "status" || b.action === "checkIn") {
    const r = s.registrations.find(
      (r) => r.id === String(b.id).replace(/^clubos:/i, ""),
    );
    if (!r || (!u.admin && r.ownerUid !== u.uid))
      throw new Error("Registration not found.");
    const status = b.action === "checkIn" ? "checked_in" : b.status;
    if (!["confirmed", "checked_in", "cancelled"].includes(status))
      throw new Error("Invalid status.");
    if (status === "checked_in" && r.status !== "confirmed")
      throw new Error("Only a confirmed, unused ticket can check in.");
    if (r.status === "cancelled" && status !== "cancelled") {
      const e = s.events.find((e) => e.id === r.eventId);
      if (r.teamId || r.payment?.amount)
        throw new Error(
          "Register again with current team consent or payment details.",
        );
      if (
        !e ||
        !available(e) ||
        active().some(
          (a) =>
            a.eventId === r.eventId && a.ownerUid && a.ownerUid === r.ownerUid,
        )
      )
        throw new Error("Cannot restore this registration.");
    }
    r.status = status;
    if (status === "cancelled") {
      const t = s.teams.find((t) => t.registrationId === r.id);
      if (t) delete t.registrationId;
    }
  } else if (b.action === "saveFest") {
    const id = b.id || crypto.randomUUID();
    const f = {
      id,
      name: required(b.name, 3, 80),
      description: required(b.description, 10, 600),
      venue: required(b.venue, 3, 120),
      date: required(b.date, 3, 60),
      color: "purple",
      eyebrow: "JUDGE DEMO FESTIVAL",
    };
    const i = s.fests.findIndex((f) => f.id === id);
    if (i >= 0) s.fests[i] = f;
    else s.fests.push(f);
  } else if (b.action === "saveEvent") {
    const previous = s.events.find((e) => e.id === b.id);
    const e: ClubEvent = {
      ...previous,
      ...b,
      id: b.id || crypto.randomUUID(),
      festId: required(b.festId),
      start: required(b.start),
      end: required(b.end),
      deadline: required(b.deadline),
      title: required(b.title, 3, 80),
      description: required(b.description, 15),
      venue: required(b.venue, 3, 120),
      category: required(b.category, 2, 40),
      fee: Number(b.fee || 0),
      capacity: Number(b.capacity),
      teamMin: Number(b.teamMin || 2),
      teamMax: Number(b.teamMax || 4),
      icon: previous?.icon || "code",
      level: required(b.level || "All levels"),
      paymentNumber: Number(b.fee) > 0 ? "DEMO-NO-PAYMENT" : "",
      paymentMethod: "Demo only",
    };
    if (!s.fests.some((f) => f.id === e.festId))
      throw new Error("Choose a festival.");
    if (
      !Number.isInteger(e.capacity) ||
      e.capacity < 1 ||
      e.capacity > 10000 ||
      e.capacity < active().filter((r) => r.eventId === e.id).length
    )
      throw new Error("Capacity must accommodate existing registrations.");
    if (!Number.isFinite(e.fee) || e.fee < 0 || e.fee > 100000)
      throw new Error("Enter a valid fee.");
    if (
      !Number.isInteger(e.teamMin) ||
      !Number.isInteger(e.teamMax) ||
      e.teamMin! < 2 ||
      e.teamMax! < e.teamMin! ||
      e.teamMax! > 8
    )
      throw new Error("Team size must be between 2 and 8.");
    if (
      ![e.start, e.end, e.deadline].every((d) =>
        Number.isFinite(Date.parse(d)),
      ) ||
      Date.parse(e.start) >= Date.parse(e.end) ||
      Date.parse(e.deadline) > Date.parse(e.start)
    )
      throw new Error("Check the event dates and deadline.");
    const i = s.events.findIndex((x) => x.id === e.id);
    if (i >= 0) s.events[i] = e;
    else s.events.push(e);
  } else throw new Error("This action is not part of the public demo.");
  return { data: demoSnapshot(s, u) };
}
