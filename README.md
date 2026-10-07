# ClubOS

**Make your next move.** A student-club operations platform built for the Smart Club Operations theme at the 9th DRMC International Tech Carnival 2026 AI Web Development Contest.

## Project description

ClubOS follows **Organization → Festival → Event → Registration**. Students discover festivals, explore events, register individually or with accepted teammates, and manage a personal schedule. Organizers create and edit festivals and events, manage participants, and check in ticket holders.

This submission is a shared, database-backed club application with **Firebase Authentication** and server-enforced organizer permissions. It is not the official DRMC registration system. Festival/event content and the 24 seeded participants are fictional demonstration data. Real student accounts can register after email verification. Complete [Firebase setup](docs/FIREBASE-SETUP.md) before evaluating authenticated flows.

## Features

- Sixteen distinct event-specific covers and five different festival banners. No artwork is shared by different sample events. Responsive WebP sizes and lazy loading keep the colorful directory lightweight.

- Five preloaded festivals, sixteen categorized events, and twenty-four sample registrations.
- Search event titles, descriptions, categories, and venues; festival/category filters, open-seat filtering, and date/deadline sorting.
- Event detail URLs, dates, venues, registration deadlines, capacity, and availability.
- Validated registration forms; free entries confirm immediately, paid entries require organizer Trx ID verification.
- Solo/Team selector at the top of every registration form, with inline teammate search, invitation sending and accepted-member status.
- Phone number at signup, opt-in teammate directory, collaboration invitations, group leaders/names, and shared team registration history.
- Admin-managed BDT fees/payment numbers, preserved payment snapshots and pending-payment slot reservations.
- Device push opt-in, service worker, invitation alerts and calendar alarms. Automatic 24-hour/1-hour reminders have an authenticated writer but await scheduler connection; see [setup and limits](docs/TEAMS-PAYMENTS-NOTIFICATIONS.md).
- Server-enforced deadlines, capacity and normalized-email duplicate prevention.
- Atomic final-seat booking: concurrent requests cannot overbook an event.
- My registrations, cancellation, ticket downloads, and persistent state after refresh.
- Dedicated `/admin` organizer URL, separate from student navigation, with participant search, event/status filters, and status management.
- Shared catalog across accounts, private student registration lists, and a server-side organizer UID allowlist.
- Event management: thumbnails, titles, festivals, categories, times, venue, capacity, eligibility, requirements, rules, format and registration pause controls.
- Student profiles and full registration history; organizer student directory and registration detail dialogs.
- Ten editable sample blog posts, draft/publish controls, announcement bell, and editable helpline contacts.
- Firestore owner/admin profile permissions and admin-only publishing rules. Placeholder phone numbers never initiate a call.
- Registration chart, capacity watch, and check-in totals based on stored records.
- Responsive layouts, accessible dialog/select/tab primitives, keyboard focus, and reduced-motion support.

### Performance

Firebase Authentication loads after the initial page render. Admin tools and the QR encoder load on demand. Counts are aggregated on the server without exposing attendee details, and date/time formatters are reused. Images have responsive WebP variants. See [verification details](docs/DELIVERY.md).

The [rulebook coverage map](docs/RULEBOOK-COVERAGE.md) links each judging section to the implemented workflow and separates completed work from pending submission steps.

### Creative extras

- **Personal schedule and conflict detection:** overlapping registrations require explicit acknowledgement; conflicts remain visible in the schedule.
- **Fits your schedule:** deterministic suggestions exclude full, closed, registered, and overlapping events.
- **Portable calendar:** export one event or a complete schedule as an ICS file.
- **QR campus pass:** a styled, printable SVG download with a scannable unique ticket ID, with text fitted to the layout.
- **At-the-door check-in:** paste a scanned QR payload or full ticket ID to mark attendance; server checks reject cancelled and already-used passes.
- **Useful data export:** filtered participant CSV with spreadsheet-formula injection protection.
- **Account-based access:** registrations follow a Firebase account across devices; only approved organizers can manage all participants.
- Progressive-enhancement WebMCP search tool when the browser supports it.

## Tech stack

React 19, TypeScript, Vinext / Vite, Cloudflare Workers, Cloudflare D1 (SQLite), Firebase Authentication, Firestore, Realtime Database, jose JWT verification, Drizzle schema migrations, Tailwind CSS, Shadcn/Radix UI, Lucide icons, Sonner notifications, node-qrcode.

## Setup instructions

Requirements: Node.js 24 (for the SQLite test harness), npm, Git, and the configured Firebase project. Follow [the console guide](docs/FIREBASE-SETUP.md) to enable Email/Password, authorize the domain, verify an account and authorize the organizer UID. D1 is authoritative for festivals, events, registrations and seat counts. Firestore stores student profiles, blogs and helpline contacts; Realtime Database stores announcements and notification read state.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_normal_chamber.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_exotic_firestar.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_small_typhoid_mary.sql
npm run dev
```

Open the exact local address printed by the server (normally `http://127.0.0.1:5173`). Apply each migration only once to a given local database. The shared catalog and sample registrations are inserted idempotently on the first visit, outside migrations. Old browser-isolated demo records are retained in the database but are not reassigned to accounts or served by the new API. Nothing is seeded into production at build time.

To preview the compiled Worker, use `npm start` after building and applying migrations. This shares the local D1 state with development.

### Verification

```sh
node node_modules/typescript/bin/tsc --noEmit
node scripts/test-firebase.mjs
node scripts/test-account-request.mjs
node scripts/test-community.mjs
node scripts/test-push.mjs
npm run build
```

The current test harness exercises the real API and JWT verifier with signed RSA fixtures, an in-memory SQLite database, and simulated Google public-key/account responses. It covers authentication, disabled/revoked accounts, organizer permissions, private registration reads, ownership, forged email rejection, deadlines, capacity, duplicate registration, conflicts, check-in and simultaneous final-seat requests. It creates no users in the real Firebase project. Real email delivery and end-to-end production sign-in remain dependent on the owner's Console setup.

## Source repository

https://github.com/myfavnigar-ux/clubos

## Deployment URL

**Live demo:** [Open ClubOS](https://clubos-carnival-somudro.anaim12.chatgpt.site). The directory is public. Registration requires a verified account; `/admin` requires an approved organizer account. See [the judge walkthrough](docs/JUDGE-GUIDE.md) for a guided tour.

Sites manages the Worker, persistent D1 binding, schema migrations, and source-backed deployments. `.openai/hosting.json` declares the logical `DB` binding. Do not commit real Cloudflare account credentials, API tokens, or private runtime state.

## Demo credentials

The authorized admin signs in directly with email/password, without an app email-verification gate; students must verify before registration. There are no public admin credentials. Sign up with an email you control, verify it, and register for an event. The site owner must authorize a Firebase UID in the server environment variable `CLUBOS_ADMIN_UIDS` before that account can use the separate [organizer console](https://clubos-carnival-somudro.anaim12.chatgpt.site/admin). See [Firebase setup](docs/FIREBASE-SETUP.md). Provide judges a dedicated organizer account privately if required; never publish its password in this repository.

Twenty-four `@example.test` participants are preloaded for statistics and check-in examples. They do not belong to any real account. Design Beyond Screens is initially full and Campus Gaming Cup has an expired deadline. To demonstrate conflicts, register for AI Web Development and then Code Sprint using your own verified account.

The server verifies Firebase token signatures, audience, issuer, expiry, authentication time and current account state. It uses the verified UID for ownership and the server allowlist for admin permissions. Public responses expose seat counts, not participant details. Student responses include only their own individual/team registrations; teammates cannot read the leader’s payment transaction ID. The registration email always comes from Firebase rather than the request body.

## Third-party services and APIs

- OpenAI Sites: application hosting and deployment workflow.
- Cloudflare Workers and D1: server runtime and durable database.
- Firebase Authentication: sign-in, signup, verification and password reset emails; Google public keys and account lookup for API authentication. No ticket email, payment gateway, analytics or generative-AI API is used at runtime. Trx IDs are manually verified by organizers.
- System fonts, Lucide interface icons, and locally hosted responsive WebP illustrations avoid external asset requests.
- Browser Web Push services: encrypted device notifications using a server-secret VAPID key; Sites MCP provides the bounded background reminder writer. Automatic scheduling still requires a connected task.
- Dependencies and their license metadata are listed in `THIRD-PARTY-NOTICES.md` and the lockfile.

## AI tools and features used

OpenAI Codex assisted with rulebook analysis, product planning, source generation, styling, test implementation, and debugging. AI-generated code and sample content are disclosed here. Twenty-one original clay-style illustrations were created with OpenAI’s built-in image generation tool for five festivals, sixteen events, and schedule views. They are illustrative artwork, not photographs of real campus events. The complete prompt set and asset locations are recorded in [AI art prompts](docs/AI-ART-PROMPTS.md). The app does not call an AI model; its search, statistics, and schedule conflict detection are deterministic. WebMCP exposes directory search to supported browser agents and is not an embedded AI assistant.

## Screenshots

### Festival and event directory

![Desktop directory](docs/screenshots/discover-desktop.png)

### Protected organizer sign-in

![Organizer sign-in](docs/screenshots/firebase-admin.png)

The following ticket/schedule screenshots illustrate the previous evaluation data; the layouts remain available after signing in and registering.

### Digital ticket

![Ticket confirmation](docs/screenshots/ticket-desktop.png)

### Mobile schedule

![Mobile schedule](docs/screenshots/schedule-mobile.png)

## Known limitations

- Email/Password and the production domain are configured. The owner supplied the admin UID, which is set in the server environment. Database rule publication and real account walkthrough status are tracked in docs/LAUNCH-STATUS.md.
- Event and registration data stays in D1. Profiles, blogs and support use Firestore; announcements use Realtime Database. No Firebase Storage, Functions or Analytics is initialized. Images are edited using HTTPS URLs or bundled illustration paths.
- No ticket-confirmation email, payment processing, integrated QR camera scanning, or team registration. Verification and reset emails are handled by Firebase. Use an external QR reader for check-in.
- Events and passes demonstrate a club platform; they are not official admission to DRMC events. Seed event dates run October 2026–March 2027; organizers can update them.
- Shared organizer edits affect all visitors. The old isolated demo workspaces remain inaccessible to new accounts; no personal history is guessed or transferred.
- The event catalog and counts refresh on window focus and every 15 seconds while visible. Community content uses Firebase subscriptions after database setup.
- Larger public rollouts should add workload-specific abuse limits, monitoring, backups and data-retention policies. The application currently relies on Firebase's authentication limits and server booking checks.
- GitHub publication and the official contest form remain separate pending steps; see [submission entry](docs/SUBMISSION.md). A contest score cannot be guaranteed.

## License

MIT. See [LICENSE](LICENSE). Third-party components retain their respective licenses and notices.


