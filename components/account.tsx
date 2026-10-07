"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { Field } from "./club-controls";

type AccountContext = {
  user: User | null;
  ready: boolean;
  error: string;
  headers: () => Promise<Record<string, string>>;
  currentUid: () => string | null;
  signOut: () => Promise<void>;
  reload: () => Promise<boolean>;
};
const Context = createContext<AccountContext | null>(null);
export const useAccount = () => useContext(Context)!;
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const uid = useRef<string | null>(null);
  const currentUid = useCallback(() => uid.current, []);
  useEffect(() => {
    if (!ready || !("serviceWorker" in navigator)) return;
    let owner: string | null = null;
    try {
      owner = localStorage.getItem("clubos-push-owner");
    } catch {
      return;
    }
    if (owner && owner !== user?.uid) {
      navigator.serviceWorker
        .getRegistration("/")
        .then((r) => r?.pushManager.getSubscription())
        .then(async (s) => {
          if (s) await s.unsubscribe();
          localStorage.removeItem("clubos-push-owner");
        })
        .catch(() => {});
    }
  }, [ready, user?.uid]);
  useEffect(() => {
    let stop: (() => void) | undefined,
      alive = true;
    Promise.all([import("@/lib/firebase-client"), import("firebase/auth")])
      .then(([client, sdk]) => {
        if (!alive) return;
        stop = sdk.onIdTokenChanged(
          client.firebaseAuth(),
          (u) => {
            uid.current = u?.uid || null;
            setUser(u);
            setReady(true);
            setVersion((v) => v + 1);
          },
          () => {
            uid.current = null;
            setUser(null);
            setError("Sign-in is unavailable. Please reload or try later.");
            setReady(true);
          },
        );
      })
      .catch(() => {
        if (alive) {
          setError(
            "Could not connect to sign-in. Check your connection and reload.",
          );
          setReady(true);
        }
      });
    return () => {
      alive = false;
      stop?.();
    };
  }, []);
  const headers = useCallback(async (): Promise<Record<string, string>> => {
    if (!uid.current) return {};
    const { firebaseAuth } = await import("@/lib/firebase-client");
    const current = firebaseAuth().currentUser;
    return current
      ? { Authorization: `Bearer ${await current.getIdToken()}` }
      : {};
  }, [version]);
  async function signOut() {
    const [{ firebaseAuth }, sdk] = await Promise.all([
      import("@/lib/firebase-client"),
      import("firebase/auth"),
    ]);
    // Invalidate this browser subscription on sign-out to protect shared devices.
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
    }
    await sdk.signOut(firebaseAuth());
    uid.current = null;
    setUser(null);
  }
  async function reload() {
    const { firebaseAuth } = await import("@/lib/firebase-client");
    const current = firebaseAuth().currentUser;
    if (current) {
      await current.reload();
      await current.getIdToken(true);
      setUser(current);
      setVersion((v) => v + 1);
      return current.emailVerified;
    }
    return false;
  }
  return (
    <Context.Provider
      value={{ user, ready, error, headers, currentUid, signOut, reload }}
    >
      {children}
    </Context.Provider>
  );
}
function message(error: unknown) {
  const code = (error as { code?: string }).code;
  const messages: Record<string, string> = {
    "auth/operation-not-allowed":
      "Email/password sign-in is not enabled yet. The site owner needs to enable it in Firebase Console.",
    "auth/configuration-not-found":
      "Firebase Authentication needs to be enabled by the site owner.",
    "auth/invalid-api-key":
      "Firebase configuration is unavailable. Please contact the site owner.",
    "auth/invalid-credential":
      "That email or password is incorrect. Please try again.",
    "auth/email-already-in-use":
      "An account already uses this email. Sign in or reset your password.",
    "auth/weak-password":
      "Choose a stronger password with at least 8 characters.",
    "auth/password-does-not-meet-requirements":
      "Your password does not meet the site's password policy. Use uppercase, lowercase, a number and a symbol.",
    "auth/too-many-requests":
      "Too many attempts. Please wait a little and try again.",
    "auth/network-request-failed":
      "Check your internet connection and try again.",
    "auth/user-disabled":
      "This account has been disabled. Contact the organizer.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/unauthorized-domain":
      "The site owner needs to add this domain in Firebase Authentication settings.",
  };
  return (
    messages[code || ""] ||
    "That request could not be completed. Please try again."
  );
}
export function AccountPanel({
  admin = false,
  authorizedAdmin = false,
  onDone,
}: {
  admin?: boolean;
  authorizedAdmin?: boolean;
  onDone?: () => void;
}) {
  const { user, ready, error, reload, signOut } = useAccount();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [failure, setFailure] = useState("");
  async function verify(refresh = false) {
    setBusy(true);
    setFailure("");
    setNotice("");
    try {
      if (refresh) {
        const verified = await reload();
        setNotice(
          verified
            ? "Email verified. Your account is ready."
            : "Your email is not verified yet. Open the link in your inbox or spam folder, then try again.",
        );
      } else {
        const sdk = await import("firebase/auth");
        if (user) await sdk.sendEmailVerification(user);
        setNotice(
          "Verification link sent. Check your inbox and spam folder, then click ‘I’ve verified my email’.",
        );
      }
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <div className="account-panel">
        <p role="status">Connecting your account…</p>
      </div>
    );
  if (user)
    return (
      <section className="account-panel">
        <span className="account-icon">✦</span>
        <h2>
          {authorizedAdmin
            ? "Organizer account ready"
            : user.emailVerified
              ? admin
                ? "Organizer access"
                : "You’re signed in"
              : "One last step: verify your email"}
        </h2>
        <p>{user.email}</p>
        {authorizedAdmin ? (
          <button className="primary full" onClick={onDone}>
            Continue
          </button>
        ) : !user.emailVerified ? (
          <>
            <p>
              Verify your address to reserve seats and manage your
              registrations.
            </p>
            <button
              className="primary full"
              disabled={busy}
              onClick={() => verify()}
            >
              Send verification email
            </button>
            <button
              className="secondary full"
              disabled={busy}
              onClick={() => verify(true)}
            >
              I’ve verified my email
            </button>
          </>
        ) : admin ? (
          <p>
            This account does not have organizer access. Ask the site owner to
            authorize your Firebase UID.
          </p>
        ) : (
          <button className="primary full" onClick={onDone}>
            Continue exploring
          </button>
        )}
        {admin && (
          <div className="account-uid">
            <small>Your account UID</small>
            <code>{user.uid}</code>
          </div>
        )}
        {notice && (
          <p role="status" className="account-notice">
            {notice}
          </p>
        )}
        {failure && (
          <p role="alert" className="form-error">
            {failure}
          </p>
        )}
        <button
          className="text-link"
          disabled={busy}
          onClick={() => signOut().catch((e) => setFailure(message(e)))}
        >
          Sign out
        </button>
      </section>
    );
  return (
    <section className="account-panel">
      <span className="account-icon">✦</span>
      <p className="eyebrow">
        {admin ? "CLUBOS · ORGANIZER PORTAL" : "YOUR NEXT CHAPTER STARTS HERE"}
      </p>
      <h2>
        {mode === "reset"
          ? "Forgot your password?"
          : mode === "signup"
            ? "Join your campus community."
            : admin
              ? "Welcome back, organizer."
              : "Your campus. Your account."}
      </h2>
      <p>
        {mode === "reset"
          ? "We’ll send a secure reset link to your inbox."
          : admin
            ? "Sign in with your authorized organizer account."
            : "Save your place, keep your passes, and build your own event calendar."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setNotice("");
          setFailure("");
          const values = new FormData(e.currentTarget);
          try {
            const [{ firebaseAuth }, sdk] = await Promise.all([
              import("@/lib/firebase-client"),
              import("firebase/auth"),
            ]);
            const auth = firebaseAuth(),
              email = String(values.get("email")).trim(),
              password = String(values.get("password") || "");
            if (mode === "reset") {
              await sdk.sendPasswordResetEmail(auth, email);
              setNotice(
                "If this address has an account, a password reset link is on its way. Check your inbox and spam folder.",
              );
            } else if (mode === "signup") {
              const result = await sdk.createUserWithEmailAndPassword(
                auth,
                email,
                password,
              );
              await sdk.updateProfile(result.user, {
                displayName: String(values.get("name")).trim(),
              });
              // A failed community write must not prevent verification email delivery.
              import("@/lib/community-store")
                .then((store) =>
                  store.saveProfile({
                    uid: result.user.uid,
                    email: result.user.email || "",
                    displayName: String(values.get("name")).trim(),
                    institution: "",
                    grade: "",
                    phone: String(values.get("phone")).trim(),
                    bio: "",
                    interests: "",
                  }),
                )
                .catch(() =>
                  setNotice(
                    "Your account is created. Complete your profile from My profile once the database connection is ready.",
                  ),
                );
              await sdk.sendEmailVerification(result.user);
              await reload();
            } else {
              await sdk.signInWithEmailAndPassword(auth, email, password);
            }
          } catch (e) {
            setFailure(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === "signup" && (
          <Field
            label="Full name"
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
          />
        )}
        {mode === "signup" && (
          <Field
            label="Phone number"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+8801XXXXXXXXX"
            pattern="[+]?[0-9]{7,15}"
            required
            maxLength={16}
          />
        )}
        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          maxLength={120}
        />
        {mode !== "reset" && (
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            required
            minLength={mode === "signup" ? 8 : 1}
            maxLength={128}
          />
        )}
        {(failure || error) && (
          <p role="alert" className="form-error">
            {failure || error}
          </p>
        )}
        {notice && (
          <p role="status" className="account-notice">
            {notice}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "reset"
              ? "Send reset link"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
        </button>
      </form>
      <div className="account-links">
        <button
          className="text-link"
          disabled={busy}
          onClick={() => {
            setMode(mode === "login" ? (admin ? "reset" : "signup") : "login");
            setFailure("");
            setNotice("");
          }}
        >
          {mode !== "login"
            ? "Back to sign in"
            : admin
              ? "Forgot password?"
              : "New here? Create an account"}
        </button>
        {mode === "login" && !admin && (
          <button
            className="text-link"
            disabled={busy}
            onClick={() => {
              setMode("reset");
              setFailure("");
              setNotice("");
            }}
          >
            Forgot password?
          </button>
        )}
      </div>
      <small>
        Your account uses Firebase Authentication. Event registrations are
        stored securely by ClubOS.
      </small>
    </section>
  );
}
