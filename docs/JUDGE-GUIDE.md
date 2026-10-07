# Judge walkthrough

First complete [Firebase setup](FIREBASE-SETUP.md). Use a verified student account and a separately authorized organizer account. Never publish organizer passwords in the repository.

1. **Directory:** Show the five illustrated festival selectors. Search “robot”, clear it, and select a category. Open Robotics Arena to show the event venue, time, deadline, capacity and registration form.
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
- [ ] Complete Firebase setup and authorize the organizer UID
- [ ] Privately provide judges an organizer test account if required
- [ ] Push the source to a public GitHub repository under your account
- [ ] Replace documentation status with the final public repository URL
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
