// Real production API + JWT verification, with local SQLite and simulated Google responses.
// No production authentication bypass or external user creation is involved.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync, readdirSync } from "node:fs";
import { build } from "esbuild";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

mkdirSync("work", { recursive: true });
const sqlite = new DatabaseSync(":memory:");
for (const file of readdirSync("drizzle")
  .filter((x) => x.endsWith(".sql"))
  .sort())
  sqlite.exec(readFileSync(`drizzle/${file}`, "utf8"));
globalThis.__clubDB = {
  prepare(sql) {
    return {
      args: [],
      bind(...args) {
        this.args = args;
        return this;
      },
      async first() {
        return sqlite.prepare(sql).get(...this.args) || null;
      },
      async run() {
        return sqlite.prepare(sql).run(...this.args);
      },
      async all() {
        return { results: sqlite.prepare(sql).all(...this.args) };
      },
    };
  },
  async batch(statements) {
    sqlite.exec("BEGIN");
    try {
      const values = [];
      for (const s of statements) values.push(await s.all());
      sqlite.exec("COMMIT");
      return values;
    } catch (e) {
      sqlite.exec("ROLLBACK");
      throw e;
    }
  },
};
await build({
  entryPoints: ["app/api/club/route.ts"],
  outfile: "work/api-auth-test.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  plugins: [
    {
      name: "test-d1",
      setup(b) {
        b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({
          path: "env",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents:
            'export const env = {DB:globalThis.__clubDB,CLUBOS_ADMIN_UIDS:"admin-uid"};',
          loader: "js",
        }));
      },
    },
  ],
});
const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwk = {
  ...(await exportJWK(publicKey)),
  kid: "test-key",
  alg: "RS256",
  use: "sig",
};
const currentTime = Math.floor(Date.now() / 1000);
const disabled = new Set(),
  revoked = new Set();
globalThis.fetch = async (url, init) => {
  if (String(url).includes("/service_accounts/v1/jwk/"))
    return Response.json(
      { keys: [jwk] },
      { headers: { "cache-control": "public, max-age=3600" } },
    );
  if (String(url).includes("/accounts:lookup")) {
    const { idToken } = JSON.parse(init.body),
      claims = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url"));
    return Response.json({
      users: [
        {
          localId: claims.sub,
          emailVerified: claims.email_verified,
          disabled: disabled.has(claims.sub),
          validSince: String(revoked.has(claims.sub) ? currentTime + 10 : 0),
        },
      ],
    });
  }
  throw new Error("Unexpected network request");
};
const api = await import(pathToFileURL(resolve("work/api-auth-test.mjs")));
async function token(uid, extra = {}, aud = "clubosdrmc") {
  return new SignJWT({
    email: `${uid}@example.com`,
    email_verified: true,
    auth_time: currentTime,
    ...extra,
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setSubject(uid)
    .setAudience(aud)
    .setIssuer("https://securetoken.google.com/clubosdrmc")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}
const alice = await token("alice"),
  bob = await token("bob"),
  admin = await token("admin-uid"),
  unverified = await token("new-user", { email_verified: false });
let checks = 0;
async function request(
  body,
  auth,
  expected = 200,
  origin = "https://club.test",
) {
  const headers = { origin, "content-type": "application/json" };
  if (auth) headers.authorization = `Bearer ${auth}`;
  const req = new Request("https://club.test/api/club", {
    method: body ? "POST" : "GET",
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const res = await api[body ? "POST" : "GET"](req),
    data = await res.json();
  assert.equal(res.status, expected, JSON.stringify(data));
  checks++;
  return data;
}
const guest = await request();
assert.equal(guest.events.length, 16);
assert.equal(guest.fests.length, 5);
assert.equal(guest.registrations.length, 0);
assert.equal(guest.seatCounts.design, 4);
const reg = {
  action: "register",
  eventId: "robo",
  name: "Alice Student",
  email: "forged@example.com",
  institution: "Demo College",
};
await request(reg, null, 401);
await request(null, "not-a-token", 401);
const forged = alice.split(".");
forged[1] = Buffer.from(
  JSON.stringify({ sub: "admin-uid", email: "admin@example.com" }),
).toString("base64url");
await request(null, forged.join("."), 401);
const expired = await new SignJWT({
  email: "expired@example.com",
  email_verified: true,
  auth_time: currentTime - 600,
})
  .setProtectedHeader({ alg: "RS256", kid: "test-key" })
  .setSubject("expired")
  .setAudience("clubosdrmc")
  .setIssuer("https://securetoken.google.com/clubosdrmc")
  .setIssuedAt(currentTime - 600)
  .setExpirationTime(currentTime - 1)
  .sign(privateKey);
await request(null, expired, 401);
await request(null, await token("wrong", {}, "other-project"), 401);
await request(
  null,
  await token("future", { auth_time: currentTime + 1000 }),
  401,
);
assert.equal(
  (await request(null, await token("not-admin", { admin: true }))).viewer.admin,
  false,
);
await request(reg, unverified, 403);
await request({ action: "saveFest" }, alice, 403);
await request({ action: "checkIn", id: "anything" }, alice, 403);
await request(reg, alice, 403, "https://evil.test");
const result = await request(reg, alice);
assert.equal(result.data.registrations[0].email, "alice@example.com");
assert.equal(result.data.registrations[0].own, 1);
assert.equal(result.data.registrations[0].ownerUid, "alice");
assert.equal((await request(null, bob)).registrations.length, 0);
assert.equal((await request()).registrations.length, 0);
assert.equal((await request(null, admin)).registrations.length, 25);
await request({ ...reg, eventId: "robo" }, alice, 409);
await request({ ...reg, eventId: "design" }, alice, 409);
await request({ ...reg, eventId: "gaming" }, alice, 409);
await request({ ...reg, name: "A" }, bob, 400);
await request(
  { action: "status", id: result.ticket, status: "cancelled" },
  bob,
  404,
);
await request(
  { action: "status", id: result.ticket, status: "confirmed" },
  alice,
  403,
);
await request({ action: "checkIn", id: result.ticket }, admin);
await request({ action: "checkIn", id: result.ticket }, admin, 409);
await request(
  { action: "status", id: result.ticket, status: "cancelled" },
  alice,
);
await request({ action: "checkIn", id: result.ticket }, admin, 409);
await request(reg, alice);
await request({ ...reg, eventId: "ai-web" }, alice);
await request({ ...reg, eventId: "code-sprint" }, alice, 409);
await request(
  { ...reg, eventId: "code-sprint", acknowledgeConflict: true },
  alice,
);
const fest = {
  action: "saveFest",
  name: "Firebase Shared Festival",
  date: "2099",
  venue: "Campus Hall",
  description: "A shared event for testing account access.",
};
const saved = await request(fest, admin);
const festId = saved.data.fests.find((x) => x.name === fest.name).id;
assert.ok((await request()).fests.some((x) => x.id === festId));
const event = {
  action: "saveEvent",
  festId,
  title: "Final seat",
  category: "Workshop",
  description: "Test the final available seat safely.",
  start: "2099-01-01T10:00:00Z",
  end: "2099-01-01T12:00:00Z",
  deadline: "2098-12-30T10:00:00Z",
  capacity: 1,
  venue: "Campus Hall",
};
const savedEvent = await request(event, admin);
const eventId = savedEvent.data.events.find((x) => x.title === event.title).id;
// Both requests can pass preflight. The INSERT's capacity predicate must still permit only one.
const calls = await Promise.all(
  [alice, bob].map((auth) =>
    api.POST(
      new Request("https://club.test/api/club", {
        method: "POST",
        headers: {
          origin: "https://club.test",
          authorization: `Bearer ${auth}`,
        },
        body: JSON.stringify({ ...reg, eventId }),
      }),
    ),
  ),
);
assert.deepEqual(calls.map((x) => x.status).sort(), [200, 409]);
checks++;
await request({ ...event, id: eventId, capacity: 0 }, admin, 400);
const final = await request(null, admin);
assert.equal(final.seatCounts[eventId], 1);
const managed = {
  ...event,
  id: eventId,
  capacity: 10,
  paused: true,
  thumbnail: "https://example.com/art.webp",
  imageAlt: "Workshop illustration",
  requirements: "Bring a laptop",
  eligibility: "All students",
  rules: "Respect other participants.",
  format: "Hybrid",
};
const edited = await request(managed, admin);
const updated = edited.data.events.find((x) => x.id === eventId);
for (const field of [
  "thumbnail",
  "imageAlt",
  "requirements",
  "eligibility",
  "rules",
  "format",
  "paused",
])
  assert.equal(updated[field], managed[field]);
await request({ ...reg, eventId }, await token("charlie"), 409);
await request({ ...managed, thumbnail: "javascript:alert(1)" }, admin, 400);
const reserved = edited.data.registrations.find((r) => r.eventId === eventId);
await request(
  { action: "status", id: reserved.id, status: "cancelled" },
  admin,
);
await request(
  { action: "status", id: reserved.id, status: "confirmed" },
  admin,
  409,
);
await request({ ...managed, paused: false }, admin);
await request(
  { action: "status", id: reserved.id, status: "confirmed" },
  admin,
);
assert.equal((await request(null, admin)).seatCounts[eventId], 1);
disabled.add("bob");
await request(null, bob, 401);
revoked.add("alice");
await request(null, alice, 401);
const unverifiedAdmin = await token("admin-uid", { email_verified: false });
assert.equal((await request(null, unverifiedAdmin)).viewer.admin, true);
await request(fest, unverifiedAdmin);

// Team consent, participant uniqueness, fee snapshots, and payment review.
disabled.clear();
revoked.clear();
const charlie = await token("charlie");
for (const [auth, name] of [
  [alice, "Alice Student"],
  [bob, "Bob Student"],
  [charlie, "Charlie Student"],
])
  await request({ action: "directory", name }, auth);
const found = await request({ action: "searchUsers", query: "Student" }, alice);
assert.equal(found.users.length, 2);
assert.deepEqual(Object.keys(found.users[0]).sort(), ["name", "uid"]);
await request({ action: "searchUsers", query: "%_" }, alice);
await request(
  { action: "directory", name: "Bob Student", searchable: false },
  bob,
);
assert.equal(
  (await request({ action: "searchUsers", query: "Bob" }, alice)).users.length,
  0,
);
await request(
  { action: "directory", name: "Bob Student", searchable: true },
  bob,
);
const teamEvent = {
  ...event,
  id: "team-paid",
  title: "Team paid challenge",
  capacity: 1,
  participation: "team",
  teamMin: 2,
  teamMax: 3,
  fee: 500,
  paymentNumber: "01700000000",
  paymentMethod: "bKash",
};
await request({ ...teamEvent, paymentNumber: "bad" }, admin, 400);
await request({ ...teamEvent, teamMin: 4, teamMax: 3 }, admin, 400);
await request(teamEvent, admin);
const team = (
  await request(
    { action: "createTeam", eventId: "team-paid", name: "Alpha Builders" },
    alice,
  )
).teamId;
await request({ action: "invite", teamId: team, uid: "bob" }, bob, 403);
await request({ action: "invite", teamId: team, uid: "bob" }, alice);
await request({ action: "invite", teamId: team, uid: "bob" }, alice, 409);
await request({ action: "invite", teamId: team, uid: "charlie" }, alice);
assert.ok(
  (await request({ action: "teams" }, bob)).teams.some((t) => t.id === team),
);
const booking = {
  ...reg,
  eventId: "team-paid",
  teamId: team,
  trxId: "TRX123456",
  quotedFee: 500,
  acknowledgeConflict: true,
};
await request(booking, alice, 409); // Invitation alone is not consent.
await request(
  { action: "respondInvite", teamId: team, status: "declined" },
  charlie,
);
await request(
  { action: "respondInvite", teamId: team, status: "accepted" },
  bob,
);
await request({ ...booking, quotedFee: 0 }, alice, 409);
await request({ ...booking, trxId: "" }, alice, 400);
const teamReg = await request(booking, alice);
let teamRow = teamReg.data.registrations.find((r) => r.id === teamReg.ticket);
assert.equal(teamRow.status, "pending_payment");
assert.equal(teamRow.members.length, 2);
assert.equal(teamRow.payment.amount, 500);
assert.equal(teamReg.data.seatCounts["team-paid"], 1);
assert.equal(
  (await request(null, charlie)).registrations.some(
    (r) => r.id === teamReg.ticket,
  ),
  false,
);
const partner = (await request(null, bob)).registrations.find(
  (r) => r.id === teamReg.ticket,
);
assert.equal(partner.own, 1);
assert.equal(partner.trxId, "");
assert.equal(partner.email, "");
await request(
  { action: "status", id: teamReg.ticket, status: "cancelled" },
  bob,
  404,
);
await request(
  { action: "respondInvite", teamId: team, status: "declined" },
  bob,
  409,
);
await request({ action: "checkIn", id: teamReg.ticket }, admin, 409);
await request({ ...teamEvent, participation: "individual" }, admin, 409);
await request({ ...teamEvent, fee: 800 }, admin);
assert.equal(
  (await request(null, alice)).registrations.find(
    (r) => r.id === teamReg.ticket,
  ).payment.amount,
  500,
);
await request(
  { action: "status", id: teamReg.ticket, status: "confirmed" },
  admin,
); // Full capacity must not block approval of its reserved slot.
await request({ action: "checkIn", id: teamReg.ticket }, admin);
const secondTeam = (
  await request(
    { action: "createTeam", eventId: "team-paid", name: "Beta Builders" },
    bob,
  )
).teamId;
await request({ action: "invite", teamId: secondTeam, uid: "charlie" }, bob);
await request(
  { action: "respondInvite", teamId: secondTeam, status: "accepted" },
  charlie,
);
await request(
  { ...booking, teamId: secondTeam, quotedFee: 800, trxId: "TRX234567" },
  bob,
  409,
); // A partner cannot double-register.
await request(
  { action: "status", id: teamReg.ticket, status: "cancelled" },
  alice,
);
await request(
  { action: "status", id: teamReg.ticket, status: "confirmed" },
  admin,
  409,
);
assert.equal((await request()).seatCounts["team-paid"], undefined);
await request(
  { ...booking, teamId: secondTeam, quotedFee: 800, trxId: "TRX234567" },
  bob,
);
assert.equal((await request()).seatCounts["team-paid"], 1);
// Paid individual transactions are reviewed and cannot be reused for another active booking.
await request(
  {
    ...event,
    id: "paid-individual",
    fee: 100,
    paymentNumber: "01700000000",
    paymentMethod: "Nagad",
    capacity: 5,
  },
  admin,
);
const paid = {
  ...reg,
  eventId: "paid-individual",
  trxId: "PAY123456",
  quotedFee: 100,
  acknowledgeConflict: true,
};
const paidReg = await request(paid, alice);
await request(paid, bob, 409);
await request(
  { action: "status", id: paidReg.ticket, status: "confirmed" },
  alice,
  403,
);
assert.equal((await request()).registrations.length, 0);

// Explicit form mode governs every event; solo must never carry hidden teammates.
const dana = await token("dana"),
  erin = await token("erin");
await request(
  { ...event, id: "choose-mode", capacity: 8, participation: "individual" },
  admin,
);
const inlineGroup = (
  await request(
    {
      action: "createTeam",
      eventId: "choose-mode",
      name: "Inline Builders",
      leaderName: "Dana Student",
    },
    dana,
  )
).teamId;
assert.equal(
  (await request({ action: "teams" }, dana)).directory.searchable,
  0,
);
await request({ action: "directory", name: "Erin Student" }, erin);
await request({ action: "invite", teamId: inlineGroup, uid: "erin" }, dana);
await request(
  {
    ...reg,
    eventId: "choose-mode",
    participation: "team",
    teamId: inlineGroup,
    acknowledgeConflict: true,
  },
  dana,
  409,
);
await request(
  { action: "respondInvite", teamId: inlineGroup, status: "accepted" },
  erin,
);
await request(
  { ...reg, eventId: "choose-mode", participation: "invalid" },
  dana,
  400,
);
const soloMode = await request(
  {
    ...reg,
    eventId: "choose-mode",
    participation: "individual",
    teamId: inlineGroup,
    acknowledgeConflict: true,
  },
  dana,
);
const soloRecord = soloMode.data.registrations.find(
  (r) => r.id === soloMode.ticket,
);
assert.equal(soloRecord.teamId, null);
assert.equal(soloRecord.members.length, 1);
assert.equal(soloRecord.members[0].uid, "dana");
assert.equal(
  (await request(null, erin)).registrations.some(
    (r) => r.id === soloMode.ticket,
  ),
  false,
);
await request(
  {
    ...reg,
    eventId: "choose-mode",
    participation: "team",
    teamId: inlineGroup,
    acknowledgeConflict: true,
  },
  dana,
  409,
);
await request(
  { action: "status", id: soloMode.ticket, status: "cancelled" },
  dana,
);
const teamMode = await request(
  {
    ...reg,
    eventId: "choose-mode",
    participation: "team",
    teamId: inlineGroup,
    acknowledgeConflict: true,
  },
  dana,
);
assert.equal(
  teamMode.data.registrations.find((r) => r.id === teamMode.ticket).members
    .length,
  2,
);
assert.equal(teamMode.data.seatCounts["choose-mode"], 1);
await request(
  { ...event, id: "team-default-solo", participation: "team", capacity: 2 },
  admin,
);
const soloInTeamDefault = await request(
  {
    ...reg,
    eventId: "team-default-solo",
    participation: "individual",
    acknowledgeConflict: true,
  },
  erin,
);
assert.equal(
  soloInTeamDefault.data.registrations.find(
    (r) => r.id === soloInTeamDefault.ticket,
  ).teamId,
  null,
);
await request({ ...event, id: "paused-group", paused: true }, admin);
await request(
  {
    action: "createTeam",
    eventId: "paused-group",
    name: "Must not create",
    leaderName: "Dana Student",
  },
  dana,
  409,
);
console.log(
  `PASS: ${checks} Firebase, team consent, payment and booking API checks.`,
);
sqlite.close();
