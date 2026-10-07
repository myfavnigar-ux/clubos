# Rulebook coverage

Reviewed against the supplied **AI Web Development Contest — Rulebook**, theme **Smart Club Operations**. The sample hierarchy and event names in the PDF are examples; this project preserves its existing demonstration event names.

| Judging section | Available workflow | Validation |
| --- | --- | --- |
| Fest directory, 30 points | Five upcoming festivals; useful event cards; title/description/venue search; festival and category filters; detail pages with date, time, deadline and capacity; responsive layouts | Browser discovery/detail/filter checks and mobile review |
| Registration, 30 points | Working validated form; confirmation and QR ticket; server-enforced capacity and deadlines; personal registrations and cancellation | API integration suite, registration and ticket walkthrough |
| Organizer management, 30 points | Admin dashboard; participant list, search and filters; status changes; attendance, statistics and CSV export; festival/event editors | API suite and organizer walkthrough |
| Creative additions, up to 30 points | Schedule conflicts and suggestions; calendar export; downloadable QR pass and validated check-in; original event-specific illustrations | Schedule, pass and check-in checks |

These are coverage notes, not awarded scores. Creative marks and the final result are decided by the judges.

## Submission requirements

- Working public deployment: included in README.
- Sufficient initial data: 5 festivals, 16 events and 24 sample registrations.
- MIT license, setup instructions, AI disclosure, third-party notices, screenshots and known limitations: included in the source package.
- Public GitHub repository: **pending account/repository access**.
- Official Google Form: **pending the official URL and entrant details**. The PDF does not include a form URL. No contest submission has been made.
- Deadline stated in the PDF: October 9 at 11:59 PM. The document does not specify a timezone or the later evaluation date.
- The backend is database-backed and must remain deployed through evaluation.

## Demonstration scope

Firebase accounts identify students; a server UID allowlist authorizes organizers. Shared D1 storage powers registration and the catalog. The supplied organizer UID is configured. Profiles, blogs and announcements additionally require the remaining database setup documented in LAUNCH-STATUS.md. See FIREBASE-SETUP.md. The sample events and illustrations do not represent official DRMC event registrations or photographs.
