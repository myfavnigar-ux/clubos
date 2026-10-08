"use client";
import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { DemoAccountProvider, type AccountContext } from "./account";
import { TeamProvider } from "./teams";
import { ClubContent } from "@/app/club-app";
import {
  DEMO_KEY,
  DEMO_PASSWORD,
  demoUsers,
  newDemo,
  demoAction,
  demoSnapshot,
  type DemoState,
  type DemoUser,
} from "@/lib/judge-demo";

const LOGIN_KEY = "clubos-judge-login-v1";
function readDemo(): DemoState {
  const raw = localStorage.getItem(DEMO_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (
      parsed.version === 1 &&
      Array.isArray(parsed.events) &&
      Array.isArray(parsed.registrations)
    )
      return parsed;
  }
  const fresh = newDemo();
  localStorage.setItem(DEMO_KEY, JSON.stringify(fresh));
  return fresh;
}
export default function JudgeDemo() {
  const [user, setUser] = useState<DemoUser | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [reset, setReset] = useState(0);
  useEffect(() => {
    try {
      const uid = sessionStorage.getItem(LOGIN_KEY);
      setUser(demoUsers.find((u) => u.uid === uid) || null);
    } catch {
      setError(
        "Browser storage is unavailable. Allow site storage to use the demo.",
      );
    }
    setReady(true);
  }, []);
  const account = useMemo<AccountContext | null>(
    () =>
      user
        ? {
            demo: true,
            user: {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              emailVerified: true,
            } as User,
            ready: true,
            error: "",
            currentUid: () => user.uid,
            headers: async () => ({}),
            reload: async () => true,
            signOut: async () => {
              sessionStorage.removeItem(LOGIN_KEY);
              setUser(null);
            },
            transport: async (init) => {
              try {
                const s = readDemo();
                if (!init.method || init.method === "GET")
                  return Response.json(demoSnapshot(s, user));
                const result = demoAction(
                  s,
                  user,
                  JSON.parse(String(init.body || "{}")),
                );
                if (result.conflict)
                  return Response.json(result, { status: 409 });
                localStorage.setItem(DEMO_KEY, JSON.stringify(s));
                return Response.json(result);
              } catch (e) {
                return Response.json(
                  {
                    error:
                      e instanceof Error
                        ? e.message
                        : "Demo change could not be saved.",
                  },
                  { status: 400 },
                );
              }
            },
          }
        : null,
    [user],
  );
  if (!ready)
    return (
      <main className="judge-login">
        <p role="status">Opening judge demo…</p>
      </main>
    );
  if (!account || !user)
    return (
      <main className="judge-login">
        <a className="brand" href="/">
          club<span>os</span>
        </a>
        <p className="eyebrow">EXPLORE THE WHOLE JOURNEY</p>
        <h1>
          Your judge pass.
          <br />
          Ready when you are.
        </h1>
        <p>
          Try student registration, team invitations and organizer tools. No
          verification email. No 2FA. No real payments.
        </p>
        <div className="judge-login-grid">
          <form
            className="white-panel"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              const f = new FormData(e.currentTarget),
                u = demoUsers.find(
                  (u) =>
                    u.email === String(f.get("email")).trim().toLowerCase(),
                );
              if (!u || f.get("password") !== DEMO_PASSWORD) {
                setError(
                  "Use one of the public demo emails and the password shown here.",
                );
                return;
              }
              try {
                readDemo();
                sessionStorage.setItem(LOGIN_KEY, u.uid);
                setUser(u);
              } catch {
                setError(
                  "Browser storage is unavailable. Allow site storage to use the demo.",
                );
              }
            }}
          >
            <h2>Enter the demo</h2>
            <label className="field">
              <span>Demo account</span>
              <select name="email" aria-label="Demo account">
                {demoUsers.map((u) => (
                  <option key={u.uid} value={u.email}>
                    {u.admin
                      ? "Organizer"
                      : u.uid === "judge-partner"
                        ? "Teammate"
                        : "Student"}{" "}
                    · {u.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Public demo password</span>
              <input
                name="password"
                type="password"
                required
                autoComplete="off"
                placeholder="Use the password shown alongside"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary full">Open judge demo</button>
          </form>
          <section className="white-panel judge-access">
            <h2>Public credentials</h2>
            <p>All three accounts use:</p>
            <code>{DEMO_PASSWORD}</code>
            <ol>
              <li>
                <strong>Student:</strong> explore a fest, register, and download
                a sample pass.
              </li>
              <li>
                <strong>Teammate:</strong> accept the student's invitation, then
                switch back to register the team.
              </li>
              <li>
                <strong>Organizer:</strong> review payments, edit events, check
                in attendees and export CSV.
              </li>
            </ol>
            <p className="fine-print">
              These credentials are intentionally public and only unlock this
              browser's sample workspace. They cannot sign in to Firebase or the
              production admin. Data survives reload in this browser until
              reset. Cloud profiles, blog editing and device delivery require
              real accounts on the main site.
            </p>
          </section>
        </div>
      </main>
    );
  return (
    <div className="judge-demo-shell">
      <aside className="judge-demo-banner" aria-label="Judge demo controls">
        <div>
          <strong>PUBLIC JUDGE DEMO</strong>
          <span>
            {user.displayName} · Sample data saved in this browser. Do not enter
            personal data or send money.
          </span>
        </div>
        <div>
          <button onClick={() => account.signOut()}>Switch account</button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Reset only this browser’s fictional judge workspace?",
                )
              ) {
                try {
                  localStorage.setItem(DEMO_KEY, JSON.stringify(newDemo()));
                  setReset((n) => n + 1);
                  setError("");
                } catch {
                  setError("Could not reset browser storage.");
                }
              }
            }}
          >
            Reset demo
          </button>
          <a href="/">Live website</a>
        </div>
        {error && <p role="alert">{error}</p>}
      </aside>
      <DemoAccountProvider value={account}>
        <TeamProvider key={user.uid + "-" + reset}>
          <ClubContent key={user.uid + "-" + reset} adminMode={user.admin} />
        </TeamProvider>
      </DemoAccountProvider>
    </div>
  );
}
