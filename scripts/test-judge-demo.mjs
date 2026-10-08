import assert from "node:assert/strict";
import { build } from "esbuild";
await build({
  entryPoints: ["lib/judge-demo.ts"],
  outfile: "work/test-judge-demo.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { newDemo, demoUsers, demoAction, demoSnapshot } =
  await import("../work/test-judge-demo.mjs");
const [student, partner, admin] = demoUsers;
const now = Date.parse("2030-01-01T00:00:00Z");
let s = newDemo(now);
const act = (u, b) => demoAction(s, u, b, now);
assert.ok(Date.parse(s.events[0].deadline) > now);
assert.equal(demoSnapshot(s, student).registrations.length, 0);
assert.equal(demoSnapshot(s, admin).registrations.length, 5);
assert.equal(demoSnapshot(s, student).seatCounts.design, 4);
const booking = (id, extra = {}) => ({
  action: "register",
  eventId: id,
  participation: "individual",
  quotedFee: 0,
  name: "Demo Student",
  institution: "Example College",
  ...extra,
});
assert.throws(() => act(student, booking("design")), /full/);
assert.throws(() => act(student, booking("gaming")), /deadline/);
assert.throws(
  () => act(student, { action: "saveFest", name: "Not allowed" }),
  /Organizer/,
);
const solo = act(student, booking("ai-web"));
assert.equal(solo.data.registrations[0].status, "confirmed");
assert.throws(() => act(student, booking("ai-web")), /already/);
assert.equal(act(student, booking("code-sprint")).conflict, true);
const second = act(
  student,
  booking("code-sprint", { acknowledgeConflict: true }),
);
assert.ok(second.ticket);
assert.equal(demoSnapshot(s, partner).registrations.length, 0);
assert.throws(
  () =>
    act(partner, { action: "status", id: solo.ticket, status: "cancelled" }),
  /not found/,
);
act(student, { action: "status", id: solo.ticket, status: "cancelled" });
assert.equal(demoSnapshot(s, student).seatCounts["ai-web"], 0);
assert.throws(
  () => act(admin, { action: "checkIn", id: solo.ticket }),
  /confirmed/,
);
act(admin, { action: "checkIn", id: second.ticket });
assert.throws(
  () => act(admin, { action: "checkIn", id: second.ticket }),
  /unused/,
);
s = newDemo(now);
const t = act(student, {
  action: "createTeam",
  eventId: "robo",
  name: "Test Team",
});
assert.ok(t.teamId);
assert.equal(
  act(student, { action: "searchUsers", query: "partner" }).users[0].uid,
  partner.uid,
);
act(student, { action: "invite", teamId: t.teamId, uid: partner.uid });
const teamBooking = booking("robo", {
  participation: "team",
  teamId: t.teamId,
  quotedFee: 200,
  trxId: "DEMO-TRX-002",
});
assert.throws(() => act(student, teamBooking), /accept/);
act(partner, { action: "respondInvite", teamId: t.teamId, status: "accepted" });
act(partner, { action: "respondInvite", teamId: t.teamId, status: "declined" });
assert.throws(() => act(student, teamBooking), /accept/);
act(student, { action: "invite", teamId: t.teamId, uid: partner.uid });
act(partner, { action: "respondInvite", teamId: t.teamId, status: "accepted" });
const team = act(student, teamBooking);
assert.equal(demoSnapshot(s, partner).registrations[0].members.length, 2);
assert.equal(demoSnapshot(s, student).seatCounts.robo, 2); // one seed payment + one team slot
assert.equal(
  s.registrations.find((r) => r.id === team.ticket).status,
  "pending_payment",
);
assert.throws(
  () => act(admin, { action: "checkIn", id: team.ticket }),
  /confirmed/,
);
act(admin, { action: "status", id: team.ticket, status: "confirmed" });
act(admin, { action: "checkIn", id: team.ticket });
assert.equal(
  s.registrations.find((r) => r.id === team.ticket).status,
  "checked_in",
);
const e = s.events.find((e) => e.id === "robo");
assert.throws(
  () => act(admin, { ...e, action: "saveEvent", capacity: 1 }),
  /Capacity/,
);
act(admin, {
  ...e,
  action: "saveEvent",
  title: "Updated Robotics Demo",
  capacity: 50,
});
assert.equal(
  s.events.find((e) => e.id === "robo").title,
  "Updated Robotics Demo",
);
act(admin, {
  action: "saveFest",
  name: "Demo Festival",
  description: "A demonstration festival for judges.",
  date: "Tomorrow",
  venue: "Example Campus",
});
assert.equal(s.fests.length, 6);
assert.equal(newDemo(now).fests.length, 5);
assert.equal(demoSnapshot(newDemo(now), student).registrations.length, 0);
console.log(
  "PASS: judge-demo checks: privacy, permissions, future dates, limits, conflicts, team consent, payment review, check-in, editing and clean reset. No Firebase or production API calls.",
);
