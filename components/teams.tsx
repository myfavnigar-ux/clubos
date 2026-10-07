"use client";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Users, UserPlus, Check, X } from "lucide-react";
import { useAccount, AccountPanel } from "./account";
import { accountRequest, AccountChangedError } from "@/lib/account-request";
import { Field } from "./club-controls";
import type { ClubEvent } from "@/lib/data";
type Member = { uid: string; name: string; status: string };
type Team = {
  id: string;
  name: string;
  event_id: string;
  leader: string;
  registrationId?: string;
  members: Member[];
};
type TeamContext = {
  directory: { name: string; searchable: number } | null;
  teams: Team[];
  error: string;
  busy: boolean;
  act: (body: Record<string, unknown>) => Promise<any>;
};
const Context = createContext<TeamContext>({
  directory: null,
  teams: [],
  error: "",
  busy: false,
  act: async () => ({}),
});
export const useTeams = () => useContext(Context);
export function TeamProvider({ children }: { children: ReactNode }) {
  const account = useAccount();
  const [directory, setDirectory] = useState<{
    name: string;
    searchable: number;
  } | null>(null);
  const [teams, setTeams] = useState<Team[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const act = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      try {
        const { response, data } = await accountRequest<any>(account, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(data.error);
        if (data.teams) setTeams(data.teams);
        if ("directory" in data) setDirectory(data.directory);
        setError("");
        return data;
      } finally {
        setBusy(false);
      }
    },
    [account.headers, account.currentUid],
  );
  useEffect(() => {
    setTeams([]);
    setDirectory(null);
    setError("");
    if (!account.user?.emailVerified) return;
    let alive = true;
    const refresh = () => {
      if (document.hidden) return;
      act({ action: "teams" }).catch((e) => {
        if (alive && !(e instanceof AccountChangedError)) setError(e.message);
      });
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [account.user?.uid, account.user?.emailVerified, act]);
  return (
    <Context.Provider value={{ teams, directory, error, busy, act }}>
      {children}
    </Context.Provider>
  );
}
export function InvitationInbox() {
  const account = useAccount(),
    c = useTeams();
  const [error, setError] = useState("");
  const invites = c.teams.filter(
    (t) =>
      !t.registrationId &&
      t.members.some(
        (m) => m.uid === account.user?.uid && m.status === "invited",
      ),
  );
  return (
    <>
      {invites.map((t) => (
        <article className="invite-card" key={t.id}>
          <span className="eyebrow">COLLABORATION INVITATION</span>
          <h3>{t.name}</h3>
          <p>
            {t.members.find((m) => m.uid === t.leader)?.name || "A student"}{" "}
            wants to collaborate with you. Are you interested?
          </p>
          <p className="fine-print">
            Accepting lets this leader register you for this team’s event. You
            can withdraw before submission.
          </p>
          <div className="team-actions">
            {["accepted", "declined"].map((status) => (
              <button
                key={status}
                disabled={c.busy}
                className={status === "accepted" ? "primary" : "secondary"}
                onClick={() =>
                  c
                    .act({ action: "respondInvite", teamId: t.id, status })
                    .catch((e) => setError(e.message))
                }
              >
                {status === "accepted" ? <Check size={16} /> : <X size={16} />}{" "}
                {status === "accepted" ? "Accept collaboration" : "Decline"}
              </button>
            ))}
          </div>
        </article>
      ))}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </>
  );
}
export function TeamSelector({ event }: { event: ClubEvent }) {
  const c = useTeams(),
    a = useAccount();
  const options = c.teams.filter(
    (t) =>
      t.event_id === event.id && t.leader === a.user?.uid && !t.registrationId,
  );
  return (
    <div className="feature-panel">
      <label className="field">
        <span>Your group</span>
        <select name="teamId" required defaultValue="">
          <option value="" disabled>
            Select a group you lead
          </option>
          {options.map((t) => (
            <option value={t.id} key={t.id}>
              {t.name} ·{" "}
              {t.members.filter((m) => m.status === "accepted").length} accepted
            </option>
          ))}
        </select>
      </label>
      <p className="fine-print">
        {event.teamMin || 2}–{event.teamMax || 4} accepted members, including
        you. Invited or declined members are excluded. One slot and one payment
        cover the whole team.
      </p>
      <a href="#teams" className="text-link">
        Create or manage groups in My teams
      </a>
    </div>
  );
}
export function TeamsPage({
  events,
  go,
}: {
  events: ClubEvent[];
  go: (r: string) => void;
}) {
  const account = useAccount(),
    c = useTeams();
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [results, setResults] = useState<Member[]>([]),
    [selected, setSelected] = useState("");
  useEffect(() => {
    setResults([]);
    setSelected("");
    setError("");
    setNotice("");
  }, [account.user?.uid]);
  async function run(body: Record<string, unknown>) {
    setError("");
    setNotice("");
    try {
      return await c.act(body);
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }
  if (!account.user?.emailVerified) return <AccountPanel />;
  const own = c.teams.filter((t) => t.leader === account.user?.uid),
    eligible = events.filter(
      (e) => !e.paused && Date.parse(e.deadline) > Date.now(),
    );
  return (
    <section className="teams-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">BUILD WITH YOUR PEOPLE</p>
          <h1>Better, together.</h1>
          <p>Find teammates. Share an idea. Enter as one team.</p>
        </div>
        <Users size={40} />
      </div>
      {(error || c.error) && (
        <p role="alert" className="form-error">
          {error || c.error}
        </p>
      )}
      {notice && (
        <p role="status" className="account-notice">
          {notice}
        </p>
      )}
      <InvitationInbox />
      <div className="team-workbench">
        <form
          className="feature-panel"
          key={`directory-${c.directory?.name}-${c.directory?.searchable}`}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              await run({
                action: "directory",
                name: f.get("name"),
                searchable: f.get("searchable") === "on",
              })
            )
              setNotice("Your teammate directory preference is saved.");
          }}
        >
          <span className="step-chip">01 · YOUR IDENTITY</span>
          <h2>Let your team find you</h2>
          <Field
            label="Public teammate name"
            name="name"
            defaultValue={c.directory?.name || account.user.displayName || ""}
            minLength={2}
            maxLength={80}
            required
          />
          <label className="check-field">
            <input
              name="searchable"
              type="checkbox"
              defaultChecked={c.directory ? !!c.directory.searchable : true}
            />
            Let signed-in students find me by this name
          </label>
          <p className="fine-print">
            Only your name and member ID appear in search. Phone and email stay
            private. Save here before creating your first team.
          </p>
          <button className="secondary" disabled={c.busy}>
            Save directory preference
          </button>
        </form>
        <form
          className="feature-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const d = await run({
              action: "createTeam",
              name: f.get("name"),
              eventId: f.get("eventId"),
            });
            if (d) {
              setSelected(d.teamId);
              setNotice("Group created. Invite your teammates below.");
            }
          }}
        >
          <span className="step-chip">02 · START SOMETHING</span>
          <h2>Create your group</h2>
          <Field
            label="Group name"
            name="name"
            minLength={2}
            maxLength={60}
            required
          />
          <label className="field">
            <span>Team contest</span>
            <select name="eventId" required defaultValue="">
              <option value="" disabled>
                Choose an event
              </option>
              {eligible.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Group leader"
            value={account.user.displayName || account.user.email || "You"}
            readOnly
          />
          <button disabled={c.busy || !eligible.length} className="primary">
            <UserPlus size={17} /> Create group
          </button>
          {!eligible.length && (
            <p className="fine-print">
              No events are open for registration yet.
            </p>
          )}
        </form>
      </div>
      {own.some((t) => !t.registrationId) && (
        <form
          className="feature-panel team-search"
          onSubmit={async (e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get("query");
            const d = await run({ action: "searchUsers", query: q });
            if (d) {
              setResults(d.users);
              if (!d.users.length)
                setNotice(
                  "No matching students. Ask your teammate to join the directory in My teams.",
                );
            }
          }}
        >
          <span className="step-chip">03 · FIND YOUR PEOPLE</span>
          <h2>Invite a collaborator</h2>
          <label className="field">
            <span>Invite to group</span>
            <select
              value={selected}
              required
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="" disabled>
                Select your group
              </option>
              {own
                .filter((t) => !t.registrationId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="search-line">
            <Field
              label="Search student name"
              name="query"
              type="search"
              minLength={2}
              maxLength={60}
              required
              placeholder="At least two letters"
            />
            <button className="secondary" disabled={c.busy}>
              Search
            </button>
          </div>
          <div className="team-results">
            {results.map((m) => (
              <div key={m.uid}>
                <span>
                  <strong>{m.name}</strong>
                  <small>Member …{m.uid.slice(-8)}</small>
                </span>
                <button
                  type="button"
                  disabled={c.busy || !selected}
                  className="primary"
                  onClick={async () => {
                    if (
                      await run({
                        action: "invite",
                        teamId: selected,
                        uid: m.uid,
                      })
                    )
                      setNotice(`Invitation sent to ${m.name}.`);
                  }}
                >
                  Invite
                </button>
              </div>
            ))}
          </div>
        </form>
      )}
      <h2>Your groups</h2>
      <div className="team-grid">
        {c.teams.map((t) => (
          <article className="feature-panel" key={t.id}>
            <span className="eyebrow">
              {events.find((e) => e.id === t.event_id)?.title || "Team contest"}
            </span>
            <h3>{t.name}</h3>
            <p>Leader: {t.members.find((m) => m.uid === t.leader)?.name}</p>
            <ul className="member-list">
              {t.members.map((m) => (
                <li key={m.uid}>
                  <span>
                    {m.name}
                    {m.uid === account.user?.uid ? " (you)" : ""}
                  </span>
                  <span className={`status ${m.status}`}>
                    {m.status}
                    {t.registrationId && m.status !== "accepted"
                      ? " · excluded"
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
            {t.registrationId ? (
              <button className="secondary" onClick={() => go("registrations")}>
                View team registration
              </button>
            ) : t.leader === account.user?.uid ? (
              <button
                className="primary"
                onClick={() => go("event/" + t.event_id)}
              >
                Register accepted members
              </button>
            ) : t.members.some(
                (m) => m.uid === account.user?.uid && m.status === "accepted",
              ) ? (
              <button
                className="text-danger"
                disabled={c.busy}
                onClick={() =>
                  run({
                    action: "respondInvite",
                    teamId: t.id,
                    status: "declined",
                  })
                }
              >
                Withdraw before registration
              </button>
            ) : null}
          </article>
        ))}
      </div>
      {!c.teams.length && (
        <p className="community-empty">
          Your groups and collaboration invitations will appear here.
        </p>
      )}
    </section>
  );
}
