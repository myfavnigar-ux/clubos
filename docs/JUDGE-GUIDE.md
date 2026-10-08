# Judge walkthrough

For instant evaluation, use [the public judge demo](PUBLIC-JUDGE-DEMO.md): three public sample logins need no email verification or 2FA. They edit only this browser's fictional data. The walkthrough below also applies to the production app, where verified Firebase student accounts and authorized organizers are required. Public demo passwords do not grant production access.

1. **Directory:** Show the five illustrated festival selectors. Select a festival to open its shareable `#fest/<id>` page; reload to demonstrate that the festival selection is preserved. Search “robot”, clear it, and select a category. Open Robotics Arena to show the event venue, time, deadline, capacity and registration form.
2. **Registration:** Sign in with a verified account, then register using your name and institution. Show the instant ticket, download it, reload, then open My registrations. Open My schedule and export the calendar.
3. **Rules that work:** Design Beyond Screens is full. Campus Gaming Cup is closed. Register for AI Web Development, then Code Sprint; these overlap, so demonstrate the acknowledgement requirement.
4. **Organizer:** Open [the separate admin URL](https://clubos-carnival-somudro.anaim12.chatgpt.site/admin). Review real registration totals and the chart. Search student@example.test in Participants. Change a participant to Checked in and export the filtered list.
5. **Create/manage:** In Events, edit a venue or capacity. In Festivals, create a new festival; create an event within it. Use Open student website, clear filters, and show the new data.
6. **Bonus:** Copy a different confirmed ticket ID that has not been checked in from Participants and use At the door. Cancel a ticket and demonstrate that cancelled tickets cannot check in. Show the mobile schedule conflict warning.

Seeded data is fictional. New registrations belong to real Firebase accounts. Organizer changes affect the shared database for everyone. The prior isolated browser workspaces are no longer the active app model.

# Rulebook coverage

| Area                              | Implementation                                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Fest directory (30-point section) | Festivals, information-rich event cards, search, category filters, details with deadline/capacity, responsive layouts |
| Registration (30-point section)   | Validated form, submission, confirmation, enforced limits/deadlines, personal registration management                 |
| Organizer (30-point section)      | Dashboard, participant list/search/filter, status management, statistics, responsive tools                            |
| Creative bonus (up to 30)         | Overlap detection, schedule suggestions, calendar export, QR passes, ticket check-in, safe CSV export, account-based permissions       |

This maps implemented features to the rubric; it is not a claim of points earned.

# Submission checklist

- [x] Source and sample data prepared
- [x] MIT license
- [x] README covering all requested sections
- [x] Screenshots and demonstration guide
- [x] Public access enabled for the deployed URL
- [x] Create Firebase databases, publish restrictive rules for the original organizer and configure server admin access
- [x] Provide public student/teammate/organizer demo credentials and an isolated walkthrough
- [ ] Privately provide a real organizer test account if judges require production-backend validation
- [x] Publish source at https://github.com/myfavnigar-ux/clubos
- [x] Include the public repository URL in the submission documents
- [ ] Submit the repository and deployment links through the official form

Rulebook deadline: **October 9, 2026, 11:59 PM**. The supplied PDF does not specify a timezone; verify it with the organizers.

## Latest polish

- Mobile navigation includes readable labels and category filters wrap without hiding options.
- QR passes download as self-contained SVG files. Scan with an external QR reader and paste its `clubos:` payload into At the door. The server rejects cancelled or repeated admissions.
- My schedule recommends available events that fit around existing registrations. These suggestions are deterministic.
- Deadline indicators use server time; final registration checks always happen on the server.
- The signed-token API test harness covers authentication, privacy, organizer authorization and atomic booking. Live authentication checks depend on Firebase Console setup.

## Community features

Open My profile for private profile details and registration history; Journal for 10 sample articles; Helpline for configurable support contacts. In `/admin`, Participants → student name opens registration details. Student profiles lists account histories. Event management edits all event details and can pause booking. Blogs supports drafts/publishing, Announcements controls the header bell, and Helpline manages contacts. Database activation status and actual verification limits are in LAUNCH-STATUS.md.

## Festival navigation and payment review

Each festival has a shareable detail route, date/venue/artwork, live open-event count and its own filtered event list. Event details link back to their festival. Paused booking is distinct from an expired deadline; slot labels count one solo or team entry.

Admin Overview separates payments awaiting verification from verified fees. The amount comes from each registration's saved payment snapshot, not the event's current price. Cancelled registrations are excluded; these totals are not a refund ledger. Review payments opens the filtered participant list. Search supports team names, accepted member names and Trx IDs. CSV includes team, members, entry type, saved amount, method, Trx ID and registration timestamp.

Local UI verification uses fictional records: one pending payment of BDT 500, one verified payment of BDT 200 and one cancelled payment of BDT 1000. The dashboard shows 500 pending and 200 verified, never 1700. Browser checks exercise these actual components; live authenticated writes still require the owner's sign-in.

Custom email OTP, registration-email delivery and their proposed billing upgrade were cancelled at the owner's request. Existing Firebase Auth verification/reset links remain supported.
