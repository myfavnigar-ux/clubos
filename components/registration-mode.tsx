"use client";
import { useEffect, useState } from "react";
import { UserRound, Users, Search, UserPlus } from "lucide-react";
import { useAccount } from "./account";
import { useTeams } from "./teams";
import { Field } from "./club-controls";
import type { ClubEvent } from "@/lib/data";
export function RegistrationMode({
  event,
  mode,
  onChange,
  onReady,
  disabled = false,
}: {
  event: ClubEvent;
  mode: "individual" | "team";
  onChange: (mode: "individual" | "team") => void;
  onReady: (ready: boolean) => void;
  disabled?: boolean;
}) {
  const account = useAccount(),
    c = useTeams();
  const [teamId, setTeamId] = useState(""),
    [name, setName] = useState(""),
    [leader, setLeader] = useState(account.user?.displayName || ""),
    [query, setQuery] = useState(""),
    [results, setResults] = useState<{ uid: string; name: string }[]>([]),
    [searched, setSearched] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [working, setWorking] = useState(false);
  const teams = c.teams.filter(
      (t) =>
        t.leader === account.user?.uid &&
        t.event_id === event.id &&
        !t.registrationId,
    ),
    team = teams.find((t) => t.id === teamId),
    count = team?.members.filter((m) => m.status === "accepted").length || 0;
  const ready =
    mode === "individual" ||
    (!!team && count >= (event.teamMin || 2) && count <= (event.teamMax || 4));
  useEffect(() => onReady(ready && !working), [ready, working, onReady]);
  async function run(fn: () => Promise<void>) {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  async function search() {
    await run(async () => {
      if (query.trim().length < 2)
        throw new Error("Enter at least two letters of your teammate’s name.");
      const d = await c.act({ action: "searchUsers", query: query.trim() });
      setResults(d.users);
      setSearched(true);
    });
  }
  async function invite(uid: string, memberName: string) {
    await run(async () => {
      let id = teamId;
      if (!team) {
        if (name.trim().length < 2 || leader.trim().length < 2)
          throw new Error(
            "Enter a team name and leader name before sending an invitation.",
          );
        const d = await c.act({
          action: "createTeam",
          eventId: event.id,
          name: name.trim(),
          leaderName: leader.trim(),
        });
        id = d.teamId;
        setTeamId(id);
      }
      await c.act({ action: "invite", teamId: id, uid });
      setNotice(
        `Invitation sent to ${memberName}. They must accept before joining your registration.`,
      );
    });
  }
  const locked = working || disabled;
  return (
    <section className="registration-mode" aria-label="Registration type">
      <p className="eyebrow">HOW WILL YOU JOIN?</p>
      <div
        className="registration-mode-toggle"
        role="group"
        aria-label="Solo or team registration"
      >
        <button
          type="button"
          aria-pressed={mode === "individual"}
          disabled={locked}
          onClick={() => {
            onChange("individual");
            setError("");
            setNotice("");
          }}
        >
          <UserRound size={21} />
          <span>
            <strong>Solo</strong>
            <small>Register just yourself</small>
          </span>
        </button>
        <button
          type="button"
          aria-pressed={mode === "team"}
          disabled={locked}
          onClick={() => {
            onChange("team");
            setError("");
            setNotice("");
          }}
        >
          <Users size={21} />
          <span>
            <strong>Team</strong>
            <small>Find & invite members</small>
          </span>
        </button>
      </div>
      <input type="hidden" name="participation" value={mode} />
      {mode === "team" && (
        <div className="inline-team-panel">
          <input type="hidden" name="teamId" value={team?.id || ""} />
          {teams.length > 0 && (
            <label className="field">
              <span>Your team for this event</span>
              <select
                value={team?.id || ""}
                disabled={locked}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setError("");
                  setNotice("");
                }}
              >
                <option value="">Start a new team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!team ? (
            <div className="form-grid">
              <Field
                label="Team name"
                value={name}
                maxLength={60}
                disabled={locked}
                onChange={(e) => setName(e.target.value)}
                placeholder="Give your team a name"
              />
              <Field
                label="Group leader"
                value={leader}
                maxLength={80}
                disabled={locked}
                onChange={(e) => setLeader(e.target.value)}
                placeholder="Your full name"
              />
            </div>
          ) : (
            <div className="inline-team-heading">
              <strong>{team.name}</strong>
              <span>
                Leader: {team.members.find((m) => m.uid === team.leader)?.name}
              </span>
            </div>
          )}
          <div className="inline-team-search">
            <Field
              label="Search member name"
              type="search"
              value={query}
              maxLength={60}
              disabled={locked}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearched(false);
                setResults([]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!locked) void search();
                }
              }}
              placeholder="Type a student’s name"
            />
            <button
              type="button"
              className="secondary"
              disabled={locked || query.trim().length < 2}
              onClick={() => void search()}
            >
              <Search size={16} />
              Search
            </button>
          </div>
          {searched && !results.length && (
            <p className="fine-print">
              No matches. Ask your teammate to save their name and enable
              discovery in My teams.
            </p>
          )}
          <div className="team-results">
            {results.map((m) => {
              const member = team?.members.find((x) => x.uid === m.uid);
              return (
                <div key={m.uid}>
                  <span>
                    <strong>{m.name}</strong>
                    <small>Member …{m.uid.slice(-8)}</small>
                  </span>
                  <button
                    type="button"
                    className="secondary"
                    disabled={locked || !!member}
                    onClick={() => void invite(m.uid, m.name)}
                  >
                    <UserPlus size={15} />
                    {member
                      ? member.status === "accepted"
                        ? "Accepted"
                        : member.status === "declined"
                          ? "Declined"
                          : "Request sent"
                      : "Send request"}
                  </button>
                </div>
              );
            })}
          </div>
          {team && (
            <>
              <ul className="member-list">
                {team.members.map((m) => (
                  <li key={m.uid}>
                    <span>
                      {m.name}
                      {m.uid === team.leader ? " · leader" : ""}
                    </span>
                    <span className={`status ${m.status}`}>{m.status}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="text-link"
                disabled={locked}
                onClick={() =>
                  void run(async () => {
                    await c.act({ action: "teams" });
                    setNotice("Member responses refreshed.");
                  })
                }
              >
                Refresh member responses
              </button>
            </>
          )}
          <p className="fine-print">
            {count} accepted · {event.teamMin || 2}–{event.teamMax || 4} members
            required, including the leader. Only accepted members are
            registered. One slot and one fee cover the team.
          </p>
          {!ready && (
            <p className="team-waiting" role="status">
              Send invitations and wait for enough teammates to accept before
              submitting.
            </p>
          )}
          <p className="fine-print">
            Switching to Solo keeps sent invitations, but submits only your own
            registration.
          </p>
          {c.error && (
            <p className="form-error" role="alert">
              {c.error}
            </p>
          )}
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="account-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
