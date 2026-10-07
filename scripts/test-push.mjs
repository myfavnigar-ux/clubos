import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { createECDH, randomBytes } from "node:crypto";
import { build } from "esbuild";
import webpush from "web-push";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const sql = new DatabaseSync(":memory:");
for (const f of readdirSync("drizzle")
  .filter((f) => f.endsWith(".sql"))
  .sort())
  sql.exec(readFileSync("drizzle/" + f, "utf8"));
globalThis.__pushDB = {
  prepare(query) {
    return {
      args: [],
      bind(...a) {
        this.args = a;
        return this;
      },
      async first() {
        return sql.prepare(query).get(...this.args) || null;
      },
      async run() {
        return sql.prepare(query).run(...this.args);
      },
      async all() {
        return { results: sql.prepare(query).all(...this.args) };
      },
    };
  },
};
const vapid = webpush.generateVAPIDKeys();
globalThis.__pushEnv = {
  DB: globalThis.__pushDB,
  CLUBOS_VAPID_PUBLIC: vapid.publicKey,
  CLUBOS_VAPID_PRIVATE: vapid.privateKey,
};
const plugins = [
  {
    name: "fixture-env",
    setup(b) {
      b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({
        path: "env",
        namespace: "fixture",
      }));
      b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
        contents: "export const env=globalThis.__pushEnv",
        loader: "js",
      }));
    },
  },
];
await build({
  entryPoints: ["lib/push-server.ts"],
  outfile: "work/push-test.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  plugins,
});
const p = await import(pathToFileURL(resolve("work/push-test.mjs")));
const ecdh = createECDH("prime256v1");
ecdh.generateKeys();
const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/fixture",
  keys: {
    p256dh: ecdh.getPublicKey().toString("base64url"),
    auth: randomBytes(16).toString("base64url"),
  },
};
assert.equal(p.validSubscription(subscription), true);
for (const endpoint of [
  "http://fcm.googleapis.com/x",
  "https://127.0.0.1/x",
  "https://fcm.googleapis.com.evil.test/x",
  "https://user:pass@fcm.googleapis.com/x",
  "https://fcm.googleapis.com:8443/x",
])
  assert.equal(p.validSubscription({ ...subscription, endpoint }), false);
assert.equal(
  p.validSubscription({
    ...subscription,
    keys: { p256dh: "bad", auth: "bad" },
  }),
  false,
);
const user = {
  uid: "student",
  verified: true,
  admin: false,
  email: "s@example.test",
};
await p.pushAction({ action: "subscribePush", subscription }, user);
assert.equal(
  sql.prepare("SELECT uid FROM push_subscriptions").get().uid,
  "student",
);
let sends = 0,
  status = 201;
globalThis.fetch = async (url, options) => {
  sends++;
  assert.equal(url, subscription.endpoint);
  assert.equal(options.redirect, "error");
  assert.equal(options.headers["Content-Encoding"], "aes128gcm");
  assert.ok(options.headers.Authorization.startsWith("vapid "));
  assert.ok(options.body.length > 50);
  return new Response(null, { status });
};
const notice = {
  title: "Reminder",
  body: "Private test fixture",
  url: "/#teams",
  tag: "test",
};
await p.notifyUser("student", notice);
await p.notifyUser("student", notice);
assert.equal(sends, 1, "successful deliveries deduplicate");
const now = Date.now();
assert.ok(p.dueReminder(now + 3600000, now - 86400000, now, 3600000));
assert.equal(
  p.dueReminder(now + 3600001, now - 86400000, now, 3600000),
  false,
  "not early",
);
assert.equal(
  p.dueReminder(now - 1, now - 86400000, now, 3600000),
  false,
  "not after start",
);
assert.equal(
  p.dueReminder(now + 3600000, now + 1, now, 3600000),
  false,
  "not retrospectively for late registration",
);
assert.equal(
  p.dueReminder(now + 3600000 - 901000, now - 86400000, now, 3600000),
  false,
  "outside late-delivery window",
);
const start = new Date(now + 3600000).toISOString();
sql
  .prepare("INSERT INTO events VALUES(?,?,?,?,?,?,?,?)")
  .run(
    "clubos-public-v1",
    "e",
    "f",
    JSON.stringify({ id: "e", title: "Sample event" }),
    10,
    start,
    start,
    new Date(now + 7200000).toISOString(),
  );
sql
  .prepare(
    "INSERT INTO registrations(id,workspace,event_id,name,email,institution,status,created,owner_uid,members) VALUES(?,?,?,?,?,?,?,?,?,?)",
  )
  .run(
    "r",
    "clubos-public-v1",
    "e",
    "Student",
    "s@example.test",
    "Demo",
    "pending_payment",
    new Date(now - 86400000).toISOString(),
    "student",
    "[]",
  );
await p.dispatchReminders();
assert.equal(
  sends,
  1,
  "pending payments cannot receive confirmed contest reminders",
);
sql.prepare("UPDATE registrations SET status='confirmed'").run();
await p.dispatchReminders();
await p.dispatchReminders();
assert.equal(sends, 2, "one timed reminder per device");
await p.pushAction(
  { action: "unsubscribePush", endpoint: subscription.endpoint },
  { ...user, uid: "other" },
);
assert.equal(
  sql.prepare("SELECT COUNT(*) AS n FROM push_subscriptions").get().n,
  1,
  "another account cannot unsubscribe this endpoint",
);
status = 410;
await p.notifyUser("student", { ...notice, tag: "expired" });
assert.equal(
  sql.prepare("SELECT COUNT(*) AS n FROM push_subscriptions").get().n,
  0,
  "expired endpoints removed",
);
await build({
  entryPoints: ["app/mcp/route.ts"],
  outfile: "work/mcp-test.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  plugins,
});
const mcp = await import(pathToFileURL(resolve("work/mcp-test.mjs")));
assert.equal(
  (
    await mcp.POST(
      new Request("https://club.test/mcp", { method: "POST", body: "{}" }),
    )
  ).status,
  401,
);
const discovery = await mcp.POST(
  new Request("https://club.test/mcp", {
    method: "POST",
    headers: { "oai-authenticated-user-id": "test-service" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  }),
);
assert.equal((await discovery.json()).result.tools.length, 2);
console.log(
  "PASS: Web Push encryption, safe endpoints, ownership, deduplication, reminder timing/status, expired subscriptions and authenticated MCP discovery. No real device messages sent.",
);
sql.close();
