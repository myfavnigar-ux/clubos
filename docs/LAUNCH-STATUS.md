# ClubOS launch status

Updated October 8, 2026. Site: https://clubos-carnival-somudro.anaim12.chatgpt.site; organizer page: `/admin`.

## Implemented and locally verified

- Firebase student accounts, verification/reset flows, server JWT/account checks, shared catalog, private registrations, atomic seat limits and check-in.
- Student profiles and registration history, admin registration inspector and student directory.
- Expanded Event management including thumbnails, schedule, category/festival, rules and pause controls.
- Ten authored sample blog posts; admin draft/publish, announcements editor and header bell, editable helpline with disabled placeholder numbers.
- Firestore and Realtime Database clients and restrictive rules files. Community seeds are inserted once on authorized admin access.
- Every registration form starts with Solo / Team selection. Team mode supports inline member search and invitations; Solo keeps individual registration fields and excludes team membership.
- 112 signed-token API checks, 4 account-session checks and community URL/phone/article checks pass. Google authentication responses are simulated in the API tests.

## Firebase Console state

- Email/Password is enabled and the production domain is authorized.
- Owner supplied UID `LBRaxtFe2kg6tbke5adJqgLxKzZ2`; Sites server environment revision 3 authorizes this UID and `EX6FflXRiWYJeERH0ziyBFM4Ss63`, and preserves Web Push runtime credentials. Revision 3 is deployed. Authorized admins do not need an additional app email-verification step.
- Firestore Standard `(default)` database was created in `asia-southeast1`, initially locked. Restricted rules were published successfully after owner confirmation; the Console shows the new active rules revision.
- Realtime Database is now confirmed provisioned in Singapore. Its exact Console URL, `https://clubosdrmc-default-rtdb.asia-southeast1.firebasedatabase.app`, is configured in the application. The supplied restricted rules have been published: announcements are public to read and writable only by the approved admin; notification read state is private to each account. The earlier Console provisioning errors no longer describe the current state.

## Still required for full community operation

1. Firestore rules are published. Sign in with the approved account to verify profile/blog writes.
2. Realtime Database provisioning, URL configuration and rules publication are complete. An authenticated announcement write/read walkthrough remains pending owner sign-in.
3. Sign in with the approved admin account to initialize the 10 editable blog documents and 2 placeholder contacts. Their bundled public fallback exists, but fallback articles are not proof of a successful Firestore write.
4. Verify a real student email, profile save, registration and organizer check-in; create/read an announcement on a second browser. This requires actual account sign-in; no password was requested or fabricated.

Events and 24 initial sample participants are fictional demonstration content. D1 remains authoritative for slots and registration details; these records are visible through the protected app API, not duplicated in Firebase.

See [Bengali setup instructions](FIREBASE-SETUP.md). Public source repository: https://github.com/myfavnigar-ux/clubos. Official contest form submission remains pending.


## Team / payment / notification release

Phone-at-signup, opt-in teammate search, invitation consent, team bookings, paid registrations, admin fee/payment controls and device push delivery are implemented. Server tests cover those flows. Web Push uses a secret VAPID key. **Automatic contest reminder scheduling is not enabled:** its authenticated MCP writer is published, but needs a connected unattended task. No physical-device delivery or real payment verification has been claimed. See [feature setup](TEAMS-PAYMENTS-NOTIFICATIONS.md).

## Current polish and explicit limits

- Shareable festival detail routes, festival breadcrumbs, filtered event counts and page-link copying.
- Clear paused/full/deadline slot labels, including one slot per solo/team entry.
- Organizer payment review queue, verified fee totals from booking snapshots, team/member/Trx search and expanded CSV.
- Custom OTP and registration-confirmation emails were cancelled; their unfinished code was removed. No Firebase billing upgrade or email relay was activated for this work. Existing Auth verification/reset links remain.
- The second organizer UID has server access. Matching Firestore/Realtime Database rule changes are prepared in the repository but not published; those live rules still authorize the original UID only. Browser publication awaits the requested action-time confirmation.
- Judges still need a privately supplied organizer test account, and the official contest form still needs its actual URL and entrant details.
