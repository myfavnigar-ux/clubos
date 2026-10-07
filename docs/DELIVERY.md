# Current release — October 8, 2026

Profiles/history, expanded event management, 10 sample blogs, announcements, helpline, Solo/Team form selection, inline invitations, paid registration review and device push are implemented. See LAUNCH-STATUS.md for verification scope and remaining live-account checks. 112 API checks, 4 session checks, community content checks, Web Push/MCP checks, TypeScript and the production build pass. The supplied admin UID is configured; approved admins sign in directly. Automatic contest reminder scheduling remains disabled pending a connected unattended task. All entries below are historical and may describe superseded behavior; LAUNCH-STATUS.md and README.md describe the current app.

## Earlier Firebase release (superseded setup notes)

- Firebase web project: `clubosdrmc`. Email/password sign-in, signup, email verification, password reset and sign-out UI added.
- Shared D1 catalog and registration records replace per-browser isolation. Seed participant records are examples; student accounts see only their own records.
- Server JWT verification and current Firebase account lookup, verified email requirement, server UID allowlist for organizer actions, account-bound email/ownership, public aggregate-only responses.
- `/admin` shows a sign-in/access gate until the visitor is verified and authorized. No first-user admin bootstrap and no public default password.
- `0001_exotic_firestar.sql` adds indexed registration ownership without deleting old workspaces.
- TypeScript/build and the signed-token API harness pass. Browser QA checks login/reset/signup navigation, protected admin UI, public directory and mobile layout.
- Automated auth tests use simulated Google responses and real RSA-signed fixtures, not a live Firebase account. **Live login/email/admin verification remains pending owner Console setup and UID.**
- Setup instructions: [FIREBASE-SETUP.md](FIREBASE-SETUP.md). No Firestore, Firebase Storage, Cloud Functions or Analytics setup is needed.

## Historical releases (superseded authentication model)

The entries below describe previous demo releases. Their no-login/per-browser claims do not apply to this Firebase release.

# Delivery and verification

## Hosting and submission

- Project: ClubOS — Smart Club Operations.
- Configured hosting address: https://clubos-carnival-somudro.anaim12.chatgpt.site
- Audience: public since October 5, 2026. Anyone with the live URL can visit. Each browser receives an isolated demo workspace.
- A public GitHub repository has not been created. The complete source package is ready to publish under the entrant’s account.
- No contest form has been submitted.

## Verification performed

- TypeScript check passed.
- 32 API integration checks passed against a local Cloudflare D1-backed server.
- Concurrent final-seat booking returned one success and one conflict. Capacity edit versus registration races also preserved the limit.
- Cancelled, repeated, and cross-workspace check-ins were rejected by the server.
- Browser checks passed: directory search, detail view, registration, ticket confirmation, refresh persistence, cancellation, participant filtering, CSV download, event creation, mobile conflict acknowledgement, and personal schedule.
- Desktop and 390px mobile views checked for horizontal overflow; none found in tested views.
- Zero browser page errors during the original end-to-end test and the updated QR/schedule/filter walkthrough.
- Downloaded SVG pass was rendered and decoded independently; its QR payload matched the ticket ID.
- Updated mobile category filters, labelled navigation, keyboard route focus, and conflict-free schedule suggestions were checked.
- Screenshot inspection performed for directory, organizer dashboard, mobile schedule, and ticket confirmation.
- Native WebMCP search was invoked successfully in the local browser and visibly filtered the directory. It remains progressive enhancement.

## Demo model

Each browser owns a durable database workspace identified by an HttpOnly cookie. All sample records and writes are scoped to that workspace. Organizer controls intentionally administer only that sandbox. This permits a complete judging walkthrough without exposing other visitors’ data. It is not production account authentication.

See README for setup, limitations, license, dependencies, and AI disclosure. See JUDGE-GUIDE for the demonstration route and final submission checklist.

## October 6 performance and usability update

- The admin panel and QR encoder load on demand. The initial discovery JavaScript dependency set decreased from 666,096 to 587,733 bytes uncompressed, and from 198,949 to 179,737 bytes using gzip (9.7% less). These are build-artifact measurements, not a claim about connection-dependent page-load time.
- Registration counts are indexed once per data update; the chart maximum is computed once per render. Date and time formatters are reused.
- Search is visible in the page heading. Event descriptions, open-registration filtering, and event-date/deadline sorting improve discovery.
- Admin panel is a primary navigation item, with saved-data refresh, festival/event editors, participants, CSV, and attendance controls.
- The extracted admin UI was exercised through participant filtering, check-in, festival creation, and event editing. The downloaded pass was independently decoded after making the QR encoder lazy.
- The production build contains separate dynamic admin/QR chunks. Local Worker request logs confirm they were requested only after opening their respective tools.

## October 7 illustration update

- Six original AI-generated clay illustrations now appear across the featured festival, eight event cards, event details, sidebar and schedule recommendations. Exact prompts are in AI-ART-PROMPTS.md.
- Twelve responsive WebP variants (480px and 960px) total 245,722 bytes. Below-the-fold artwork is lazy-loaded; dimensions reserve its layout space. No image API runs when visitors use the site.
- Production build and TypeScript checks passed; all 32 API regression checks passed again.
- Browser verification: all ten directory image instances loaded, event search/detail navigation and QR ticket rendering worked, admin navigation loaded, and desktop/mobile layouts had no horizontal overflow. Mobile search remained visible in the first viewport. No browser console errors were observed in the tested paths.
- The discovery JavaScript dependency set is 587,323 bytes raw / 179,506 bytes gzip (9.8% smaller in gzip than version 2). This does not include CSS or image bytes and does not claim a measured page-load-time improvement.
- Public GitHub upload and official Google Form submission still require GitHub access and the official form URL.

## October 7 event-specific artwork update (V5)

- Preserved all event names. Replaced category-level image reuse with eight distinct event covers, each matched to its event. All three festivals now have separate banners. The sidebar no longer repeats the robotics cover.
- Seven new original images join four retained images: eleven active artworks, twenty-two responsive WebP files, 1,032,342 bytes across both size sets. Original PNGs and exact prompts are included in the separate art archive. Obsolete generic coding/ideas derivatives were retired.
- Updated the directory with cobalt and violet festival panels, category-specific card colors, clearer buttons and readable metadata. Custom events without dedicated artwork use their title instead of an unrelated stock illustration.
- TypeScript and production build passed. All 32 API integration checks passed again. Desktop and 390px mobile checks verified eight unique loaded event images, festival image switching, search/detail navigation, schedule, admin navigation and ticket display. No horizontal overflow was observed.
- Initial discovery JavaScript is 588,592 bytes raw / 179,947 bytes gzip, 9.6% smaller than V2 in gzip. This excludes CSS and images and is not a page-load-time measurement.
- Added RULEBOOK-COVERAGE.md to distinguish implemented criteria, demonstration limitations and pending GitHub/form submission steps. No scores are guaranteed.

## October 8 expanded directory and separate admin URL (V6)

- Five sample festivals, sixteen events and twenty-four initial sample registrations. Added Science & Innovation and Creative Media festivals, plus the Winter website workshop and Freshers coding challenge.
- Every sample festival has its own banner and thumbnail; every event has a distinct cover. Ten new images bring the active set to twenty-one originals / forty-two WebP variants totaling 2,270,462 bytes across both size sets. Below-the-fold images remain lazy-loaded.
- Organizer tools now live at `/admin`, with a separate page title, organizer navigation and a return link to the student site. Public navigation contains only Discover, My registrations and My schedule. Old `/#organizer` links redirect to `/admin`. The URL separation does not add authentication; per-browser demo isolation remains unchanged.
- Missing expansion records are inserted idempotently when an existing workspace opens. Existing event edits, registrations and status changes are retained; no schema migration or reset is needed.
- TypeScript and production build passed; 37 automated API/route checks passed, including repeated-load preservation and both page URLs. Browser checks covered the five illustrated festival cards, sixteen unique event covers, new-festival filtering, new-event registration and QR confirmation, viewing and cancelling that registration from `/admin`, return navigation, old-link redirection and mobile views. No tested horizontal overflow or console errors were observed.
- Initial discovery JavaScript: 595,856 bytes raw / 182,247 bytes gzip (8.4% less gzip than V2). This excludes image/CSS bytes and does not measure page-load time.
- GitHub upload and official Google Form submission remain pending.
