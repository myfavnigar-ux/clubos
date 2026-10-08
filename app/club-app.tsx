"use client";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Sparkles,
  BookOpen,
  UserRound,
  Phone,
  CalendarDays,
  Ticket,
  LayoutDashboard,
  Search,
  MapPin,
  Code2,
  Compass,
  Clock,
  Users,
  CheckCircle2,
  Download,
  ChevronLeft,
  AlertCircle,
  Check,
  Layers,
  Share2,
  Loader2,
} from "lucide-react";
import { EventArtwork, festivalArtwork } from "@/components/event-artwork";
import { PassQR, downloadPass } from "@/components/club-pass";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster, toast } from "sonner";
import {
  fests as seedFests,
  events as seedEvents,
  dateLabel,
  timeLabel,
  ClubEvent,
  Fest,
  Registration,
  Snapshot,
  eventPrice,
} from "@/lib/data";
import { Field, Badge, saveFile } from "@/components/club-controls";
import { accountRequest, AccountChangedError } from "@/lib/account-request";
import {
  AccountProvider,
  AccountPanel,
  useAccount,
} from "@/components/account";
import { RegistrationMode } from "@/components/registration-mode";
import { TeamProvider, TeamsPage } from "@/components/teams";
import { CommunityProvider } from "@/components/community-provider";
import { NotificationBell } from "@/components/community-pages";
const BlogPage = lazy(() =>
  import("@/components/community-pages").then((m) => ({ default: m.BlogPage })),
);
const ProfilePage = lazy(() =>
  import("@/components/community-pages").then((m) => ({
    default: m.ProfilePage,
  })),
);
const SupportPage = lazy(() =>
  import("@/components/community-pages").then((m) => ({
    default: m.SupportPage,
  })),
);
const OrganizerPanel = lazy(() => import("@/components/organizer-panel"));
const categoryColors: Record<string, number> = {
  Development: 0,
  Programming: 1,
  Robotics: 2,
  Design: 3,
  Gaming: 4,
  Quiz: 1,
  Workshop: 0,
  Science: 2,
  Photography: 3,
};
const icsEscape = (x: string) =>
  x
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
function calendar(es: ClubEvent[]) {
  const stamp = (s: string) =>
    new Date(s)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  saveFile(
    "clubos-schedule.ics",
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ClubOS//Campus Calendar//EN",
      ...es.flatMap((e) => [
        "BEGIN:VEVENT",
        `UID:${e.id}@clubos.demo`,
        `DTSTAMP:${stamp(new Date().toISOString())}`,
        `DTSTART:${stamp(e.start)}`,
        `DTEND:${stamp(e.end)}`,
        `SUMMARY:${icsEscape(e.title)}`,
        `LOCATION:${icsEscape(e.venue)}`,
        `DESCRIPTION:${icsEscape(e.description)}`,
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        `DESCRIPTION:${icsEscape(e.title)} starts in 1 day`,
        "END:VALARM",
        "BEGIN:VALARM",
        "TRIGGER:-PT1H",
        "ACTION:DISPLAY",
        `DESCRIPTION:${icsEscape(e.title)} starts in 1 hour`,
        "END:VALARM",
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ].join("\r\n"),
    "text/calendar",
  );
}
export default function ClubApp(props: { adminMode?: boolean }) {
  return (
    <AccountProvider>
      <TeamProvider>
        <ClubContent {...props} />
      </TeamProvider>
    </AccountProvider>
  );
}
export function ClubContent({ adminMode = false }: { adminMode?: boolean }) {
  const account = useAccount();
  const [accountOpen, setAccountOpen] = useState(false);
  const refreshVersion = useRef(0);
  const [data, setData] = useState<Snapshot>({
    fests: seedFests,
    events: seedEvents,
    registrations: [],
    serverTime: new Date().toISOString(),
  });
  const [route, setRoute] = useState(adminMode ? "organizer" : "discover"),
    [query, setQuery] = useState(""),
    [festId, setFestId] = useState("all"),
    [category, setCategory] = useState("All events"),
    [openOnly, setOpenOnly] = useState(false),
    [sortBy, setSortBy] = useState("soonest");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [register, setRegister] = useState<ClubEvent | null>(null),
    [ticket, setTicket] = useState<Registration | null>(null),
    [cancel, setCancel] = useState<Registration | null>(null);
  const [regMode, setRegMode] = useState<"individual" | "team">("individual");
  const [teamReady, setTeamReady] = useState(true);
  const [regError, setRegError] = useState(""),
    [conflict, setConflict] = useState(false),
    [agree, setAgree] = useState(false),
    [ack, setAck] = useState(false);
  const ticketTitleRef = useRef<HTMLHeadingElement>(null);
  const clockAnchor = useRef({ server: Date.now(), monotonic: 0 });
  const [clock, setClock] = useState(Date.now());
  const acceptData = useCallback((d: Snapshot) => {
    clockAnchor.current = {
      server: Date.parse(d.serverTime),
      monotonic: performance.now(),
    };
    setClock(clockAnchor.current.server);
    setData(d);
  }, []);
  useEffect(() => {
    const timer = setInterval(
      () =>
        setClock(
          clockAnchor.current.server +
            performance.now() -
            clockAnchor.current.monotonic,
        ),
      15000,
    );
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setRegister(null);
    const h = document.querySelector("main h1") as HTMLElement | null;
    if (h) {
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    }
  }, [route]);
  const refresh = useCallback(async () => {
    if (!account.ready) return;
    const version = ++refreshVersion.current;
    setLoading(true);
    setError("");
    try {
      const { response: r, data: d } = await accountRequest<
        Snapshot & { error?: string }
      >(account);
      if (r.status === 401 && version === refreshVersion.current) {
        setData((previous) => ({
          ...previous,
          registrations: [],
          viewer: null,
        }));
        setTicket(null);
        setCancel(null);
      }
      if (!r.ok) throw new Error(d.error);
      if (version === refreshVersion.current) acceptData(d);
    } catch (e) {
      if (e instanceof AccountChangedError) return;
      if (version === refreshVersion.current)
        setError(e instanceof Error ? e.message : "Could not load events.");
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  }, [acceptData, account.ready, account.headers]);
  useEffect(() => {
    ++refreshVersion.current;
    setData((d) => ({ ...d, registrations: [], viewer: null }));
    setTicket(null);
    setCancel(null);
    setRegister(null);
  }, [account.user?.uid]);
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = setInterval(onFocus, 15000);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  useEffect(() => {
    refresh();
    const sync = () => {
      if (adminMode) {
        setRoute("organizer");
        return;
      }
      try {
        const next = decodeURIComponent(location.hash.slice(1)) || "discover";
        if (next === "organizer") {
          if (account.demo) {
            setRoute("discover");
            return;
          }
          location.replace("/admin");
          return;
        }
        setRoute(next);
      } catch {
        setRoute("discover");
      }
    };
    sync();
    addEventListener("hashchange", sync);
    return () => removeEventListener("hashchange", sync);
  }, [refresh, adminMode]);
  const go = (r: string) => {
    if (adminMode) {
      if (r !== "organizer") {
        if (account.demo) void account.signOut();
        else location.href = "/#" + r;
      }
      return;
    }
    location.hash = r;
    setRoute(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => {
    if (adminMode) return;
    const ctx = (document as any).modelContext;
    if (!ctx?.registerTool) return;
    const ctrl = new AbortController();
    Promise.resolve()
      .then(() => {
        if (ctrl.signal.aborted) return;
        return ctx.registerTool(
          {
            name: "search_club_events",
            title: "Search campus events",
            description:
              "Search event titles and categories in this workspace; updates the visible directory.",
            inputSchema: {
              type: "object",
              properties: { query: { type: "string", maxLength: 120 } },
              required: ["query"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: true },
            execute: async (input: unknown) => {
              const q = (input as any)?.query;
              if (typeof q !== "string" || q.length > 120)
                throw new Error(
                  "query must be a string of up to 120 characters",
                );
              setQuery(q);
              setCategory("All events");
              setFestId("all");
              go("discover");
              return {
                events: data.events
                  .filter((e) =>
                    (e.title + " " + e.category)
                      .toLowerCase()
                      .includes(q.toLowerCase()),
                  )
                  .map((e) => ({ id: e.id, title: e.title, start: e.start })),
              };
            },
          },
          { signal: ctrl.signal },
        );
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [data.events, adminMode]);
  const action = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const { response: r, data: d } = await accountRequest<{
        data: Snapshot;
        ticket: string;
        error?: string;
        conflict?: boolean;
      }>(account, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = new Error(d.error || "Change could not be saved.");
        (e as any).conflict = d.conflict;
        throw e;
      }
      if (d.data) acceptData(d.data);
      return d;
    } finally {
      setBusy(false);
    }
  };
  const { my, active, myActive, seatCounts, ownEvents } = useMemo(() => {
    const my = data.registrations.filter((r) => r.own === 1);
    const active = data.registrations.filter((r) => r.status !== "cancelled");
    const myActive = my.filter((r) => r.status !== "cancelled");
    const seatCounts = new Map<string, number>(
      Object.entries(data.seatCounts || {}),
    );
    return {
      my,
      active,
      myActive,
      seatCounts,
      ownEvents: new Set(myActive.map((r) => r.eventId)),
    };
  }, [data.registrations, data.seatCounts]);
  const counts = useCallback(
    (id: string) => seatCounts.get(id) || 0,
    [seatCounts],
  );
  const availability = (e: ClubEvent) =>
    e.paused
      ? "Paused"
      : Date.parse(e.deadline) < clock
        ? "Closed"
        : counts(e.id) >= e.capacity
          ? "Full"
          : "Open";
  const selectedEvent = route.startsWith("event/")
    ? data.events.find((e) => e.id === route.slice(6))
    : undefined;
  const isFestPage = route.startsWith("fest/");
  const activeFestId = isFestPage ? route.slice(5) : festId;
  const selectedFest = data.fests.find((f) => f.id === activeFestId);
  const featuredFest = selectedFest || data.fests[0];
  const festivalEvents = selectedFest
    ? data.events.filter((e) => e.festId === selectedFest.id)
    : [];
  const openFest = (id: string) => {
    setQuery("");
    setCategory("All events");
    setOpenOnly(false);
    setFestId("all");
    go(id === "all" ? "discover" : "fest/" + id);
  };
  const sharePage = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast.success("Page link copied. Share it with your friends.");
    } catch {
      toast.error(
        "Copy is unavailable. Copy the page address from your browser.",
      );
    }
  };
  const filtered = useMemo(
    () =>
      data.events
        .filter(
          (e) =>
            (activeFestId === "all" || e.festId === activeFestId) &&
            (category === "All events" || e.category === category) &&
            (!openOnly ||
              (!e.paused &&
                Date.parse(e.deadline) >= clock &&
                counts(e.id) < e.capacity)) &&
            (e.title + " " + e.category + " " + e.venue + " " + e.description)
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
        )
        .sort((a, b) =>
          sortBy === "deadline"
            ? Date.parse(a.deadline) - Date.parse(b.deadline)
            : Date.parse(a.start) - Date.parse(b.start),
        ),
    [
      data.events,
      activeFestId,
      category,
      openOnly,
      clock,
      counts,
      query,
      sortBy,
    ],
  );
  const schedule = useMemo(
    () =>
      data.events
        .filter((e) => ownEvents.has(e.id))
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
    [data.events, ownEvents],
  );
  const clashes = schedule.flatMap((a, i) =>
    schedule
      .slice(i + 1)
      .filter(
        (b) =>
          Date.parse(a.start) < Date.parse(b.end) &&
          Date.parse(a.end) > Date.parse(b.start),
      )
      .map((b) => `${a.title} overlaps with ${b.title}`),
  );
  const suggested = data.events
    .filter(
      (e) =>
        availability(e) === "Open" &&
        !ownEvents.has(e.id) &&
        !schedule.some(
          (other) =>
            Date.parse(e.start) < Date.parse(other.end) &&
            Date.parse(e.end) > Date.parse(other.start),
        ),
    )
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .slice(0, 3);
  const changeStatus = async (r: Registration, status: string) => {
    try {
      await action({
        action: status === "checked_in" ? "checkIn" : "status",
        id: r.id,
        status,
      });
      toast.success(
        status === "cancelled"
          ? "Registration cancelled. Your seat has been released."
          : status === "checked_in"
            ? "Participant checked in."
            : r.status === "pending_payment"
              ? "Payment verified. Registration confirmed."
              : "Registration restored.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const title =
    route === "teams"
      ? "My teams"
      : route === "profile"
        ? "My profile"
        : route === "support"
          ? "Helpline"
          : route === "blogs" || route.startsWith("blog/")
            ? "Campus journal"
            : route === "registrations"
              ? "My registrations"
              : route === "schedule"
                ? "My schedule"
                : route === "organizer"
                  ? "Admin panel"
                  : selectedEvent
                    ? "Event details"
                    : isFestPage
                      ? "Festival details"
                      : "Discover";
  const navRoute =
    isFestPage || route.startsWith("event/")
      ? "discover"
      : route.startsWith("blog/")
        ? "blogs"
        : route;
  function card(e: ClubEvent) {
    const status = availability(e);
    return (
      <article className="event-card" data-category={e.category} key={e.id}>
        <button
          className={"event-art art-" + (categoryColors[e.category] ?? 0)}
          onClick={() => go("event/" + e.id)}
          aria-label={"View " + e.title}
        >
          <EventArtwork event={e} />
          <span className="category">{e.category}</span>
          {status !== "Open" && (
            <span className="availability-tag">
              {status === "Full"
                ? "FULL"
                : status === "Paused"
                  ? "BOOKING PAUSED"
                  : "REGISTRATION CLOSED"}
            </span>
          )}
        </button>
        <div className="event-body">
          <p className="event-fest">
            {data.fests.find((f) => f.id === e.festId)?.name}
          </p>
          <h3>
            <a href={"#event/" + e.id}>{e.title}</a>
          </h3>
          <p className="event-summary">{e.description}</p>
          <p>
            <CalendarDays size={15} />
            {dateLabel(e.start)}
            <span>·</span>
            {timeLabel(e.start)} BST
          </p>
          <p>
            <MapPin size={15} />
            {e.venue}
          </p>
          <div className="seat-line">
            <span>
              {loading
                ? "Checking availability…"
                : status === "Open"
                  ? `${Math.max(0, e.capacity - counts(e.id))} slots left`
                  : status === "Full"
                    ? "All slots reserved"
                    : status === "Paused"
                      ? "Booking paused by organizer"
                      : "Deadline passed"}
            </span>
            <span>{loading ? "—" : counts(e.id) + " / " + e.capacity}</span>
          </div>
          <Progress
            value={(counts(e.id) / e.capacity) * 100}
            aria-label="Reserved registration slots"
            className="seat-progress"
          />
          <div className="card-footer">
            <strong>{eventPrice(e)}</strong>
            <button onClick={() => go("event/" + e.id)}>View event</button>
          </div>
        </div>
      </article>
    );
  }
  return (
    <CommunityProvider admin={!!data.viewer?.admin}>
      <SidebarProvider
        className={"app-shell" + (adminMode ? " admin-shell" : "")}
      >
        <a
          className="skip-link"
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("main-content")?.focus();
          }}
        >
          Skip to content
        </a>
        <Sidebar collapsible="none" className="side">
          <a
            className="brand"
            href={account.demo ? "/judge-demo#discover" : "/#discover"}
            aria-label="ClubOS home"
          >
            <span className="brand-mark">c</span>club<span>os</span>
            <sup>®</sup>
          </a>
          <div className="org">
            <span className="org-icon">
              <Code2 size={22} />
            </span>
            <div>
              <strong>DRMC IT Club</strong>
              <small>
                {adminMode ? "Organizer workspace" : "Student community"}
              </small>
            </div>
          </div>
          <span className="nav-caption">
            {adminMode ? "ORGANIZER CONSOLE" : "YOUR CAMPUS, CONNECTED"}
          </span>
          <nav aria-label="Main navigation">
            {(adminMode
              ? [
                  {
                    id: "organizer",
                    label: "Admin panel",
                    icon: LayoutDashboard,
                  },
                ]
              : ([
                  { id: "discover", label: "Discover", icon: Compass },
                  {
                    id: "registrations",
                    label: "My registrations",
                    icon: Ticket,
                  },
                  { id: "schedule", label: "My schedule", icon: CalendarDays },
                  { id: "teams", label: "My teams", icon: Users },
                  { id: "profile", label: "My profile", icon: UserRound },
                  { id: "blogs", label: "Journal", icon: BookOpen },
                  { id: "support", label: "Helpline", icon: Phone },
                ] as const)
            ).map((n) => (
              <button
                key={n.id}
                title={n.label}
                aria-label={n.label}
                aria-current={navRoute === n.id ? "page" : undefined}
                className={
                  (navRoute === n.id ? "active " : "") +
                  (n.id === "organizer" ? "mobile-admin" : "")
                }
                onClick={() => go(n.id)}
              >
                <n.icon size={19} />
                <span className="nav-long">{n.label}</span>
                <span className="nav-short">
                  {n.id === "registrations"
                    ? "Tickets"
                    : n.id === "schedule"
                      ? "Schedule"
                      : n.id === "organizer"
                        ? "Admin"
                        : n.id === "profile"
                          ? "Profile"
                          : n.label}
                </span>
                {n.id === "registrations" && myActive.length > 0 && (
                  <small className="nav-count">{myActive.length}</small>
                )}
              </button>
            ))}
          </nav>
          {adminMode &&
            (account.demo ? (
              <button
                className="admin-return"
                onClick={() => account.signOut()}
              >
                Switch to student demo
              </button>
            ) : (
              <a className="admin-return" href="/#discover">
                Open student website
              </a>
            ))}
          <div className="side-bottom">
            <div className="side-note">
              <Ticket size={30} className="side-pass-icon" />
              <h3>
                {adminMode
                  ? "Everything in its place."
                  : "Your campus. Your move."}
              </h3>
              <p>
                {adminMode
                  ? "Manage festivals, events, participants and check-in from this dedicated console."
                  : "Explore an event and get your first digital campus pass."}
              </p>
              {!adminMode && (
                <button className="text-link" onClick={() => go("event/robo")}>
                  Try an event
                </button>
              )}
            </div>
            <div className="profile">
              <span>SE</span>
              <div>
                <strong>
                  {account.user?.displayName ||
                    (adminMode ? "Organizer" : "Campus explorer")}
                </strong>
                <small>
                  {account.user
                    ? account.user.email
                    : "Find your next experience"}
                </small>
              </div>
            </div>
          </div>
        </Sidebar>
        <main id="main-content" tabIndex={-1}>
          <header className="topbar">
            <div>
              Workspace <span>/</span> <strong>{title}</strong>
            </div>
            <div className="top-right">
              {!account.demo && <NotificationBell go={go} />}
              <button
                className="header-help"
                aria-label="Open helpline"
                onClick={() => go("support")}
              >
                <Phone size={18} />
              </button>
              <button
                className="account-trigger"
                onClick={() => setAccountOpen(true)}
              >
                {account.user ? "My account" : "Sign in"}
              </button>
              <span className="avatar">
                {(account.user?.displayName || "CE").slice(0, 2).toUpperCase()}
              </span>
            </div>
          </header>
          <div className="content">
            {error && (
              <div className="error-banner" role="alert">
                <AlertCircle size={20} />
                <span>{error}</span>
                <button onClick={refresh}>Try again</button>
              </div>
            )}
            {loading && (
              <div className="loading-line" role="status">
                <Loader2 size={15} className="spin" />
                Loading your saved workspace…
              </div>
            )}
            <Suspense fallback={<p role="status">Loading your page…</p>}>
              {(route === "blogs" || route.startsWith("blog/")) && (
                <BlogPage
                  id={route.startsWith("blog/") ? route.slice(5) : undefined}
                  go={go}
                />
              )}
              {route === "profile" &&
                (account.demo ? (
                  <section className="white-panel">
                    <h1>Demo student profile</h1>
                    <p>
                      {account.user?.displayName} · {account.user?.email}
                    </p>
                    <p>
                      Sample account only. Real private profiles use Firebase.
                    </p>
                    <button
                      className="primary"
                      onClick={() => go("registrations")}
                    >
                      View my registrations
                    </button>
                  </section>
                ) : (
                  <ProfilePage data={data} go={go} />
                ))}
              {route === "support" && <SupportPage />}
            </Suspense>
            {(route === "discover" || (isFestPage && selectedFest)) && (
              <>
                {isFestPage && (
                  <nav className="festival-breadcrumb" aria-label="Breadcrumb">
                    <button className="back" onClick={() => openFest("all")}>
                      <ChevronLeft size={17} /> All festivals
                    </button>
                    <span aria-current="page">{selectedFest?.name}</span>
                  </nav>
                )}
                <div className="page-heading discovery-heading">
                  <div>
                    <p className="eyebrow">
                      {isFestPage
                        ? selectedFest?.eyebrow
                        : "MEET. MAKE. MAKE YOUR MARK."}
                    </p>
                    <h1>
                      {isFestPage
                        ? selectedFest?.name
                        : "Find your next big thing"}
                      <span>.</span>
                    </h1>
                    <p>
                      {isFestPage
                        ? "One festival. Your choice of challenges. Explore the details and reserve your place."
                        : "Discover your people. Pick your challenge. Make something that matters."}
                    </p>
                  </div>
                  <label className="search">
                    <Search size={18} />
                    <input
                      aria-label="Search events"
                      placeholder="Search events, skills, or venue…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                <section
                  className={
                    "festival-feature " + (featuredFest?.color || "green")
                  }
                  aria-label="Featured festival"
                >
                  <div className="feature-info">
                    <div className="feature-date">
                      <CalendarDays size={21} />
                      <strong>
                        {featuredFest?.date || "Dates to be announced"}
                      </strong>
                      <span>{featuredFest?.venue || "DRMC Campus, Dhaka"}</span>
                    </div>
                    <div className="feature-copy">
                      <span className="feature-label">
                        {featuredFest
                          ? "IN THE SPOTLIGHT"
                          : "THE FLAGSHIP EXPERIENCE"}
                      </span>
                      <h2>
                        {featuredFest?.name || "Explore campus festivals"}
                      </h2>
                      <p>
                        {featuredFest?.description ||
                          "Three days. Big ideas. Your people. Build, compete, and discover what comes next."}
                      </p>
                    </div>
                    <button
                      className="lime"
                      onClick={() => {
                        if (!isFestPage)
                          openFest(
                            featuredFest?.id || data.fests[0]?.id || "all",
                          );
                        else
                          document.getElementById("directory")?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }}
                    >
                      Explore events
                    </button>
                  </div>
                  <div className="feature-picture">
                    {festivalArtwork(featuredFest?.id) ? (
                      <img
                        src={`/images/clubos/${festivalArtwork(featuredFest?.id).file}-960.webp`}
                        srcSet={`/images/clubos/${festivalArtwork(featuredFest?.id).file}-480.webp 480w, /images/clubos/${festivalArtwork(featuredFest?.id).file}-960.webp 960w`}
                        sizes="(max-width: 800px) 100vw, 38vw"
                        width={960}
                        height={640}
                        fetchPriority="high"
                        decoding="async"
                        alt={festivalArtwork(featuredFest?.id).description}
                      />
                    ) : (
                      <div className="festival-art-placeholder">
                        <CalendarDays size={48} />
                        <strong>{featuredFest?.name}</strong>
                        <span>{featuredFest?.date}</span>
                      </div>
                    )}
                  </div>
                </section>
                {isFestPage && selectedFest && (
                  <section
                    className="festival-facts"
                    aria-label="Festival at a glance"
                  >
                    <div>
                      <strong>{festivalEvents.length}</strong>
                      <span>Events to explore</span>
                    </div>
                    <div>
                      <strong>
                        {loading
                          ? "…"
                          : festivalEvents.filter(
                              (e) => availability(e) === "Open",
                            ).length}
                      </strong>
                      <span>Accepting registrations</span>
                    </div>
                    <div>
                      <strong>
                        {festivalEvents.filter((e) => e.fee === 0).length}
                      </strong>
                      <span>Free experiences</span>
                    </div>
                    <button className="secondary" onClick={sharePage}>
                      <Share2 size={16} /> Share festival
                    </button>
                  </section>
                )}
                <div className="festival-strip" aria-label="Festival directory">
                  <button
                    aria-pressed={activeFestId === "all"}
                    className={activeFestId === "all" ? "chosen" : ""}
                    onClick={() => {
                      openFest("all");
                    }}
                  >
                    <Layers size={19} />
                    <span>
                      <strong>All festivals</strong>
                      <small>{data.fests.length} experiences to explore</small>
                    </span>
                  </button>
                  {data.fests.map((f, i) => (
                    <button
                      key={f.id}
                      aria-pressed={activeFestId === f.id}
                      className={activeFestId === f.id ? "chosen" : ""}
                      onClick={() => {
                        openFest(f.id);
                      }}
                    >
                      {festivalArtwork(f.id) ? (
                        <img
                          className="festival-thumbnail"
                          src={`/images/clubos/${festivalArtwork(f.id).file}-480.webp`}
                          width={120}
                          height={80}
                          loading="lazy"
                          decoding="async"
                          alt=""
                        />
                      ) : (
                        <span className={"fest-number f-" + i}>0{i + 1}</span>
                      )}
                      <span className="festival-tile-copy">
                        <strong>{f.name}</strong>
                        <small>{f.date}</small>
                        <span className="festival-event-count">
                          {data.events.filter((e) => e.festId === f.id).length}{" "}
                          events
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="section-heading" id="directory">
                  <div>
                    <h2>
                      {selectedFest ? "Festival events" : "Explore events"}{" "}
                      <span
                        aria-live="polite"
                        aria-label={`${filtered.length} events found`}
                      >
                        {filtered.length}
                      </span>
                    </h2>
                    <p>
                      Find your fit. Explore free and paid campus experiences.
                    </p>
                  </div>
                </div>
                <div
                  className="category-filters"
                  role="group"
                  aria-label="Filter events by category"
                >
                  {[
                    "All events",
                    ...Array.from(
                      new Set(
                        data.events
                          .filter(
                            (e) =>
                              activeFestId === "all" ||
                              e.festId === activeFestId,
                          )
                          .map((e) => e.category),
                      ),
                    ),
                  ].map((c) => (
                    <button
                      key={c}
                      aria-pressed={category === c}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="results-toolbar">
                  <label className="open-filter">
                    <Checkbox
                      checked={openOnly}
                      onCheckedChange={(v) => setOpenOnly(v === true)}
                      disabled={loading}
                    />
                    <span>Open for registration only</span>
                  </label>
                  <label className="sort-control">
                    <span>Sort by</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      aria-label="Sort events"
                    >
                      <option value="soonest">Event date</option>
                      <option value="deadline">Registration deadline</option>
                    </select>
                  </label>
                </div>
                <div className="event-grid">{filtered.map(card)}</div>
                {!filtered.length && (
                  <div className="empty">
                    <Search size={34} />
                    <h3>No events found</h3>
                    <p>Try a different search or clear your filters.</p>
                    <button
                      className="primary"
                      onClick={() => {
                        setQuery("");
                        setCategory("All events");
                        setFestId("all");
                        setOpenOnly(false);
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </>
            )}
            {route.startsWith("event/") &&
              (selectedEvent ? (
                <>
                  <nav className="festival-breadcrumb" aria-label="Breadcrumb">
                    <button
                      className="back"
                      onClick={() => openFest(selectedEvent.festId)}
                    >
                      <ChevronLeft size={17} />
                      {data.fests.find((f) => f.id === selectedEvent.festId)
                        ?.name || "Festival events"}
                    </button>
                    <button className="secondary" onClick={sharePage}>
                      <Share2 size={16} /> Share event
                    </button>
                  </nav>
                  <div className="detail-heading">
                    <p className="eyebrow">
                      {
                        data.fests.find((f) => f.id === selectedEvent.festId)
                          ?.name
                      }{" "}
                      / {selectedEvent.category}
                    </p>
                    <h1>{selectedEvent.title}</h1>
                    <div className="detail-chips">
                      <span>{selectedEvent.level}</span>
                      <span>
                        Solo or team · teams of {selectedEvent.teamMin || 2}–
                        {selectedEvent.teamMax || 4}
                      </span>
                      <span>{eventPrice(selectedEvent)}</span>
                    </div>
                  </div>
                  <div className="detail-grid">
                    <div>
                      <div
                        className={
                          "detail-art art-" +
                          (categoryColors[selectedEvent.category] ?? 0)
                        }
                      >
                        <EventArtwork event={selectedEvent} detail />
                        <span className="detail-art-label">
                          {selectedEvent.category} · Find your spark
                        </span>
                      </div>
                      <section className="white-panel">
                        <h2>The challenge</h2>
                        <p className="prose">{selectedEvent.description}</p>
                        {selectedEvent.format && (
                          <p className="fine-print">
                            Format: {selectedEvent.format}
                          </p>
                        )}
                        {[
                          ["Who can join", selectedEvent.eligibility],
                          ["What to bring", selectedEvent.requirements],
                          ["Event rules", selectedEvent.rules],
                        ]
                          .filter(([, text]) => text)
                          .map(([label, text]) => (
                            <section className="event-extra" key={label}>
                              <h3>{label}</h3>
                              <p style={{ whiteSpace: "pre-line" }}>{text}</p>
                            </section>
                          ))}
                        <h3>Before you arrive</h3>
                        <ul className="check-list">
                          <li>
                            <Check size={17} />
                            Bring your student ID and your ClubOS ticket code.
                          </li>
                          <li>
                            <Check size={17} />
                            Arrive 15 minutes before the session begins.
                          </li>
                          <li>
                            <Check size={17} />
                            One registration per email for each event.
                          </li>
                        </ul>
                        <div className="info-note">
                          <Sparkles size={18} />
                          <p>
                            Your schedule is checked for overlaps when you
                            register. All times are Bangladesh Standard Time
                            (UTC+6).
                          </p>
                        </div>
                      </section>
                    </div>
                    <aside className="booking-card">
                      <div className="booking-top">
                        <strong>Save your spot</strong>
                        <Badge
                          status={availability(selectedEvent).toLowerCase()}
                        />
                      </div>
                      <h2>{eventPrice(selectedEvent)}</h2>
                      <dl>
                        <div>
                          <CalendarDays size={19} />
                          <dt>
                            Date & time
                            <dd>
                              {dateLabel(selectedEvent.start)}{" "}
                              {new Date(selectedEvent.start).getFullYear()}
                              <br />
                              {timeLabel(selectedEvent.start)} –{" "}
                              {timeLabel(selectedEvent.end)} BST
                            </dd>
                          </dt>
                        </div>
                        <div>
                          <MapPin size={19} />
                          <dt>
                            Venue<dd>{selectedEvent.venue}</dd>
                          </dt>
                        </div>
                        <div>
                          <Clock size={19} />
                          <dt>
                            Registration deadline
                            <dd>
                              {dateLabel(selectedEvent.deadline)},{" "}
                              {timeLabel(selectedEvent.deadline)} BST
                            </dd>
                          </dt>
                        </div>
                        <div>
                          <Users size={19} />
                          <dt>
                            Capacity
                            <dd>
                              {counts(selectedEvent.id)} of{" "}
                              {selectedEvent.capacity} slots reserved
                            </dd>
                          </dt>
                        </div>
                      </dl>
                      <Progress
                        value={
                          (counts(selectedEvent.id) / selectedEvent.capacity) *
                          100
                        }
                        className="seat-progress"
                      />
                      <p className="capacity-note">
                        {Math.max(
                          0,
                          selectedEvent.capacity - counts(selectedEvent.id),
                        )}{" "}
                        slots available
                      </p>
                      {myActive.some((r) => r.eventId === selectedEvent.id) ? (
                        <>
                          <div className="success-note">
                            <CheckCircle2 size={18} />
                            You’re on the list!
                          </div>
                          <button
                            className="primary full"
                            onClick={() =>
                              setTicket(
                                myActive.find(
                                  (r) => r.eventId === selectedEvent.id,
                                )!,
                              )
                            }
                          >
                            View my ticket
                          </button>
                        </>
                      ) : (
                        <button
                          className="primary full"
                          disabled={
                            loading ||
                            !!error ||
                            availability(selectedEvent) !== "Open"
                          }
                          onClick={() => {
                            if (
                              !account.user ||
                              (!account.user.emailVerified &&
                                !data.viewer?.admin)
                            ) {
                              setAccountOpen(true);
                              return;
                            }
                            setRegMode(
                              selectedEvent.participation || "individual",
                            );
                            setTeamReady(
                              selectedEvent.participation !== "team",
                            );
                            setRegister(selectedEvent);
                            setRegError("");
                            setConflict(false);
                            setAgree(false);
                            setAck(false);
                          }}
                        >
                          {availability(selectedEvent) === "Open"
                            ? "Register for this event"
                            : availability(selectedEvent) === "Full"
                              ? "All slots reserved"
                              : availability(selectedEvent) === "Paused"
                                ? "Registration paused"
                                : "Registration closed"}
                        </button>
                      )}
                      <button
                        className="secondary full"
                        onClick={() => calendar([selectedEvent])}
                      >
                        <CalendarDays size={16} />
                        Add to calendar
                      </button>
                      <p className="fine-print">
                        {selectedEvent.fee
                          ? "Your ticket is confirmed after organizer payment review."
                          : "Confirmation is instant."}{" "}
                        Your ticket stays in My registrations.
                      </p>
                    </aside>
                  </div>
                </>
              ) : (
                <div className="empty">
                  <h1>Event not found</h1>
                  <button className="primary" onClick={() => go("discover")}>
                    Explore available events
                  </button>
                </div>
              ))}
            {route === "registrations" && account.user && (
              <>
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">YOUR CAMPUS PASSPORT</p>
                    <h1>
                      You’re on the list<span>.</span>
                    </h1>
                    <p>
                      Your registrations, tickets, and next adventures in one
                      place.
                    </p>
                  </div>
                  <button className="primary" onClick={() => go("discover")}>
                    Find more events
                  </button>
                </div>
                <div className="mini-stats">
                  <div>
                    <Ticket />
                    <strong>{myActive.length}</strong>
                    <span>Active registrations</span>
                  </div>
                  <div>
                    <CheckCircle2 />
                    <strong>
                      {my.filter((r) => r.status === "checked_in").length}
                    </strong>
                    <span>Events attended</span>
                  </div>
                  <div>
                    <Layers />
                    <strong>
                      {
                        new Set(
                          myActive.map(
                            (r) =>
                              data.events.find((e) => e.id === r.eventId)
                                ?.festId,
                          ),
                        ).size
                      }
                    </strong>
                    <span>Festivals to explore</span>
                  </div>
                </div>
                <div className="registrations-list">
                  {my.map((r) => {
                    const e = data.events.find((e) => e.id === r.eventId);
                    return (
                      e && (
                        <article className="registration-row" key={r.id}>
                          <div className="date-box">
                            <strong>
                              {new Date(e.start).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                timeZone: "Asia/Dhaka",
                              })}
                            </strong>
                            <span>
                              {new Date(e.start).toLocaleDateString("en-GB", {
                                month: "short",
                                timeZone: "Asia/Dhaka",
                              })}
                            </span>
                          </div>
                          <div className="registration-info">
                            <p className="event-fest">
                              {data.fests.find((f) => f.id === e.festId)?.name}
                            </p>
                            <h3>
                              <a href={"#event/" + e.id}>{e.title}</a>
                            </h3>
                            <p>
                              {r.name} · {e.venue}
                            </p>
                            {r.teamName && (
                              <p>
                                <strong>{r.teamName}</strong> · Leader: {r.name}
                                <br />
                                Partners:{" "}
                                {r.members
                                  ?.filter((m) => m.uid !== r.ownerUid)
                                  .map((m) => m.name)
                                  .join(", ")}
                              </p>
                            )}
                            {r.status === "pending_payment" && (
                              <p className="fine-print">
                                Slot reserved · awaiting payment approval
                              </p>
                            )}
                            <p>
                              {timeLabel(e.start)} – {timeLabel(e.end)} BST
                            </p>
                          </div>
                          <Badge status={r.status} />
                          <div className="row-actions">
                            <button
                              className="secondary"
                              onClick={() => setTicket(r)}
                            >
                              <Ticket size={16} />
                              View ticket
                            </button>
                            {r.status !== "cancelled" &&
                              (!r.teamId ||
                                r.ownerUid === account.user?.uid) && (
                                <button
                                  className="text-danger"
                                  disabled={busy}
                                  onClick={() => setCancel(r)}
                                >
                                  Cancel registration
                                </button>
                              )}
                          </div>
                        </article>
                      )
                    );
                  })}
                </div>
                {!my.length && !loading && (
                  <div className="empty">
                    <Ticket size={36} />
                    <h3>Your next adventure awaits</h3>
                    <p>Register for an event to get your first ticket.</p>
                    <button className="primary" onClick={() => go("discover")}>
                      Explore events
                    </button>
                  </div>
                )}
              </>
            )}
            {route === "teams" && <TeamsPage events={data.events} go={go} />}
            {route === "schedule" && account.user && (
              <>
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">MAKE TIME FOR WHAT’S NEXT</p>
                    <h1>
                      Your campus calendar<span>.</span>
                    </h1>
                    <p>
                      All your confirmed events, in the right order. Times shown
                      in BST.
                    </p>
                  </div>
                  <button
                    className="secondary"
                    disabled={!schedule.length}
                    onClick={() => calendar(schedule)}
                  >
                    <Download size={16} />
                    Export calendar
                  </button>
                </div>
                {clashes.length > 0 && (
                  <div className="warning">
                    <AlertCircle size={20} />
                    <div>
                      <strong>Overlapping events</strong>
                      {clashes.map((c) => (
                        <p key={c}>{c}</p>
                      ))}
                    </div>
                  </div>
                )}
                <div className="schedule-list">
                  {schedule.map((e) => (
                    <article key={e.id}>
                      <div className="schedule-date">
                        <span>{dateLabel(e.start)}</span>
                        <strong>{timeLabel(e.start)}</strong>
                        <small>to {timeLabel(e.end)} BST</small>
                      </div>
                      <div className="schedule-line" />
                      <div className="schedule-event">
                        <span className="event-fest">
                          {data.fests.find((f) => f.id === e.festId)?.name}
                        </span>
                        <h2>{e.title}</h2>
                        <p>
                          <MapPin size={16} />
                          {e.venue}
                        </p>
                        <button
                          className="text-link"
                          onClick={() => go("event/" + e.id)}
                        >
                          View event details
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {!schedule.length && !loading && (
                  <div className="empty">
                    <CalendarDays size={36} />
                    <h3>A little room for possibility</h3>
                    <p>Your registered events will appear here.</p>
                    <button className="primary" onClick={() => go("discover")}>
                      Find an event
                    </button>
                  </div>
                )}
                {!loading && suggested.length > 0 && (
                  <section className="schedule-suggestions">
                    <div className="section-heading">
                      <div>
                        <p className="eyebrow">A LITTLE MORE POSSIBILITY</p>
                        <h2>Fits your schedule</h2>
                        <p>
                          Available events that don’t overlap your current
                          plans.
                        </p>
                      </div>
                      <Sparkles size={24} />
                    </div>
                    <div className="suggestion-grid">
                      {suggested.map((e) => (
                        <button key={e.id} onClick={() => go("event/" + e.id)}>
                          <EventArtwork event={e} compact />
                          <span className="event-fest">{e.category}</span>
                          <strong>{e.title}</strong>
                          <span>
                            {dateLabel(e.start)} · {timeLabel(e.start)} BST
                          </span>
                          <span className="suggestion-link">Explore event</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
            {adminMode && route === "organizer" && data.viewer?.admin && (
              <Suspense
                fallback={
                  <div className="admin-loading" role="status">
                    <Loader2 className="spin" />
                    <h1>Opening admin panel…</h1>
                    <p>Getting your event tools ready.</p>
                  </div>
                }
              >
                <OrganizerPanel
                  demo={!!account.demo}
                  data={data}
                  loading={loading}
                  error={error}
                  busy={busy}
                  action={action}
                  changeStatus={changeStatus}
                  setCancel={setCancel}
                  counts={counts}
                  availability={availability}
                  refresh={refresh}
                />
              </Suspense>
            )}
            {adminMode && !data.viewer?.admin && (
              <div className="admin-auth">
                <AccountPanel admin />
              </div>
            )}
            {!adminMode &&
              ["registrations", "schedule"].includes(route) &&
              !account.user && <AccountPanel />}
            {![
              "discover",
              "registrations",
              "schedule",
              "organizer",
              "profile",
              "blogs",
              "support",
              "teams",
            ].includes(route) &&
              !route.startsWith("event/") &&
              !route.startsWith("blog/") &&
              !(isFestPage && selectedFest) && (
                <div className="empty">
                  <h1>Page not found</h1>
                  <button className="primary" onClick={() => go("discover")}>
                    Back to Discover
                  </button>
                </div>
              )}
            <footer>
              <span>Built for the people who make things happen.</span>
              <span>CLUBOS · DRMC IT CLUB</span>
              {!account.demo && (
                <a href="/judge-demo">Judge demo · no verification</a>
              )}
            </footer>
          </div>
        </main>
        <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
          <DialogContent className="club-dialog account-dialog">
            <DialogTitle className="sr-only">Your ClubOS account</DialogTitle>
            <DialogDescription className="sr-only">
              Sign in, create an account or manage your email verification.
            </DialogDescription>
            <AccountPanel
              authorizedAdmin={!!data?.viewer?.admin}
              onDone={() => setAccountOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <Dialog
          open={!!register}
          onOpenChange={(v) => {
            if (!v && !busy) setRegister(null);
          }}
        >
          <DialogContent className="club-dialog">
            <DialogTitle>Make it official.</DialogTitle>
            <DialogDescription>
              Register for {register?.title}.{" "}
              {register?.fee
                ? "Payment will be checked by an organizer before your ticket is confirmed."
                : "Your ticket is ready after successful registration."}
            </DialogDescription>
            <form
              onSubmit={async (ev) => {
                ev.preventDefault();
                if (!register || busy || !agree || !teamReady) return;
                const f = new FormData(ev.currentTarget);
                setRegError("");
                try {
                  const d = await action({
                    action: "register",
                    participation: regMode,
                    teamId: regMode === "team" ? f.get("teamId") : null,
                    trxId: f.get("trxId"),
                    quotedFee: register.fee,
                    eventId: register.id,
                    name: f.get("name"),
                    email: f.get("email"),
                    institution: f.get("institution"),
                    acknowledgeConflict: ack,
                  });
                  setRegister(null);
                  setTicket(
                    d.data.registrations.find(
                      (r: Registration) => r.id === d.ticket,
                    ) ?? null,
                  );
                  toast.success(
                    register.fee
                      ? "Submitted for payment verification."
                      : "You’re registered. See you there!",
                  );
                } catch (e) {
                  setRegError((e as Error).message);
                  setConflict(!!(e as any).conflict);
                }
              }}
            >
              {register && (
                <RegistrationMode
                  key={register.id}
                  event={register}
                  mode={regMode}
                  onChange={(m) => {
                    setRegMode(m);
                    setRegError("");
                  }}
                  onReady={setTeamReady}
                  disabled={busy}
                />
              )}
              <Field
                name="name"
                label="Full name"
                placeholder="Your name"
                defaultValue={account.user?.displayName || ""}
                required
                minLength={2}
                maxLength={80}
              />
              <Field
                name="email"
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={account.user?.email || ""}
                readOnly
                required
                maxLength={120}
              />
              <Field
                name="institution"
                label="School / college"
                placeholder="Your institution"
                defaultValue={
                  account.demo
                    ? "Example College"
                    : "Dhaka Residential Model College"
                }
                required
                minLength={2}
                maxLength={120}
              />
              {!!register?.fee && (
                <div className="payment-instructions">
                  <span className="eyebrow">
                    PAYMENT · {register.paymentMethod}
                  </span>
                  <h3>{eventPrice(register, regMode)}</h3>
                  <p>
                    {account.demo
                      ? "Demo only: do not send money. Enter a made-up Trx ID to test review."
                      : "Send the fee to this receiving number:"}
                  </p>
                  <strong className="payment-number">
                    {register.paymentNumber}
                  </strong>
                  <Field
                    label="Transaction ID (Trx ID)"
                    name="trxId"
                    autoComplete="off"
                    minLength={6}
                    maxLength={64}
                    pattern="[a-zA-Z0-9-]+"
                    required
                    placeholder="Enter the payment transaction ID"
                  />
                  <p className="fine-print">
                    {account.demo
                      ? "Use a fictional Trx ID. Switch to Organizer to test approval; no money is transferred."
                      : "Check available slots before paying. Your slot is reserved after submission; the organizer confirms after checking the payment. Contact Helpline for corrections or refund questions."}
                  </p>
                </div>
              )}
              <label className="check-field">
                <Checkbox
                  checked={agree}
                  onCheckedChange={(v) => setAgree(v === true)}
                  required
                />
                <span>
                  I confirm my details and agree to follow the event guidelines.
                </span>
              </label>
              {conflict && (
                <label className="check-field">
                  <Checkbox
                    checked={ack}
                    onCheckedChange={(v) => setAck(v === true)}
                  />
                  <span>
                    I understand these events overlap and still want to
                    register.
                  </span>
                </label>
              )}
              {regError && (
                <p className="form-error" role="alert">
                  {regError}
                </p>
              )}
              <button
                className="primary full"
                disabled={busy || !agree || !teamReady}
              >
                {busy ? (
                  <>
                    <Loader2 className="spin" size={16} />
                    Saving registration…
                  </>
                ) : (
                  <>
                    Confirm registration <Ticket size={17} />
                  </>
                )}
              </button>
              <p className="fine-print">
                {account.demo
                  ? "Your demo registration is saved in this browser. Download your sample pass"
                  : "Your registration is saved to your account. Download your pass"}{" "}
                after confirmation; ticket emails are not sent.
              </p>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog
          open={!!ticket}
          onOpenChange={(v) => {
            if (!v) setTicket(null);
          }}
        >
          <DialogContent
            className="club-dialog ticket-dialog"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              ticketTitleRef.current?.focus({ preventScroll: true });
            }}
          >
            <DialogTitle ref={ticketTitleRef} tabIndex={-1}>
              {ticket?.status === "cancelled"
                ? "Cancelled ticket"
                : ticket?.status === "pending_payment"
                  ? "Payment awaiting verification"
                  : "Your next experience, confirmed."}
            </DialogTitle>
            <DialogDescription>
              Confirmed passes display an entry QR. Pending payments need
              organizer approval.
            </DialogDescription>
            {ticket &&
              (() => {
                const e = data.events.find((e) => e.id === ticket.eventId);
                return (
                  e && (
                    <>
                      <div className="digital-ticket">
                        <div className="ticket-top">
                          <span>
                            CLUBOS /{" "}
                            {ticket.teamName ? "TEAM PASS" : "STUDENT PASS"}
                          </span>
                          <Ticket size={26} />
                        </div>
                        <span className="event-fest">
                          {data.fests.find((f) => f.id === e.festId)?.name}
                        </span>
                        <h2>{e.title}</h2>
                        <p>
                          {dateLabel(e.start)} · {timeLabel(e.start)} BST
                        </p>
                        <p>{e.venue}</p>
                        <div className="ticket-person">
                          <strong>{ticket.teamName || ticket.name}</strong>
                          <Badge status={ticket.status} />
                        </div>
                        {ticket.teamName && (
                          <p>
                            Leader: {ticket.name}
                            <br />
                            Team:{" "}
                            {ticket.members?.map((m) => m.name).join(", ")}
                          </p>
                        )}
                        <div className="ticket-bottom">
                          {ticket.status === "confirmed" ||
                          ticket.status === "checked_in" ? (
                            <PassQR id={ticket.id} />
                          ) : (
                            <p>Entry QR unlocks after confirmation.</p>
                          )}
                          <div className="ticket-code">
                            <small>TICKET ID</small>
                            <code>{ticket.id}</code>
                            <button
                              className="copy-pass"
                              onClick={() =>
                                navigator.clipboard
                                  .writeText(ticket.id)
                                  .then(() => toast.success("Ticket ID copied"))
                                  .catch(() =>
                                    toast.error(
                                      "Copy unavailable. Download your pass instead.",
                                    ),
                                  )
                              }
                            >
                              Copy ticket ID
                            </button>
                            <p className="ticket-demo">
                              Campus pass · status verified at entry
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="ticket-actions">
                        <button
                          className="secondary"
                          disabled={
                            ticket.status !== "confirmed" &&
                            ticket.status !== "checked_in"
                          }
                          onClick={() =>
                            downloadPass(
                              ticket,
                              e,
                              data.fests.find((f) => f.id === e.festId)?.name ||
                                "ClubOS festival",
                            ).catch(() =>
                              toast.error(
                                "Pass could not be downloaded. Please try again.",
                              ),
                            )
                          }
                        >
                          <Download size={16} />
                          Download ticket
                        </button>
                        <button
                          className="primary"
                          onClick={() => calendar([e])}
                        >
                          <CalendarDays size={16} />
                          Add to calendar
                        </button>
                      </div>
                    </>
                  )
                );
              })()}
          </DialogContent>
        </Dialog>
        <AlertDialog
          open={!!cancel}
          onOpenChange={(v) => {
            if (!v) setCancel(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogTitle>Cancel this registration?</AlertDialogTitle>
            <AlertDialogDescription>
              The seat for {cancel?.name} will be released. Re-registration is
              possible only while seats remain and the deadline is open.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep registration</AlertDialogCancel>
              <AlertDialogAction
                className="danger-button"
                onClick={() => {
                  if (cancel) changeStatus(cancel, "cancelled");
                  setCancel(null);
                }}
              >
                Cancel registration
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Toaster position="bottom-right" richColors />
      </SidebarProvider>
    </CommunityProvider>
  );
}
