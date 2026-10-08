"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Plus,
  Users,
  Layers,
  CalendarDays,
  ClipboardCheck,
  BarChart3,
  Search,
  Download,
  Ticket,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Field, Badge, saveFile } from "@/components/club-controls";
import {
  dateLabel,
  type Snapshot,
  type ClubEvent,
  type Fest,
  type Registration,
} from "@/lib/data";
import { EventArtwork } from "./event-artwork";
import {
  RegistrationInspector,
  StudentDirectory,
  CommunityManager,
} from "./community-admin";
function Picker({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="picker">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function OrganizerPanel({
  demo = false,
  data,
  loading,
  error,
  busy,
  action,
  changeStatus,
  setCancel,
  counts,
  availability,
  refresh,
}: {
  demo?: boolean;
  data: Snapshot;
  loading: boolean;
  error: string;
  busy: boolean;
  action: (body: Record<string, unknown>) => Promise<unknown>;
  changeStatus: (r: Registration, status: string) => Promise<void>;
  setCancel: (r: Registration) => void;
  counts: (id: string) => number;
  availability: (e: ClubEvent) => string;
  refresh: () => Promise<void>;
}) {
  useEffect(() => {
    const heading = document.querySelector("main h1") as HTMLElement | null;
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, []);
  const [inspect, setInspect] = useState<Registration | null>(null);
  const [eventQuery, setEventQuery] = useState(""),
    [eventFest, setEventFest] = useState("all");
  const [edit, setEdit] = useState<{
    kind: "event" | "fest";
    item?: ClubEvent | Fest;
  } | null>(null);
  const [adminTab, setAdminTab] = useState("overview"),
    [pQuery, setPQuery] = useState(""),
    [pEvent, setPEvent] = useState("all"),
    [pStatus, setPStatus] = useState("all"),
    [scan, setScan] = useState("");
  const active = useMemo(
    () => data.registrations.filter((r) => r.status !== "cancelled"),
    [data.registrations],
  );
  const pendingPayments = active.filter((r) => r.status === "pending_payment");
  const verifiedAmount = active
    .filter((r) => r.status === "confirmed" || r.status === "checked_in")
    .reduce((sum, r) => sum + (r.payment?.amount || 0), 0);
  const pendingAmount = pendingPayments.reduce(
    (sum, r) => sum + (r.payment?.amount || 0),
    0,
  );
  const chartMax = Math.max(1, ...data.events.map((e) => counts(e.id)));
  const pRows = useMemo(
    () =>
      data.registrations.filter(
        (r) =>
          (pEvent === "all" || r.eventId === pEvent) &&
          (pStatus === "all" || r.status === pStatus) &&
          [
            r.name,
            r.email,
            r.institution,
            r.id,
            r.teamName,
            r.trxId,
            ...(r.members || []).map((m) => m.name),
          ]
            .join(" ")
            .toLowerCase()
            .includes(pQuery.trim().toLowerCase()),
      ),
    [data.registrations, pEvent, pStatus, pQuery],
  );
  const exportCSV = () => {
    const safe = (v: string) =>
      '"' + (/^[\s]*[=+@\-]/.test(v) ? "'" + v : v).replace(/"/g, '""') + '"';
    const rows = pRows.map((r) => [
      r.id,
      r.name,
      r.email,
      r.institution,
      data.events.find((e) => e.id === r.eventId)?.title || "",
      r.status,
      r.teamName || "",
      r.teamId ? "Team" : "Solo",
      (r.members || []).map((m) => m.name).join("; "),
      String(r.payment?.amount || 0),
      r.payment?.method || "",
      r.trxId || "",
      r.created,
    ]);
    saveFile(
      "clubos-participants.csv",
      [
        [
          "Ticket",
          "Name",
          "Email",
          "Institution",
          "Event",
          "Status",
          "Team name",
          "Entry type",
          "Members",
          "Amount BDT",
          "Payment method",
          "Trx ID",
          "Registered at",
        ],
        ...rows,
      ]
        .map((row) => row.map(safe).join(","))
        .join("\r\n"),
      "text/csv;charset=utf-8",
    );
    toast.success(`${rows.length} registration entries exported`);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR FESTIVALS. ONE CLEAR VIEW.</p>
          <h1>
            Admin panel<span>.</span>
          </h1>
          <p>
            Manage events, track registrations, and welcome people at the door.
          </p>
        </div>
        <div className="admin-actions">
          <button
            className="secondary"
            disabled={busy || loading}
            onClick={refresh}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            Refresh data
          </button>
          <button
            className="primary"
            disabled={loading || !!error}
            onClick={() => setEdit({ kind: "event" })}
          >
            <Plus size={17} />
            Create event
          </button>
        </div>
      </div>
      <div className="demo-notice">
        <Sparkles size={17} />
        <span>
          <strong>
            {demo ? "Isolated judge workspace." : "Shared organizer workspace."}
          </strong>{" "}
          {demo
            ? "Only fictional registrations appear here; changes stay in this browser. "
            : "Registrations from all student accounts appear here. Changes are saved for everyone. Refresh to see the latest activity. "}
          Participant addresses ending in @example.test are sample data.
        </span>
      </div>
      <div className="mini-stats four">
        <div>
          <Users />
          <strong>{active.length}</strong>
          <span>Reserved slots · one per entry</span>
        </div>
        <div>
          <Layers />
          <strong>{data.fests.length}</strong>
          <span>Festivals</span>
        </div>
        <div>
          <CalendarDays />
          <strong>{data.events.length}</strong>
          <span>Events</span>
        </div>
        <div>
          <ClipboardCheck />
          <strong>
            {active.filter((r) => r.status === "checked_in").length}
          </strong>
          <span>Checked in</span>
        </div>
      </div>
      <Tabs value={adminTab} onValueChange={setAdminTab} className="admin-tabs">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="events">Event management</TabsTrigger>
          <TabsTrigger value="festivals">Festivals</TabsTrigger>
          {!demo && (
            <>
              <TabsTrigger value="students">Student profiles</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
              <TabsTrigger value="blogs">Blogs</TabsTrigger>
              <TabsTrigger value="support">Helpline</TabsTrigger>
            </>
          )}
        </TabsList>
        <TabsContent value="overview">
          {adminTab === "overview" && (
            <>
              <section
                className="payment-overview"
                aria-label="Payment overview"
              >
                <div>
                  <span className="eyebrow">PAYMENTS TO REVIEW</span>
                  <strong>{pendingPayments.length} pending</strong>
                  <p>
                    ৳{pendingAmount.toLocaleString("en-BD")} submitted · verify
                    Trx IDs before confirming.
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      setPStatus("pending_payment");
                      setPEvent("all");
                      setPQuery("");
                      setAdminTab("participants");
                    }}
                  >
                    Review payments
                  </button>
                </div>
                <div>
                  <span className="eyebrow">VERIFIED REGISTRATION FEES</span>
                  <strong>৳{verifiedAmount.toLocaleString("en-BD")}</strong>
                  <p>
                    Confirmed and checked-in entries only. Uses the fee saved at
                    booking, even if an event price changes later. Cancelled
                    entries are excluded; this is not a refund ledger.
                  </p>
                </div>
              </section>
              <div className="overview-grid">
                <section className="white-panel">
                  <div className="panel-heading">
                    <h2>Registration pulse</h2>
                    <BarChart3 size={20} />
                  </div>
                  <p className="muted">
                    Active registrations across your events
                  </p>
                  <div className="chart">
                    {data.events.map((e) => (
                      <div key={e.id}>
                        <span>{e.title}</span>
                        <div>
                          <i
                            style={{
                              width: `${Math.max(0, (counts(e.id) / chartMax) * 100)}%`,
                            }}
                          />
                        </div>
                        <strong>{counts(e.id)}</strong>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="white-panel">
                  <h2>At the door</h2>
                  <p className="muted">
                    Scan the pass with a QR reader, then paste its code or
                    ticket ID.
                  </p>
                  <form
                    className="checkin"
                    onSubmit={async (ev) => {
                      ev.preventDefault();
                      try {
                        await action({
                          action: "checkIn",
                          id: scan.trim(),
                        });
                        toast.success("Participant checked in. Welcome!");
                        setScan("");
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    <Field
                      label="Ticket ID"
                      placeholder="clubos:… or full ticket ID"
                      value={scan}
                      onChange={(e) => setScan(e.target.value)}
                      required
                    />
                    <button
                      className="primary full"
                      disabled={busy || !scan.trim()}
                    >
                      <ClipboardCheck size={17} />
                      Check in participant
                    </button>
                  </form>
                  <div className="info-note">
                    <Ticket size={20} />
                    <p>
                      Ticket IDs are available in My registrations and the
                      participants export.
                    </p>
                  </div>
                  <div className="capacity-summary">
                    <h3>Capacity watch</h3>
                    {data.events
                      .filter((e) => counts(e.id) >= e.capacity * 0.75)
                      .map((e) => (
                        <p key={e.id}>
                          <span>{e.title}</span>
                          <strong>
                            {counts(e.id)}/{e.capacity}
                          </strong>
                        </p>
                      ))}
                    {data.events.every(
                      (e) => counts(e.id) < e.capacity * 0.75,
                    ) && <p>Plenty of room across all events.</p>}
                  </div>
                </section>
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent value="participants">
          {adminTab === "participants" && (
            <>
              <div className="table-toolbar">
                <label className="search">
                  <Search size={17} />
                  <input
                    aria-label="Search participants"
                    placeholder="Name, team, member, Trx ID, ticket…"
                    value={pQuery}
                    onChange={(e) => setPQuery(e.target.value)}
                  />
                </label>
                <Picker
                  label="Filter by event"
                  value={pEvent}
                  onChange={setPEvent}
                  options={[
                    { value: "all", label: "All events" },
                    ...data.events.map((e) => ({
                      value: e.id,
                      label: e.title,
                    })),
                  ]}
                />
                <Picker
                  label="Filter by status"
                  value={pStatus}
                  onChange={setPStatus}
                  options={[
                    "all",
                    "pending_payment",
                    "confirmed",
                    "checked_in",
                    "cancelled",
                  ].map((x) => ({
                    value: x,
                    label: x === "all" ? "All statuses" : x.replace("_", " "),
                  }))}
                />
                <button className="secondary" onClick={exportCSV}>
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
              <div className="table-panel">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Participant</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Manage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <button
                            className="student-name-link"
                            onClick={() => setInspect(r)}
                          >
                            {r.name}
                          </button>
                          <small>{r.email}</small>
                          <button
                            title="Copy full ticket ID"
                            className="ticket-copy"
                            onClick={() =>
                              navigator.clipboard
                                .writeText(r.id)
                                .then(() =>
                                  toast.success("Full ticket ID copied"),
                                )
                                .catch(() =>
                                  toast.error(
                                    "Copy unavailable. Use Export CSV.",
                                  ),
                                )
                            }
                          >
                            #{r.id.slice(0, 8)}
                          </button>
                        </TableCell>
                        <TableCell>
                          {data.events.find((e) => e.id === r.eventId)?.title}
                        </TableCell>
                        <TableCell>
                          {r.institution}
                          {r.trxId && (
                            <p className="fine-print">
                              {r.payment?.method} · ৳{r.payment?.amount}
                              <br />
                              Trx: <strong>{r.trxId}</strong>
                            </p>
                          )}
                          {r.teamName && (
                            <p className="fine-print">
                              {r.teamName} · {r.members?.length} members
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge status={r.status} />
                        </TableCell>
                        <TableCell>
                          <Picker
                            label={"Change status for " + r.name}
                            value={r.status}
                            onChange={(v) =>
                              v === "cancelled"
                                ? setCancel(r)
                                : changeStatus(r, v)
                            }
                            options={[
                              {
                                value: "pending_payment",
                                label: "Awaiting verification",
                                disabled: true,
                              },
                              {
                                value: "confirmed",
                                label:
                                  r.status === "pending_payment"
                                    ? "Verify payment & confirm"
                                    : "Confirmed",
                              },
                              { value: "checked_in", label: "Checked in" },
                              { value: "cancelled", label: "Cancelled" },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!pRows.length && (
                  <div className="empty">
                    <Search />
                    <h3>No matching participants</h3>
                    <p>Try another search or filter.</p>
                  </div>
                )}
                <div className="table-count">
                  {pRows.length} of {data.registrations.length} registration
                  entries · one row per solo or team booking
                </div>
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent value="events">
          {adminTab === "events" && (
            <>
              <div className="admin-toolbar">
                <input
                  className="community-search"
                  aria-label="Search managed events"
                  placeholder="Search event name, category or venue"
                  value={eventQuery}
                  onChange={(e) => setEventQuery(e.target.value)}
                />
                <Picker
                  value={eventFest}
                  onChange={setEventFest}
                  label="Filter managed events by festival"
                  options={[
                    { value: "all", label: "All festivals" },
                    ...data.fests.map((f) => ({ value: f.id, label: f.name })),
                  ]}
                />
              </div>
              <div className="management-grid">
                {data.events
                  .filter(
                    (e) =>
                      (eventFest === "all" || e.festId === eventFest) &&
                      (e.title + " " + e.category + " " + e.venue)
                        .toLowerCase()
                        .includes(eventQuery.toLowerCase()),
                  )
                  .map((e) => (
                    <article className="manage-card" key={e.id}>
                      <div className="managed-event-art">
                        <EventArtwork event={e} compact />
                      </div>
                      <div>
                        <span className="event-fest">
                          {data.fests.find((f) => f.id === e.festId)?.name}
                        </span>
                        <h3>{e.title}</h3>
                        <p>
                          {dateLabel(e.start)} · {e.venue}
                        </p>
                      </div>
                      <Badge status={availability(e).toLowerCase()} />
                      <Progress
                        value={(counts(e.id) / e.capacity) * 100}
                        className="seat-progress"
                      />
                      <div className="manage-bottom">
                        <span>
                          {counts(e.id)} / {e.capacity} reserved
                        </span>
                        <button
                          className="secondary"
                          onClick={() => setEdit({ kind: "event", item: e })}
                        >
                          Edit event
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent value="festivals">
          {adminTab === "festivals" && (
            <>
              <div className="panel-heading">
                <h2>Your festivals</h2>
                <button
                  className="secondary"
                  onClick={() => setEdit({ kind: "fest" })}
                >
                  <Plus size={17} />
                  Create festival
                </button>
              </div>
              <div className="management-grid">
                {data.fests.map((f) => (
                  <article key={f.id} className="manage-card">
                    <span className="event-fest">{f.date}</span>
                    <h3>{f.name}</h3>
                    <p>{f.description}</p>
                    <p>
                      <MapPin size={15} />
                      {f.venue}
                    </p>
                    <div className="manage-bottom">
                      <span>
                        {data.events.filter((e) => e.festId === f.id).length}{" "}
                        events
                      </span>
                      <button
                        className="secondary"
                        onClick={() => setEdit({ kind: "fest", item: f })}
                      >
                        Edit festival
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent value="students">
          {!demo && adminTab === "students" && <StudentDirectory data={data} />}
        </TabsContent>
        {(["blogs", "announcements", "support"] as const).map((kind) => (
          <TabsContent key={kind} value={kind}>
            {!demo && adminTab === kind && (
              <CommunityManager kind={kind} data={data} />
            )}
          </TabsContent>
        ))}
      </Tabs>
      {demo ? (
        <Dialog
          open={!!inspect}
          onOpenChange={(v) => {
            if (!v) setInspect(null);
          }}
        >
          <DialogContent className="club-dialog">
            <DialogTitle>{inspect?.name}</DialogTitle>
            <DialogDescription>
              Fictional participant · isolated public demo
            </DialogDescription>
            <p>{inspect?.email}</p>
            <p>{inspect?.institution}</p>
            <p>Team: {inspect?.teamName || "Solo"}</p>
            <p>
              Members:{" "}
              {inspect?.members?.map((m) => m.name).join(", ") || inspect?.name}
            </p>
            <p>Trx ID: {inspect?.trxId || "Free entry"}</p>
            <p>
              Registrations in this demo:{" "}
              {
                data.registrations.filter((r) => r.email === inspect?.email)
                  .length
              }
            </p>
          </DialogContent>
        </Dialog>
      ) : (
        <RegistrationInspector
          registration={inspect}
          data={data}
          onClose={() => setInspect(null)}
        />
      )}
      <Dialog
        open={!!edit}
        onOpenChange={(v) => {
          if (!v && !busy) setEdit(null);
        }}
      >
        <DialogContent className="club-dialog editor-dialog">
          <DialogTitle>
            {edit?.item ? "Edit" : "Create"}{" "}
            {edit?.kind === "fest" ? "festival" : "event"}
          </DialogTitle>
          <DialogDescription>
            {edit?.kind === "fest"
              ? "Bring your next campus experience to life."
              : "Set the details, capacity, and registration window. All times are BST (UTC+6)."}
          </DialogDescription>
          {edit && (
            <Editor
              key={edit.kind + (edit.item?.id || "new")}
              edit={edit}
              fests={data.fests}
              busy={busy}
              save={async (body) => {
                await action(body);
                setEdit(null);
                toast.success("Saved to your workspace.");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function Editor({
  edit,
  fests,
  busy,
  save,
}: {
  edit: { kind: "event" | "fest"; item?: ClubEvent | Fest };
  fests: Fest[];
  busy: boolean;
  save: (b: Record<string, unknown>) => Promise<void>;
}) {
  const item = edit.item as any;
  const [fest, setFest] = useState(item?.festId || fests[0]?.id || ""),
    [cat, setCat] = useState(item?.category || "Development"),
    [error, setError] = useState("");
  const localDate = (s?: string) =>
    s ? new Date(Date.parse(s) + 6 * 3600000).toISOString().slice(0, 16) : "";
  return (
    <form
      onSubmit={async (ev) => {
        ev.preventDefault();
        setError("");
        const fd = new FormData(ev.currentTarget);
        const body: Record<string, unknown> = Object.fromEntries(fd.entries());
        body.action = edit.kind === "fest" ? "saveFest" : "saveEvent";
        if (item?.id) body.id = item.id;
        if (edit.kind === "event") {
          body.festId = fest;
          body.category = cat;
          body.paused = fd.get("paused") === "on";
          ["start", "end", "deadline"].forEach(
            (k) => (body[k] = body[k] + "+06:00"),
          );
        }
        try {
          await save(body);
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <Field
        label={edit.kind === "fest" ? "Festival name" : "Event title"}
        name={edit.kind === "fest" ? "name" : "title"}
        defaultValue={item?.name || item?.title || ""}
        required
        minLength={3}
        maxLength={80}
      />
      <label className="field">
        <span>Description</span>
        <textarea
          name="description"
          defaultValue={item?.description || ""}
          rows={3}
          minLength={edit.kind === "fest" ? 10 : 15}
          maxLength={edit.kind === "fest" ? 600 : 6000}
          required
        />
      </label>
      <Field
        label="Venue"
        name="venue"
        defaultValue={item?.venue || ""}
        required
        minLength={3}
        maxLength={120}
      />
      {edit.kind === "fest" ? (
        <Field
          label="Display dates (e.g. 12–13 FEB 2027)"
          name="date"
          defaultValue={item?.date || ""}
          required
          minLength={3}
          maxLength={60}
        />
      ) : (
        <>
          <div className="form-grid">
            <label className="field">
              <span>Festival</span>
              <Picker
                value={fest}
                onChange={setFest}
                label="Festival"
                options={fests.map((f) => ({ value: f.id, label: f.name }))}
              />
            </label>
            <label className="field">
              <span>Category</span>
              <Picker
                value={cat}
                onChange={setCat}
                label="Category"
                options={[
                  "Development",
                  "Programming",
                  "Robotics",
                  "Design",
                  "Gaming",
                  "Quiz",
                  "Workshop",
                  "Science",
                  "Photography",
                ].map((c) => ({ value: c, label: c }))}
              />
            </label>
          </div>
          <div className="form-grid">
            <Field
              label="Starts (BST)"
              name="start"
              type="datetime-local"
              defaultValue={localDate(item?.start)}
              required
            />
            <Field
              label="Ends (BST)"
              name="end"
              type="datetime-local"
              defaultValue={localDate(item?.end)}
              required
            />
          </div>
          <div className="form-grid">
            <Field
              label="Registration deadline (BST)"
              name="deadline"
              type="datetime-local"
              defaultValue={localDate(item?.deadline)}
              required
            />
            <Field
              label="Capacity"
              name="capacity"
              type="number"
              min={1}
              max={10000}
              step={1}
              defaultValue={item?.capacity || 50}
              required
            />
          </div>
          <fieldset className="feature-panel">
            <legend>Registration & payment</legend>
            <div className="form-grid">
              <Field
                label="Fee in BDT (0 = free)"
                name="fee"
                type="number"
                min={0}
                max={100000}
                step="0.01"
                defaultValue={item?.fee || 0}
                required
              />
              <label className="field">
                <span>Payment method</span>
                <select
                  name="paymentMethod"
                  defaultValue={item?.paymentMethod || "bKash"}
                >
                  <option>bKash</option>
                  <option>Nagad</option>
                  <option>Rocket</option>
                  <option>Bank / other</option>
                </select>
              </label>
            </div>
            <Field
              label="Payment receiving number"
              name="paymentNumber"
              type="tel"
              maxLength={16}
              placeholder="Set this for paid events"
              defaultValue={item?.paymentNumber || ""}
            />
            <p className="fine-print">
              Check the receiving account before approving a Trx ID. Pending
              payments reserve a slot; cancelling releases it. Existing bookings
              keep their original fee.
            </p>
            <label className="field">
              <span>Default form selection</span>
              <select
                name="participation"
                defaultValue={item?.participation || "individual"}
              >
                <option value="individual">Solo selected first</option>
                <option value="team">Team selected first</option>
              </select>
            </label>
            <div className="form-grid">
              <Field
                label="Minimum team size"
                name="teamMin"
                type="number"
                min={2}
                max={8}
                defaultValue={item?.teamMin || 2}
              />
              <Field
                label="Maximum team size"
                name="teamMax"
                type="number"
                min={2}
                max={8}
                defaultValue={item?.teamMax || 4}
              />
            </div>
          </fieldset>
          <label className="field">
            <span>Event format</span>
            <select name="format" defaultValue={item?.format || "In person"}>
              <option>In person</option>
              <option>Online</option>
              <option>Hybrid</option>
            </select>
          </label>
          <Field
            name="thumbnail"
            label="Thumbnail image URL (optional)"
            placeholder="https://… or /images/clubos/ai-web-960.webp"
            maxLength={1500}
            defaultValue={item?.thumbnail || ""}
          />
          <Field
            name="imageAlt"
            label="Image description"
            maxLength={240}
            defaultValue={item?.imageAlt || ""}
          />
          <p className="fine-print">
            Leave the image URL empty to use the event's original illustration.
            A secure image URL lets you replace the thumbnail everywhere.
          </p>
          {[
            ["eligibility", "Who can join", 1200],
            ["requirements", "What participants should bring", 2000],
            ["rules", "Event rules", 3000],
          ].map(([name, label, max]) => (
            <label className="field" key={String(name)}>
              <span>{label}</span>
              <textarea
                name={String(name)}
                rows={3}
                maxLength={Number(max)}
                defaultValue={item?.[String(name)] || ""}
              />
            </label>
          ))}
          <label className="check-field">
            <input
              type="checkbox"
              name="paused"
              defaultChecked={!!item?.paused}
            />
            Pause new registrations
          </label>
          <Field
            label="Skill level"
            name="level"
            defaultValue={item?.level || "All levels"}
            required
            maxLength={80}
          />
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="primary full" disabled={busy}>
        {busy
          ? "Saving…"
          : `Save ${edit.kind === "fest" ? "festival" : "event"}`}
      </button>
    </form>
  );
}
