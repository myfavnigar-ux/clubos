# Public judge demo: five-minute walkthrough

Open https://clubos-carnival-somudro.anaim12.chatgpt.site/judge-demo.

All three accounts use the public password **`ClubOS-Judge-2026`**:

- Student: `student@clubos.demo`
- Teammate: `partner@clubos.demo`
- Organizer: `organizer@clubos.demo`

No email verification or 2FA. These credentials are deliberately public and grant no production/Firebase access. Use the same browser throughout; Switch account retains sample data. Reset demo clears only the fictional judge workspace. Do not use personal data or send money.

1. **Discover:** Sign in as Student. Choose Tech Carnival, search for an event, explore its details and open its registration form. Every festival has a shareable detail route. Design Beyond Screens starts full; Campus Gaming Cup starts closed.
2. **Book:** Register Solo for AI Web Development with an example institution and the agreement checkbox. View the confirmation, download the sample QR pass, reload, and open My registrations. Try Code Sprint to see the schedule-conflict acknowledgement.
3. **Teams:** Open Robotics Arena, choose Team, enter a team/leader name and search `Partner`. Invite Demo Partner. Switch account to Teammate, open My teams and accept. Switch back to Student, reopen Robotics Arena, select the team and enter a fictional transaction ID such as `DEMO-TRX-002`. The team has one slot and one BDT 200 fee. The receiving label explicitly prohibits real payment.
4. **Organizer:** Switch to Organizer. Review the pending payment, search by team/member/Trx ID, open participant details and choose Verify payment & confirm. Confirmed tickets can check in once; cancelled/pending tickets cannot. Export the filtered CSV.
5. **Manage:** Edit an event title, venue, schedule or capacity in Event management; create a festival and an event within it. Switch back to Student to see the same changes. Reset when finished.

## Storage and scope

The demo shares the production React UI but uses a separate, tested local data adapter. It keeps fictional catalog, registration and team data in browser localStorage, with the current demo role in sessionStorage. Dates shift into the future when resetting so the judge flow remains usable. State does not synchronize across devices and is not a production backup.

The main app uses Firebase Authentication, Cloudflare D1 booking/catalog storage, Firestore profiles/blogs/support, Realtime Database announcements and Web Push. This demo does not connect to those account/data services. Firebase community editing and device-notification controls are excluded from the demo. Those live workflows require real authorized accounts and their verification status is documented in LAUNCH-STATUS.md.

## Submission handoff

Submit the main live URL, public repository URL and this judge-demo URL together. Copy-ready project text is in SUBMISSION.md. The official form URL and entrant details are not available yet, so no contest entry has been submitted. No score or placement is guaranteed.
