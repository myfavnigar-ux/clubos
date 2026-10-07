"use client";
import { useEffect, useState } from "react";
import { useAccount } from "./account";
import { accountRequest } from "@/lib/account-request";
export function DeviceNotifications() {
  const account = useAccount();
  const [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState(""),
    [supported, setSupported] = useState(false),
    [scheduled, setScheduled] = useState(false);
  async function api(body: Record<string, unknown>) {
    const { response, data } = await accountRequest<any>(account, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(data.error);
    return data;
  }
  useEffect(() => {
    let alive = true;
    setEnabled(false);
    setNote("");
    const can =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(can);
    if (!can || !account.user?.emailVerified) return;
    navigator.serviceWorker
      .getRegistration("/")
      .then((r) => r?.pushManager.getSubscription())
      .then((s) => {
        if (alive)
          setEnabled(
            !!s &&
              localStorage.getItem("clubos-push-owner") === account.user?.uid,
          );
      })
      .catch(() => {});
    api({ action: "pushConfig" })
      .then((d) => {
        if (alive) setScheduled(d.remindersEnabled);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [account.user?.uid, account.user?.emailVerified]);
  async function toggle() {
    setBusy(true);
    setNote("");
    try {
      if (enabled) {
        const r = await navigator.serviceWorker.getRegistration("/"),
          s = await r?.pushManager.getSubscription();
        if (s) {
          await api({ action: "unsubscribePush", endpoint: s.endpoint });
          await s.unsubscribe();
        }
        localStorage.removeItem("clubos-push-owner");
        setEnabled(false);
        setNote("Device notifications turned off.");
      } else {
        if (!account.user?.emailVerified)
          throw new Error("Sign in and verify your email first.");
        // Permission is requested directly from this click, including on iOS home-screen apps.
        const permission = await Notification.requestPermission();
        if (permission !== "granted")
          throw new Error(
            "Notifications are blocked. Allow notifications in this browser's site settings, then try again.",
          );
        const config = await api({ action: "pushConfig" });
        if (!config.ready)
          throw new Error("The organizer has not enabled device delivery yet.");
        const r = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const key = Uint8Array.from(
          atob(config.publicKey.replace(/-/g, "+").replace(/_/g, "/")),
          (c) => c.charCodeAt(0),
        );
        const s =
          (await r.pushManager.getSubscription()) ||
          (await r.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key,
          }));
        try {
          await api({ action: "subscribePush", subscription: s.toJSON() });
        } catch (e) {
          await s.unsubscribe();
          throw e;
        }
        localStorage.setItem("clubos-push-owner", account.user.uid);
        setEnabled(true);
        setScheduled(config.remindersEnabled);
        setNote(
          "Device notifications enabled. Use Test notification to check delivery.",
        );
      }
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="device-notifications">
      <strong>Keep your next move on time</strong>
      <p>
        Get team invitations on this device. Contest reminders are set for 1 day
        and 1 hour before the start.
      </p>
      {!supported ? (
        <p>
          On iPhone or iPad, add ClubOS to your Home Screen and open it there.
          Use a browser that supports web notifications.
        </p>
      ) : !account.user?.emailVerified ? (
        <p>Sign in with a verified student account to enable alerts.</p>
      ) : (
        <>
          <button className="secondary" disabled={busy} onClick={toggle}>
            {busy
              ? "Please wait…"
              : enabled
                ? "Turn off device alerts"
                : "Enable device alerts"}
          </button>
          {enabled && (
            <button
              className="text-link"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const s = await (
                    await navigator.serviceWorker.getRegistration("/")
                  )?.pushManager.getSubscription();
                  const d = await api({
                    action: "testPush",
                    endpoint: s?.endpoint,
                  });
                  setNote(
                    d.ok
                      ? "Test sent. Check your device’s notification center."
                      : "A test was already sent recently, or delivery failed. Try again in a minute.",
                  );
                } catch (e) {
                  setNote((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Test notification
            </button>
          )}
        </>
      )}
      {!scheduled && (
        <p className="fine-print">
          Automatic timed delivery is awaiting organizer scheduler setup. Until
          enabled, use My schedule → Export calendar for 1-day and 1-hour
          alarms.
        </p>
      )}
      {note && <p role="status">{note}</p>}
      <small>
        Delivery depends on device permission, internet access and system
        settings.
      </small>
    </section>
  );
}
