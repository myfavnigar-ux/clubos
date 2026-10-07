"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  UserRound,
  Ticket,
  BookOpen,
  Bell,
  Phone,
} from "lucide-react";
import { useCommunity } from "./community-provider";
import { Field, Badge } from "./club-controls";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  dateLabel,
  timeLabel,
  type Snapshot,
  type Registration,
} from "@/lib/data";
import {
  safeCover,
  type StudentProfile,
  type Blog,
  type Announcement,
  type SupportContact,
} from "@/lib/community-types";
import { toast } from "sonner";
type Kind = "blogs" | "announcements" | "support";

export function RegistrationInspector({
  registration,
  data,
  onClose,
}: {
  registration: Registration | null;
  data: Snapshot;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<StudentProfile | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    setProfile(null);
    setError("");
    if (!registration?.ownerUid) return;
    let alive = true,
      stop: (() => void) | undefined;
    import("@/lib/community-store")
      .then((s) => {
        if (alive)
          stop = s.watchProfile(
            registration.ownerUid!,
            (p) => {
              if (alive) setProfile(p);
            },
            (e) => {
              if (alive) setError(s.cloudError(e));
            },
          );
      })
      .catch(() => {
        if (alive) setError("The profile could not load. Please refresh.");
      });
    return () => {
      alive = false;
      stop?.();
    };
  }, [registration?.ownerUid]);
  const event = data.events.find((e) => e.id === registration?.eventId);
  const history = registration
    ? data.registrations.filter((r) =>
        registration.ownerUid
          ? r.ownerUid === registration.ownerUid ||
            r.members?.some((m) => m.uid === registration.ownerUid)
          : r.email === registration.email,
      )
    : [];
  return (
    <Dialog open={!!registration} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="club-dialog student-inspector">
        <DialogTitle>Registration & student profile</DialogTitle>
        <DialogDescription>
          Account details, this ticket and the student's complete registration
          history.
        </DialogDescription>
        {registration && (
          <>
            <div className="student-heading">
              <span className="profile-avatar">
                <UserRound />
              </span>
              <div>
                <h2>{profile?.displayName || registration.name}</h2>
                <p>{registration.email}</p>
                <small>
                  {profile?.institution || registration.institution}
                </small>
              </div>
            </div>
            {error && <p className="form-error">{error}</p>}
            {!registration.ownerUid && (
              <p className="fine-print">
                Sample participant record. It is not linked to a student
                account.
              </p>
            )}
            <div className="mini-stats three">
              <div>
                <strong>{history.length}</strong>
                <span>Total registrations</span>
              </div>
              <div>
                <strong>
                  {history.filter((r) => r.status !== "cancelled").length}
                </strong>
                <span>Active</span>
              </div>
              <div>
                <strong>
                  {history.filter((r) => r.status === "checked_in").length}
                </strong>
                <span>Attended</span>
              </div>
            </div>
            <dl className="record-details">
              {registration.teamName && (
                <>
                  <dt>Group / leader</dt>
                  <dd>
                    {registration.teamName} / {registration.name}
                  </dd>
                  <dt>Accepted partners</dt>
                  <dd>{registration.members?.map((m) => m.name).join(", ")}</dd>
                </>
              )}
              {!!registration.payment?.amount && (
                <>
                  <dt>Payment</dt>
                  <dd>
                    ৳{registration.payment.amount} ·{" "}
                    {registration.payment.method} ·{" "}
                    {registration.payment.number}
                  </dd>
                  <dt>Transaction ID</dt>
                  <dd>
                    {registration.trxId} —{" "}
                    {registration.status === "pending_payment"
                      ? "Check the receiving account before approving in Participants."
                      : registration.status}
                  </dd>
                </>
              )}
              <dt>Ticket ID</dt>
              <dd className="mono">{registration.id}</dd>
              <dt>Event</dt>
              <dd>{event?.title}</dd>
              <dt>Festival</dt>
              <dd>{data.fests.find((f) => f.id === event?.festId)?.name}</dd>
              <dt>Date & time</dt>
              <dd>
                {event &&
                  `${dateLabel(event.start)} · ${timeLabel(event.start)}–${timeLabel(event.end)} BST`}
              </dd>
              <dt>Venue</dt>
              <dd>{event?.venue}</dd>
              <dt>Registered</dt>
              <dd>
                {new Date(registration.created).toLocaleString("en-GB", {
                  timeZone: "Asia/Dhaka",
                })}{" "}
                BST
              </dd>
              <dt>Status</dt>
              <dd>
                <Badge status={registration.status} />
              </dd>
              <dt>Class / year</dt>
              <dd>{profile?.grade || "Not provided"}</dd>
              <dt>Phone</dt>
              <dd>{profile?.phone || "Not provided"}</dd>
              <dt>Interests</dt>
              <dd>{profile?.interests || "Not provided"}</dd>
            </dl>
            {profile?.bio && <p>{profile.bio}</p>}
            <h3>All registrations</h3>
            <div className="profile-history">
              {history.map((r) => (
                <article key={r.id}>
                  <div>
                    <strong>
                      {data.events.find((e) => e.id === r.eventId)?.title}
                    </strong>
                    <small>#{r.id.slice(0, 8)}</small>
                  </div>
                  <Badge status={r.status} />
                </article>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function StudentDirectory({ data }: { data: Snapshot }) {
  const [profiles, setProfiles] = useState<StudentProfile[]>([]),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<StudentProfile | null>(null);
  useEffect(() => {
    let alive = true,
      stop: (() => void) | undefined;
    import("@/lib/community-store")
      .then((s) => {
        if (alive)
          stop = s.watchProfiles(
            (p) => {
              if (alive) setProfiles(p);
            },
            (e) => {
              if (alive) setError(s.cloudError(e));
            },
          );
      })
      .catch(() => {
        if (alive) setError("Student profiles could not load. Please refresh.");
      });
    return () => {
      alive = false;
      stop?.();
    };
  }, []);
  const all = useMemo(() => {
    const map = new Map(profiles.map((p) => [p.uid, p]));
    for (const r of data.registrations)
      if (r.ownerUid && !map.has(r.ownerUid))
        map.set(r.ownerUid, {
          uid: r.ownerUid,
          displayName: r.name,
          email: r.email,
          institution: r.institution,
          grade: "",
          phone: "",
          bio: "",
          interests: "",
        });
    return [...map.values()];
  }, [profiles, data.registrations]);
  const rows = all.filter((p) =>
    (p.displayName + " " + p.email + " " + p.institution)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const history = selected
    ? data.registrations.filter(
        (r) =>
          r.ownerUid === selected.uid ||
          r.members?.some((m) => m.uid === selected.uid),
      )
    : [];
  return (
    <>
      <div className="panel-heading">
        <div>
          <h2>Student accounts</h2>
          <p>Open a profile to see details and every registration.</p>
        </div>
        <span>{all.length} profiles</span>
      </div>
      <input
        className="community-search"
        aria-label="Search student accounts"
        placeholder="Search by name, email or institution"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="student-grid">
        {rows.map((p) => {
          const count = data.registrations.filter(
            (r) =>
              (r.ownerUid === p.uid ||
                r.members?.some((m) => m.uid === p.uid)) &&
              r.status !== "cancelled",
          ).length;
          return (
            <button
              className="student-card"
              key={p.uid}
              onClick={() => setSelected(p)}
            >
              <span className="profile-avatar">
                {p.displayName.slice(0, 2).toUpperCase()}
              </span>
              <strong>{p.displayName}</strong>
              <small>{p.email}</small>
              <p>{p.institution || "Institution not added"}</p>
              <span>{count} active registrations →</span>
            </button>
          );
        })}
      </div>
      {!rows.length && (
        <div className="community-empty">
          <UserRound />
          <h3>No matching student profiles</h3>
          <p>Students appear here after their first sign-in or registration.</p>
        </div>
      )}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="club-dialog student-inspector">
          <DialogTitle>{selected?.displayName}</DialogTitle>
          <DialogDescription>
            Student profile and registration history.
          </DialogDescription>
          {selected && (
            <>
              <p>{selected.email}</p>
              <dl className="record-details">
                <dt>Institution</dt>
                <dd>{selected.institution || "Not provided"}</dd>
                <dt>Class / year</dt>
                <dd>{selected.grade || "Not provided"}</dd>
                <dt>Phone</dt>
                <dd>{selected.phone || "Not provided"}</dd>
                <dt>Interests</dt>
                <dd>{selected.interests || "Not provided"}</dd>
              </dl>
              <p>{selected.bio}</p>
              <div className="mini-stats three">
                <div>
                  <strong>{history.length}</strong>
                  <span>Total registrations</span>
                </div>
                <div>
                  <strong>
                    {history.filter((r) => r.status !== "cancelled").length}
                  </strong>
                  <span>Active</span>
                </div>
                <div>
                  <strong>
                    {history.filter((r) => r.status === "checked_in").length}
                  </strong>
                  <span>Attended</span>
                </div>
              </div>
              <div className="profile-history">
                {history.map((r) => (
                  <article key={r.id}>
                    <div>
                      <h3>
                        {data.events.find((e) => e.id === r.eventId)?.title}
                      </h3>
                      <small>
                        #{r.id.slice(0, 8)} · {dateLabel(r.created)}
                      </small>
                    </div>
                    <Badge status={r.status} />
                  </article>
                ))}
                {!history.length && <p>No registrations yet.</p>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CommunityManager({
  kind,
  data,
}: {
  kind: Kind;
  data: Snapshot;
}) {
  const c = useCommunity();
  const [edit, setEdit] = useState<Blog | Announcement | SupportContact | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [query, setQuery] = useState("");
  const labels = {
    blogs: "Blog management",
    announcements: "Announcements",
    support: "Helpline contacts",
  };
  function create() {
    const id = crypto.randomUUID(),
      time = Date.now();
    setError("");
    setEdit(
      kind === "blogs"
        ? {
            id,
            title: "",
            category: "Community",
            excerpt: "",
            body: "",
            cover: "/images/clubos/campus-960.webp",
            author: "ClubOS editorial",
            published: false,
            createdAt: time,
            updatedAt: time,
          }
        : kind === "announcements"
          ? {
              id,
              title: "",
              body: "",
              priority: "info",
              target: "",
              expiresAt: 0,
              createdAt: time,
              updatedAt: time,
            }
          : {
              id,
              name: "",
              role: "",
              phone: "+880 1XXXXXXXXX",
              hours: "",
              active: true,
            },
    );
  }
  return (
    <>
      <div className="panel-heading">
        <div>
          <h2>{labels[kind]}</h2>
          <p>
            {kind === "blogs"
              ? "Write, edit and publish stories for the campus journal."
              : kind === "announcements"
                ? "Published updates appear instantly under the header bell."
                : "Keep support names, numbers and hours up to date."}
          </p>
        </div>
        <button className="primary" onClick={create}>
          <Plus size={16} />
          {kind === "blogs"
            ? "New blog"
            : kind === "announcements"
              ? "New announcement"
              : "Add contact"}
        </button>
      </div>
      {(kind === "announcements" ? c.noticeError : c.error) && (
        <p role="alert" className="form-error">
          {kind === "announcements" ? c.noticeError : c.error}
        </p>
      )}
      {kind === "blogs" && (
        <input
          className="community-search"
          aria-label="Search managed blogs"
          placeholder="Search articles…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <div className="management-grid">
        {kind === "blogs"
          ? c.blogs
              .filter((b) =>
                (b.title + " " + b.category)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((b) => (
                <article className="manage-card" key={b.id}>
                  {safeCover(b.cover) && (
                    <img
                      className="managed-cover"
                      src={b.cover}
                      alt=""
                      loading="lazy"
                    />
                  )}
                  <span className="event-fest">
                    {b.category} · {b.published ? "Published" : "Draft"}
                  </span>
                  <h3>{b.title}</h3>
                  <p>{b.excerpt}</p>
                  <button
                    className="secondary"
                    onClick={() => {
                      setError("");
                      setEdit(b);
                    }}
                  >
                    Edit article
                  </button>
                </article>
              ))
          : kind === "announcements"
            ? c.announcements.map((n) => (
                <article className="manage-card" key={n.id}>
                  <span className="event-fest">
                    {n.expiresAt && n.expiresAt < Date.now()
                      ? "Expired"
                      : n.priority}
                  </span>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                  <div className="manage-bottom">
                    <button
                      className="secondary"
                      onClick={() => {
                        setError("");
                        setEdit(n);
                      }}
                    >
                      Edit announcement
                    </button>
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const s = await import("@/lib/community-store");
                          await s.saveAnnouncement({
                            ...n,
                            expiresAt: Date.now() - 1000,
                          });
                          toast.success("Announcement archived.");
                        } catch {
                          toast.error("Could not archive announcement.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Archive
                    </button>
                  </div>
                </article>
              ))
            : c.support.map((s) => (
                <article className="manage-card" key={s.id}>
                  <Phone />
                  <h3>{s.name}</h3>
                  <p>{s.role}</p>
                  <strong>{s.phone}</strong>
                  <small>
                    {s.hours} · {s.active ? "Visible" : "Hidden"}
                  </small>
                  <button
                    className="secondary"
                    onClick={() => {
                      setError("");
                      setEdit(s);
                    }}
                  >
                    Edit contact
                  </button>
                </article>
              ))}
      </div>
      {kind === "announcements" && !c.announcements.length && (
        <div className="community-empty">
          <Bell />
          <h3>Your next update starts here</h3>
          <p>Publish an announcement to notify students inside the app.</p>
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && !busy && setEdit(null)}>
        <DialogContent className="club-dialog cms-editor">
          <DialogTitle>
            {kind === "blogs"
              ? "Write a campus story"
              : kind === "announcements"
                ? "Publish an announcement"
                : "Edit helpline contact"}
          </DialogTitle>
          <DialogDescription>
            {kind === "blogs"
              ? "Save a draft or publish it for everyone."
              : kind === "announcements"
                ? "This message is public. Do not include private student details."
                : "Use a real support number to activate Call now."}
          </DialogDescription>
          {edit && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                setBusy(true);
                setError("");
                const fd = new FormData(e.currentTarget);
                const text = (k: string) => String(fd.get(k) || "").trim();
                try {
                  const s = await import("@/lib/community-store");
                  if (kind === "blogs")
                    await s.saveBlog({
                      ...(edit as Blog),
                      title: text("title"),
                      category: text("category"),
                      excerpt: text("excerpt"),
                      body: text("body"),
                      cover: text("cover"),
                      author: text("author"),
                      published: fd.get("published") === "on",
                    });
                  else if (kind === "announcements")
                    await s.saveAnnouncement({
                      ...(edit as Announcement),
                      title: text("title"),
                      body: text("body"),
                      priority: text("priority") as "info" | "important",
                      target: text("target"),
                      expiresAt: text("expiresAt")
                        ? Date.parse(text("expiresAt") + "+06:00")
                        : 0,
                    });
                  else
                    await s.saveSupport({
                      ...(edit as SupportContact),
                      name: text("name"),
                      role: text("role"),
                      phone: text("phone"),
                      hours: text("hours"),
                      active: fd.get("active") === "on",
                    });
                  toast.success("Saved successfully.");
                  setEdit(null);
                } catch (e) {
                  setError(
                    (e as Error).message ||
                      "Could not save. Check database permissions.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {kind === "support" ? (
                <>
                  <Field
                    name="name"
                    label="Support name"
                    required
                    maxLength={80}
                    defaultValue={(edit as SupportContact).name}
                  />
                  <Field
                    name="role"
                    label="What they help with"
                    required
                    maxLength={120}
                    defaultValue={(edit as SupportContact).role}
                  />
                  <Field
                    name="phone"
                    label="Phone number"
                    type="tel"
                    required
                    maxLength={30}
                    defaultValue={(edit as SupportContact).phone}
                  />
                  <Field
                    name="hours"
                    label="Support hours"
                    maxLength={120}
                    defaultValue={(edit as SupportContact).hours}
                  />
                  <label className="check-field">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={(edit as SupportContact).active}
                    />
                    Show this contact
                  </label>
                </>
              ) : (
                <>
                  <Field
                    name="title"
                    label="Title"
                    required
                    minLength={3}
                    maxLength={kind === "blogs" ? 120 : 100}
                    defaultValue={(edit as Blog).title}
                  />
                  {kind === "blogs" && (
                    <>
                      <div className="form-grid">
                        <Field
                          name="category"
                          label="Category"
                          required
                          maxLength={40}
                          defaultValue={(edit as Blog).category}
                        />
                        <Field
                          name="author"
                          label="Author"
                          required
                          maxLength={80}
                          defaultValue={(edit as Blog).author}
                        />
                      </div>
                      <Field
                        name="excerpt"
                        label="Short summary"
                        required
                        maxLength={300}
                        defaultValue={(edit as Blog).excerpt}
                      />
                      <Field
                        name="cover"
                        label="Cover image URL"
                        required
                        maxLength={1500}
                        defaultValue={(edit as Blog).cover}
                      />
                    </>
                  )}
                  <label className="field">
                    <span>{kind === "blogs" ? "Article" : "Message"}</span>
                    <textarea
                      name="body"
                      rows={kind === "blogs" ? 10 : 4}
                      required
                      minLength={kind === "blogs" ? 30 : 3}
                      maxLength={kind === "blogs" ? 12000 : 1500}
                      defaultValue={(edit as Blog).body}
                    />
                  </label>
                  {kind === "blogs" ? (
                    <label className="check-field">
                      <input
                        type="checkbox"
                        name="published"
                        defaultChecked={(edit as Blog).published}
                      />
                      Publish in the campus journal
                    </label>
                  ) : (
                    <>
                      <label className="field">
                        <span>Priority</span>
                        <select
                          name="priority"
                          defaultValue={(edit as Announcement).priority}
                        >
                          <option value="info">Normal update</option>
                          <option value="important">Important</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Link to</span>
                        <select
                          name="target"
                          defaultValue={(edit as Announcement).target}
                        >
                          <option value="">No link</option>
                          <option value="discover">Event directory</option>
                          <option value="blogs">Campus journal</option>
                          <option value="support">Helpline</option>
                          {data.events.map((e) => (
                            <option key={e.id} value={`event/${e.id}`}>
                              {e.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Field
                        name="expiresAt"
                        label="Expires at (BST, optional)"
                        type="datetime-local"
                        defaultValue={
                          (edit as Announcement).expiresAt
                            ? new Date(
                                (edit as Announcement).expiresAt + 21600000,
                              )
                                .toISOString()
                                .slice(0, 16)
                            : ""
                        }
                      />
                    </>
                  )}
                </>
              )}
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button className="primary full" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
