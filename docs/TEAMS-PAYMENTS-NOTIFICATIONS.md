# Teams, payments and device notifications

## Organizer workflow

Open `/admin` → **Event management** → **Create event** or **Edit**.

- Set **Fee in BDT** to 0 for free events, or enter the amount and a real **Payment receiving number**. Choose bKash, Nagad, Rocket or Bank / other.
- Every event registration form now offers **Solo / Team**. The admin selection only sets the initial form mode; students can change it. A solo booking uses one slot and one fee per person; a team uses one slot and one fee per team. Set a minimum and maximum between 2 and 8, including the leader.
- Participation type/team limits are locked while active bookings exist. Fee changes affect new submissions; existing registrations retain their original amount, receiving number and method.
- In **Participants**, filter **pending payment**. Open the student record and check its Trx ID against the receiving account. Choose **Verify payment & confirm** only after checking it. Trx ID submission is not proof of payment.
- Pending payments reserve one slot. Cancelling rejects the booking and releases that slot. Pending or cancelled records have no usable entry QR and cannot check in. Refunds are handled by the organizer outside this app; cancellation does not transfer money.

Existing fees are unchanged. All event forms support both modes; choosing Team does not bypass paused events, deadlines, capacity, accepted-member limits or duplicate registration protection.

## Student workflow

Account creation asks for a phone number. It is stored in the private Firestore profile, visible to the student and approved admin. It is not exposed in teammate search or push messages.

1. Verify your account email. Open **My teams** and save a public teammate name. The directory checkbox controls whether other verified students can find you.
2. Open any event registration form. Its first control is **Solo / Team**. Solo shows the usual personal fields. Team reveals the group name, leader, name search and request buttons directly inside the form. You can reuse an existing draft group for this event; otherwise the first request creates your group. A new leader gets a private directory entry and is not automatically made searchable.
3. Search by another student's name and press **Send request**, without leaving the registration form. They must have joined the directory. Only names and member IDs are returned, never email or phone.
4. The recipient sees an invitation in the header bell and My teams, and receives a device alert if enabled. They may accept or decline. An accepted member may withdraw until registration is submitted.
5. Refresh member responses in the form, or wait for the automatic refresh. Submit is enabled once enough teammates have accepted. Only accepted members are included; pending and declined invitations are excluded. Minimum team size must be met. A student cannot occupy two active registrations for the same event.
6. For paid events, send the displayed amount using the displayed payment method/number, then enter the Trx ID. Keep the payment receipt. The organizer verifies it before confirming entry.
7. Every accepted teammate sees the shared booking, group name, leader and partners in **My registrations**. Only the leader/admin can cancel the whole team's registration. Only the leader/admin see its Trx ID.

## Device alerts

Use the header bell → **Enable device alerts**, grant browser permission, then **Test notification**. Each account can subscribe on five devices. Signing out unsubscribes this browser, and account changes invalidate the previous device binding. The service worker does not cache private application/API responses.

iPhone/iPad users need a supported OS/browser and a Home Screen web app (iOS/iPadOS 16.4 or later). Delivery depends on system permissions, connectivity, and browser/push-service policies. See [Apple's Web Push documentation](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).

### Background reminder connection — not enabled yet

VAPID credentials are configured as Sites runtime values; the private key is secret and not in source. Team invitation delivery and the test action run on an authenticated request. Automatic **24-hour and 1-hour contest reminders require an unattended scheduler**. As shipped in this revision, `CLUBOS_REMINDERS_ENABLED=false`; the UI explicitly shows setup pending. Calendar downloads already include both alarm offsets as a fallback; the calendar app controls alarm delivery.

The published Site provides an authenticated MCP connection with `reminder_status` and `dispatch_due_contest_reminders`. Connect its Sites-provisioned plugin in **Plugins → Personal → Created by you**. Do not create a second Site/plugin or expose Firebase accounts to a public scheduler.

To finish setup:

1. Obtain this same Site's `mcp_connection` with Sites `get_site(include_mcp_connection=true)`, and connect its returned plugin.
2. From the intended unattended connection, call `reminder_status`, then `dispatch_due_contest_reminders`. Reuse successful verification; do not insert fake registrations or send test messages to real students.
3. Read the Site's linked automations and reuse an existing reminder schedule if present. Otherwise create one, running every five minutes in **Asia/Dhaka**, with a self-contained prompt: “Use this Site's connected reminder tool to dispatch only due contest reminders. Repeat while more is true. Keep quiet if there are no due reminders. Report persistent failures or a missing connection. Do not modify events, registrations, recipients or message content.”
4. Only after the authenticated writer and schedule are verified, set `CLUBOS_REMINDERS_ENABLED=true` and redeploy the saved source version with that environment revision. Confirm the saved schedule status; creation alone does not prove its first run.

The writer accepts no recipients or custom content. Sites-verified callers may trigger this bounded service action; it returns aggregate counts, never student records. It only considers confirmed/check-in registrations, sends at the 24-hour/1-hour thresholds with a 15-minute catch-up window, and skips reminders whose threshold preceded registration. Duplicate deliveries are suppressed by registration, event start time, offset and subscription. Failed sends can retry after five minutes, expired endpoints are removed, and each call attempts at most 100 unsent deliveries (`more=true` asks the scheduler to continue). A service-worker notification tag also collapses repeats. No email/SMS or payment gateway is configured.

## Verification boundary

The real API is exercised by signed JWT fixtures, simulated Google account responses and SQLite. Tests cover consent, duplicate team membership, private reads, price snapshots, Trx validation/reuse, reserved capacity, approval, check-in and cancellation. Web Push tests check encrypted payload generation, endpoint restrictions, ownership, deduplication, timing, expired endpoints and authenticated MCP discovery, using a simulated push service. Browser checks use an explicitly labelled local fixture for admin/team screens. Real Firebase login, real payment approval and delivery to a physical phone still require the owner's/student's signed-in walkthrough.

Switching back to Solo retains already-sent invitations but omits all teammates from the booking. Personal input fields remain mounted, so changing modes does not erase the main form.
