# ClubOS - submission entry

Prepared for the AI Web Development Contest, 9th DRMC International Tech Carnival 2026.

## Project name
ClubOS - Smart Club Operations

## Theme
Smart Club Operations

## Live deployment
https://clubos-carnival-somudro.anaim12.chatgpt.site

The directory is public. A verified Firebase account is required for registration; the separate admin page requires a server-authorized organizer UID. Console setup is documented in FIREBASE-SETUP.md.

## Public GitHub repository
https://github.com/myfavnigar-ux/clubos

## Short description
ClubOS brings student-club festivals, events, registrations, and organizer operations into one responsive platform. Students can discover festivals, filter events, reserve a seat, download a QR campus pass, and manage a personal schedule. Organizers can create and edit festivals and events, search participants, manage registration status, check in ticket holders, and export filtered participant data. Server-side checks enforce deadlines, capacity, and duplicate prevention. The catalog and registrations are shared across accounts, with private student views and protected organizer access.

## Main features
- Organization -> Festival -> Event -> Registration structure.
- Five festivals, sixteen categorized events, and twenty-four sample registrations.
- Festival/category filtering, full-text event search, open-registration filter, date/deadline sorting, and detailed venue/time/deadline/capacity information.
- Solo / Team selection at the top of every registration form, inline member search, consent-based invitations, personal tickets, and cancellation.
- Paid-event Trx ID submission and organizer payment review; one slot and fee per team.
- Student phone/profile fields, blogs, announcements, and opt-in device notifications.
- Server-enforced limits and atomic booking/capacity changes.
- Organizer dashboard, participant search/filtering, status management, and statistics.
- Festival and event creation/editing.
- Responsive interface with keyboard focus, labelled mobile navigation, and accessible dialogs.

## Creative features
- Twenty-one original AI-generated illustrations with responsive WebP versions for a cohesive, colorful visual identity.
- Downloadable SVG campus passes containing unique QR ticket identifiers.
- Server-validated check-in that rejects cancelled and already-used passes.
- Schedule overlap warnings and suggestions for available events that fit existing plans.
- Individual and full-schedule ICS calendar exports.
- Filtered CSV export with spreadsheet-formula protection.
- Verified accounts and server-enforced student/organizer permissions.
- Optional WebMCP search integration in supported browsers.

## Technology stack
React 19, TypeScript, Vinext/Vite, Cloudflare Workers, Cloudflare D1/SQLite, Firebase Authentication, jose, Drizzle migrations, Tailwind CSS, Shadcn/Radix UI, Lucide, Sonner, and node-qrcode.

## AI tools and disclosure
OpenAI Codex assisted with rulebook analysis, planning, implementation, styling, test creation, and debugging. Code, sample content, and original illustrations were generated with AI assistance. See AI-ART-PROMPTS.md for the exact image prompts. The running application does not call an AI model. Search, statistics, conflict detection, and schedule suggestions are deterministic. WebMCP is optional browser-agent integration.

## Demo access
Open the live URL for discovery. Create an account with an email you control and verify it before registering. Complete FIREBASE-SETUP.md first. For organizer evaluation, the owner must privately provide an account whose UID is authorized on the server. No public admin password is included.

## Judge walkthrough
Follow JUDGE-GUIDE.md. The student URL is the main deployment; organizer tools are at `/admin`.

## Verification
TypeScript and production build checks pass. The Firebase test harness runs the real API and JWT verification against signed test tokens, simulated Google responses and SQLite; no real Firebase users are created. The admin UID is configured. Live sign-in/email and community storage checks still require the remaining steps in LAUNCH-STATUS.md. See DELIVERY.md for scope.

## Known limitations
The 5 festivals, 16 events and 24 initial participants are illustrative contest content. Events and registrations are shared in D1. Firestore supports profiles/blogs/helpline; Realtime Database supports announcements. See LAUNCH-STATUS.md for remaining authenticated production checks. Verification/reset emails use Firebase. Paid registrations use manual organizer verification of Trx IDs; no payment gateway is integrated. Team registration requires members to accept invitations. Device push is implemented, but automatic 24-hour/1-hour reminder scheduling is not enabled. Ticket emails and a built-in camera scanner are not implemented. This is not the official DRMC enrollment system. Admin edits affect the shared catalog.

## License
MIT. Dependency and asset notices are included in THIRD-PARTY-NOTICES.md and the source package.

## Submission status
The project information is prepared. The public GitHub repository is https://github.com/myfavnigar-ux/clubos. The official Google Form address is still needed. Entrant name, institution, and any registration ID should be entered as requested by the real form. No contest entry has been submitted.
