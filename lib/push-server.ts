import { env } from "cloudflare:workers";
import webpush from "web-push";
import { database } from "./db";
import { AuthError, type Identity } from "./firebase-server";
import { WORKSPACE } from "./teams-server";
type Notice = { title: string; body: string; url: string; tag: string };
export function pushConfig() {
  return {
    publicKey: env.CLUBOS_VAPID_PUBLIC || "",
    ready: !!(env.CLUBOS_VAPID_PUBLIC && env.CLUBOS_VAPID_PRIVATE),
    remindersEnabled: env.CLUBOS_REMINDERS_ENABLED === "true",
  };
}
export function validSubscription(s: any) {
  if (!s || typeof s.endpoint !== "string" || s.endpoint.length > 2048)
    return false;
  try {
    const u = new URL(s.endpoint);
    const host = u.hostname;
    if (u.protocol !== "https:" || u.username || u.password || u.port || u.hash)
      return false;
    if (
      ![
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "web.push.apple.com",
      ].includes(host) &&
      !host.endsWith(".notify.windows.com")
    )
      return false;
    return (
      /^[A-Za-z0-9_-]{87}$/.test(s.keys?.p256dh || "") &&
      /^[A-Za-z0-9_-]{22}$/.test(s.keys?.auth || "")
    );
  } catch {
    return false;
  }
}
export async function pushAction(b: Record<string, any>, user: Identity) {
  const db = database();
  if (b.action === "pushConfig") return pushConfig();
  if (b.action === "unsubscribePush") {
    await db
      .prepare("DELETE FROM push_subscriptions WHERE endpoint=? AND uid=?")
      .bind(String(b.endpoint || ""), user.uid)
      .run();
    return { ok: true };
  }
  if (b.action === "subscribePush") {
    if (!pushConfig().ready)
      throw new AuthError("Device notifications are not configured yet.", 503);
    if (!validSubscription(b.subscription))
      throw new AuthError(
        "This device returned an unsupported push subscription.",
        400,
      );
    const count = await db
      .prepare("SELECT COUNT(*) AS n FROM push_subscriptions WHERE uid=?")
      .bind(user.uid)
      .first<any>();
    const existing = await db
      .prepare("SELECT uid FROM push_subscriptions WHERE endpoint=?")
      .bind(b.subscription.endpoint)
      .first<any>();
    if (count.n >= 5 && !existing)
      throw new AuthError(
        "You can enable notifications on up to five devices.",
        409,
      );
    // Possession of the complete browser subscription permits rebinding a shared device after sign-in.
    await db
      .prepare(
        "INSERT INTO push_subscriptions VALUES(?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET uid=excluded.uid,subscription=excluded.subscription,updated=excluded.updated",
      )
      .bind(
        b.subscription.endpoint,
        user.uid,
        JSON.stringify(b.subscription),
        new Date().toISOString(),
      )
      .run();
    return { ok: true };
  }
  if (b.action === "testPush") {
    const row = await db
      .prepare("SELECT * FROM push_subscriptions WHERE uid=? AND endpoint=?")
      .bind(user.uid, String(b.endpoint || ""))
      .first<any>();
    if (!row)
      throw new AuthError("Enable notifications on this device first.", 400);
    const sent = await deliver(
      row,
      {
        title: "ClubOS notifications are connected",
        body: "Team invitations and enabled contest reminders can now reach this device.",
        url: "/#registrations",
        tag: "clubos-test",
      },
      `test:${row.endpoint}:${Math.floor(Date.now() / 60000)}`,
    );
    return { ok: sent };
  }
  throw new AuthError("Unknown notification action.", 400);
}
async function digest(s: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function deliver(row: any, notice: Notice, key: string) {
  if (!pushConfig().ready) return false;
  const db = database(),
    id = await digest(key),
    now = Date.now();
  const claim = await db
    .prepare(
      "INSERT INTO push_deliveries VALUES(?,'sending',?) ON CONFLICT(id) DO UPDATE SET state='sending',updated=excluded.updated WHERE push_deliveries.state<>'sent' AND push_deliveries.updated<? RETURNING id",
    )
    .bind(id, now, now - 300000)
    .first();
  if (!claim) return false;
  try {
    const subscription = JSON.parse(row.subscription);
    if (!validSubscription(subscription))
      throw new Error("Invalid subscription");
    const details = webpush.generateRequestDetails(
      subscription,
      JSON.stringify(notice),
      {
        TTL: 900,
        urgency: "normal",
        vapidDetails: {
          subject: "https://clubos-carnival-somudro.anaim12.chatgpt.site",
          publicKey: env.CLUBOS_VAPID_PUBLIC!,
          privateKey: env.CLUBOS_VAPID_PRIVATE!,
        },
      },
    );
    const response = await fetch(details.endpoint, {
      method: "POST",
      headers: details.headers,
      body: details.body as unknown as BodyInit,
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404 || response.status === 410)
      await db
        .prepare("DELETE FROM push_subscriptions WHERE endpoint=?")
        .bind(row.endpoint)
        .run();
    if (!response.ok) throw new Error(`Push service status ${response.status}`);
    await db
      .prepare("UPDATE push_deliveries SET state='sent',updated=? WHERE id=?")
      .bind(Date.now(), id)
      .run();
    return true;
  } catch {
    await db
      .prepare("UPDATE push_deliveries SET state='failed',updated=? WHERE id=?")
      .bind(Date.now(), id)
      .run();
    return false;
  }
}
export async function notifyUser(uid: string, notice: Notice) {
  const rows = await database()
    .prepare("SELECT * FROM push_subscriptions WHERE uid=?")
    .bind(uid)
    .all();
  await Promise.allSettled(
    rows.results.map((row) =>
      deliver(row, notice, `${notice.tag}:${row.endpoint}`),
    ),
  );
}
export function dueReminder(
  start: number,
  created: number,
  time: number,
  offset: number,
) {
  const due = start - offset;
  return (
    created <= due &&
    time >= due &&
    time < Math.min(start, due + 15 * 60 * 1000)
  );
}
export async function dispatchReminders() {
  const db = database(),
    time = Date.now();
  if (!pushConfig().ready)
    throw new AuthError("Push credentials are not configured.", 503);
  const rows = await db
    .prepare(
      `SELECT r.id,r.owner_uid,r.members,r.created,e.start,e.data FROM registrations r JOIN events e ON e.id=r.event_id AND e.workspace=r.workspace WHERE r.workspace=? AND r.status IN ('confirmed','checked_in') AND e.start>? AND e.start<=?`,
    )
    .bind(
      WORKSPACE,
      new Date(time).toISOString(),
      new Date(time + 86400000).toISOString(),
    )
    .all<any>();
  let attempted = 0,
    delivered = 0;
  for (const r of rows.results) {
    for (const hours of [24, 1]) {
      if (
        !dueReminder(
          Date.parse(r.start),
          Date.parse(r.created),
          time,
          hours * 3600000,
        )
      )
        continue;
      const uids = [
        ...new Set<string>(
          [r.owner_uid, ...JSON.parse(r.members).map((m: any) => m.uid)].filter(
            Boolean,
          ),
        ),
      ];
      const event = JSON.parse(r.data);
      for (const uid of uids) {
        const subs = await db
          .prepare("SELECT * FROM push_subscriptions WHERE uid=?")
          .bind(uid)
          .all<any>();
        for (const sub of subs.results) {
          if (attempted >= 100) return { attempted, delivered, more: true };
          const key = `reminder:${r.id}:${r.start}:${hours}:${sub.endpoint}`;
          const done = await db
            .prepare(
              "SELECT id FROM push_deliveries WHERE id=? AND state='sent'",
            )
            .bind(await digest(key))
            .first();
          if (done) continue;
          attempted++;
          if (
            await deliver(
              sub,
              {
                title:
                  hours === 24
                    ? "Your contest is tomorrow"
                    : "Your contest starts in 1 hour",
                body: `${event.title} · ${new Date(r.start).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} BST`,
                url: "/#event/" + event.id,
                tag: `reminder-${r.id}-${hours}`,
              },
              key,
            )
          )
            delivered++;
        }
      }
    }
  }
  return { attempted, delivered, more: false };
}
