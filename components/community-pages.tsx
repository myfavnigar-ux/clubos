"use client";
import { useEffect, useState } from "react";
import {
  Bell,
  Phone,
  ArrowUpRight,
  BookOpen,
  UserRound,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { InvitationInbox, useTeams } from "./teams";
import { DeviceNotifications } from "./device-notifications";
import { useCommunity } from "./community-provider";
import { useAccount, AccountPanel } from "./account";
import { Field, Badge } from "./club-controls";
import {
  dialNumber,
  safeCover,
  safeTarget,
  type StudentProfile,
} from "@/lib/community-types";
import { dateLabel, timeLabel, type Snapshot } from "@/lib/data";
import { toast } from "sonner";

export function NotificationBell({ go }: { go: (route: string) => void }) {
  const c = useCommunity();
  const teams = useTeams();
  const account = useAccount();
  const invitationCount = teams.teams.filter(
    (t) =>
      !t.registrationId &&
      t.members.some(
        (m) => m.uid === account.user?.uid && m.status === "invited",
      ),
  ).length;
  const [open, setOpen] = useState(false);
  const live = c.announcements.filter(
    (n) => !n.expiresAt || n.expiresAt > Date.now(),
  );
  const unread =
    live.filter((n) => n.updatedAt > c.seen).length + invitationCount;
  return (
    <>
      <button
        className="notification-button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        onClick={() => setOpen(true)}
      >
        <Bell size={20} />
        {unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="club-dialog notification-dialog">
          <DialogTitle>Campus updates</DialogTitle>
          <DialogDescription>
            Announcements from your organizers, as they happen.
          </DialogDescription>
          <DeviceNotifications />
          <InvitationInbox />
          <button
            className="text-link"
            disabled={!unread}
            onClick={() =>
              c
                .markAllRead()
                .catch(() =>
                  toast.error("Could not save read status. Try again."),
                )
            }
          >
            Mark all as read
          </button>
          {c.noticeError ? (
            <p role="alert" className="form-error">
              {c.noticeError}
            </p>
          ) : !live.length ? (
            <div className="community-empty">
              <Bell />
              <h3>You’re all caught up</h3>
              <p>New organizer announcements will appear here.</p>
            </div>
          ) : (
            <div className="notification-list">
              {live.map((n) => (
                <article
                  className={`notification-item ${n.updatedAt > c.seen ? "unread" : ""}`}
                  key={n.id}
                >
                  <div>
                    <strong>{n.title}</strong>
                    {n.priority === "important" && (
                      <span className="priority-tag">Important</span>
                    )}
                  </div>
                  <p>{n.body}</p>
                  <small>
                    {new Date(n.createdAt).toLocaleString("en-GB", {
                      timeZone: "Asia/Dhaka",
                    })}{" "}
                    BST
                  </small>
                  {n.target && safeTarget(n.target) && (
                    <button
                      className="text-link"
                      onClick={() => {
                        go(n.target);
                        setOpen(false);
                      }}
                    >
                      Open details <ArrowUpRight size={14} />
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function BlogPage({
  id,
  go,
}: {
  id?: string;
  go: (route: string) => void;
}) {
  const c = useCommunity();
  const [query, setQuery] = useState("");
  const articles = c.blogs.filter((b) => b.published);
  const article = id ? articles.find((b) => b.id === id) : null;
  const filtered = articles.filter((b) =>
    (b.title + " " + b.category + " " + b.excerpt)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  if (c.loading && !c.sample) return <p role="status">Loading stories…</p>;
  if (id)
    return article ? (
      <article className="blog-detail">
        <button className="text-link" onClick={() => go("blogs")}>
          ← All stories
        </button>
        <span className="eyebrow">{article.category}</span>
        <h1>{article.title}</h1>
        <p className="blog-standfirst">{article.excerpt}</p>
        <p className="fine-print">
          {article.author} ·{" "}
          {dateLabel(new Date(article.createdAt).toISOString())} ·{" "}
          {Math.max(1, Math.ceil(article.body.split(/\s+/).length / 180))} min
          read
        </p>
        {safeCover(article.cover) && (
          <img src={article.cover} alt="" className="blog-cover" />
        )}
        <div className="blog-body">
          {article.body.split(/\n\s*\n/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </article>
    ) : (
      <div className="community-empty">
        <h1>Story not found</h1>
        <button className="primary" onClick={() => go("blogs")}>
          Browse stories
        </button>
      </div>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">IDEAS WORTH SHARING</p>
          <h1>
            Campus journal<span>.</span>
          </h1>
          <p>
            Practical guides, new perspectives, and your next spark of
            inspiration.
          </p>
        </div>
        <BookOpen size={38} />
      </div>
      <input
        className="community-search"
        aria-label="Search blog posts"
        placeholder="Find a story, topic or idea…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {c.sample && (
        <p className="fine-print">
          10 starter stories from ClubOS editorial. Organizers can edit and
          publish stories from the admin panel.
        </p>
      )}
      {c.error && (
        <p className="fine-print">
          Live updates are temporarily unavailable.{" "}
          {c.sample
            ? "Showing starter stories."
            : "Showing the last available update."}
        </p>
      )}
      <div className="blog-grid">
        {filtered.map((b) => (
          <article className="blog-card" key={b.id}>
            <button
              className="blog-image-button"
              aria-label={`Read ${b.title}`}
              onClick={() => go("blog/" + b.id)}
            >
              {safeCover(b.cover) && (
                <img loading="lazy" src={b.cover} alt="" />
              )}
            </button>
            <div>
              <span className="eyebrow">{b.category}</span>
              <h2>
                <button onClick={() => go("blog/" + b.id)}>{b.title}</button>
              </h2>
              <p>{b.excerpt}</p>
              <small>
                {b.author} ·{" "}
                {Math.max(1, Math.ceil(b.body.split(/\s+/).length / 180))} min
                read
              </small>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <div className="community-empty">
          <h2>{query ? "No matching stories" : "Stories are on their way"}</h2>
          <p>
            {query
              ? "Try another topic or clear your search."
              : "New articles will appear here when an organizer publishes them."}
          </p>
        </div>
      )}
    </>
  );
}
export function SupportPage() {
  const c = useCommunity();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">WE’RE HERE TO HELP</p>
          <h1>
            A little help<span>.</span>
          </h1>
          <p>For account questions, registration help and event-day support.</p>
        </div>
        <Phone size={38} />
      </div>
      <div className="support-grid">
        {!c.support.some((s) => s.active) && (
          <p>No support contacts are published yet. Please check back soon.</p>
        )}
        {c.support
          .filter((s) => s.active)
          .map((s) => {
            const phone = dialNumber(s.phone);
            return (
              <article className="support-card" key={s.id}>
                <span className="support-icon">
                  <Phone />
                </span>
                <h2>{s.name}</h2>
                <p>{s.role}</p>
                <strong className="support-number">{s.phone}</strong>
                <small>{s.hours}</small>
                {phone ? (
                  <a className="primary" href={`tel:${phone}`}>
                    Call now <ArrowUpRight size={16} />
                  </a>
                ) : (
                  <button className="secondary" disabled>
                    Number coming soon
                  </button>
                )}
              </article>
            );
          })}
      </div>
      <div className="support-faq">
        <h2>Before you call</h2>
        <details>
          <summary>Where is my registration?</summary>
          <p>
            Sign in to the account you used, then open My registrations. Your
            ticket and current status appear there.
          </p>
        </details>
        <details>
          <summary>How do I verify my email?</summary>
          <p>
            Open My account, send a verification email, open its link from your
            inbox or spam folder, then return and select “I’ve verified my
            email”.
          </p>
        </details>
        <details>
          <summary>Can I cancel my registration?</summary>
          <p>
            Yes. Open My registrations and cancel the relevant ticket. Its seat
            is released immediately.
          </p>
        </details>
      </div>
    </>
  );
}

export function ProfilePage({
  data,
  go,
}: {
  data: Snapshot;
  go: (route: string) => void;
}) {
  const account = useAccount();
  const [profile, setProfile] = useState<StudentProfile | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [editing, setEditing] = useState(false);
  useEffect(() => {
    setProfile(null);
    setLoading(true);
    setError("");
    if (!account.user) {
      setLoading(false);
      return;
    }
    let stop: (() => void) | undefined,
      alive = true;
    import("@/lib/community-store")
      .then((store) => {
        if (alive)
          stop = store.watchProfile(
            account.user!.uid,
            (v) => {
              if (alive) {
                setProfile(v);
                setLoading(false);
              }
            },
            (e) => {
              if (alive) {
                setError(store.cloudError(e));
                setLoading(false);
              }
            },
          );
      })
      .catch(() => {
        if (alive) {
          setError("Your profile could not load. Please refresh.");
          setLoading(false);
        }
      });
    return () => {
      alive = false;
      stop?.();
    };
  }, [account.user?.uid]);
  if (!account.user) return <AccountPanel />;
  const own = data.registrations.filter((r) => r.own === 1),
    active = own.filter((r) => r.status !== "cancelled");
  const display =
    profile?.displayName || account.user.displayName || "Your student profile";
  return (
    <>
      <div className="profile-hero">
        <div className="profile-avatar">
          {display.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="eyebrow">YOUR CAMPUS IDENTITY</p>
          <h1>{display}</h1>
          <p>
            {account.user.email}{" "}
            {account.user.emailVerified && <CheckCircle2 size={16} />}
          </p>
          <small>
            {profile?.institution ||
              "Add your institution to complete your profile"}
          </small>
        </div>
        <button className="secondary" onClick={() => setEditing(!editing)}>
          {editing ? "Close editor" : "Edit profile"}
        </button>
      </div>
      <div className="mini-stats four">
        <div>
          <strong>{own.length}</strong>
          <span>Total registrations</span>
        </div>
        <div>
          <strong>{active.length}</strong>
          <span>Active registrations</span>
        </div>
        <div>
          <strong>{own.filter((r) => r.status === "checked_in").length}</strong>
          <span>Events attended</span>
        </div>
        <div>
          <strong>{own.filter((r) => r.status === "cancelled").length}</strong>
          <span>Cancelled</span>
        </div>
      </div>
      {loading && <p role="status">Loading your profile…</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {(editing || (!loading && !profile)) && (
        <form
          className="profile-editor"
          key={account.user.uid}
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setError("");
            const fd = new FormData(e.currentTarget);
            try {
              const store = await import("@/lib/community-store");
              await store.saveProfile({
                uid: account.user!.uid,
                email: account.user!.email || "",
                displayName: String(fd.get("displayName")),
                institution: String(fd.get("institution")),
                grade: String(fd.get("grade")),
                phone: String(fd.get("phone")),
                bio: String(fd.get("bio")),
                interests: String(fd.get("interests")),
              });
              toast.success("Profile saved.");
              setEditing(false);
            } catch {
              setError(
                "Could not save your profile. Check the connection and database permissions.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <h2>Make it yours</h2>
          <div className="form-grid">
            <Field
              name="displayName"
              label="Full name"
              required
              minLength={2}
              maxLength={80}
              defaultValue={
                profile?.displayName || account.user.displayName || ""
              }
            />
            <Field
              name="institution"
              label="School / college"
              maxLength={120}
              required
              defaultValue={profile?.institution || ""}
            />
            <Field
              name="grade"
              label="Class / year"
              maxLength={60}
              defaultValue={profile?.grade || ""}
            />
            <Field
              name="phone"
              label="Phone (optional)"
              type="tel"
              maxLength={30}
              defaultValue={profile?.phone || ""}
            />
          </div>
          <Field
            name="interests"
            label="Interests"
            placeholder="Robotics, design, coding…"
            maxLength={180}
            defaultValue={profile?.interests || ""}
          />
          <label className="field">
            <span>About you</span>
            <textarea
              name="bio"
              rows={3}
              maxLength={600}
              defaultValue={profile?.bio || ""}
            />
          </label>
          <p className="fine-print">
            Your profile and contact information are visible only to you and
            authorized organizers.
          </p>
          <button className="primary" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      )}
      {profile && !editing && (
        <div className="profile-about">
          <h2>About</h2>
          <p>
            {profile.bio || "Your story starts here. Add a short introduction."}
          </p>
          <p>
            <strong>Interests:</strong> {profile.interests || "Not added"}
          </p>
          <p>
            <strong>Class / year:</strong> {profile.grade || "Not added"}
          </p>
        </div>
      )}
      <div className="panel-heading">
        <h2>Your registration history</h2>
        <button className="text-link" onClick={() => go("registrations")}>
          View all tickets
        </button>
      </div>
      <div className="profile-history">
        {own.length ? (
          own.map((r) => {
            const e = data.events.find((e) => e.id === r.eventId);
            return (
              <article key={r.id}>
                <div>
                  <h3>{e?.title || "Event"}</h3>
                  <p>
                    {e
                      ? `${dateLabel(e.start)} · ${timeLabel(e.start)} BST`
                      : ""}
                  </p>
                  <small>
                    Registered {dateLabel(r.created)} · #{r.id.slice(0, 8)}
                  </small>
                </div>
                <Badge status={r.status} />
                <button
                  className="text-link"
                  onClick={() => go("event/" + r.eventId)}
                >
                  Event details
                </button>
              </article>
            );
          })
        ) : (
          <div className="community-empty">
            <UserRound />
            <h3>Your next experience is waiting</h3>
            <button className="primary" onClick={() => go("discover")}>
              Explore events
            </button>
          </div>
        )}
      </div>
    </>
  );
}
