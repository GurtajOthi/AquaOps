# AquaOps master roadmap

Updated 2026-10-19. Preserve manager visual baseline `cb2c482` and later compact task/log refinements; never reset working code or populate real data with demo records.

## Product polish acceptance update

- Calendar: shared status semantics, configurable urgency, spare-lane expansion and accessible previews; preserve local-time/DST/overnight layout and approved dashboards. Status transitions and persisted replacement updates are verified by model/API/browser tests.
- Action Required: current staffing/approval/certification/inspection/corrective/maintenance/chemistry/inventory issues, stable read identity, consolidated related requests, direct actions and role scope. Derived resolution and employee privacy have regression coverage.
- Setup: draft/save/resume/apply and local linked employee-account setup verified; operating hours, credential/category notes still require operator review and do not enforce a full municipal policy.
- Employee: truthful acceptance/approval messages, week controls, eligibility reasons, retry/empty states, all nine routes and authorized Quick Actions tested at 390/320px.
- Reliability: revoked in-flight writes, consistent full-snapshot validation, malformed request/account and WAL/partial/SQL-logic recovery rejection verified.
- Demonstration: independently retained presentation generations on port 8002; fictional data only. See demonstration script and polish report for final evidence and remaining production blockers.

## Architecture and audit

Node 24 built-in HTTP/SQLite; vanilla HTML/CSS/JS; no runtime packages. One facility per database/server. SQLite workspace v4, protocol 10, accounts/sessions/files/audit plus additive identity, request, task-binding, permission/preference, alert-read, announcement and mode tables. Existing operator/viewer are trusted shared roles; the separate linked employee role provides private access. Full backups include all tables; operational JSON exports omit account/portal SQL history. Existing local accounts/database remain untouched by synthetic tests.

Audit evidence: all repository source, tests, brief, README, progress, pilot checklist and recent Git history inspected. Existing tests cover CRUD, authentication/CSRF, optimistic conflicts, inspections/evidence, scheduling/replacements, chemistry, inventory, upload privacy, JSON/full recovery, launcher, browser workflows and scale. Current final gate: 110 automated tests and seven Edge suites passed, plus the 2,001-record scale/restart/full-recovery smoke. Historical counts below describe earlier milestones.

| Priority / feature | Current status | Dependencies | Acceptance criteria / evidence |
| --- | --- | --- | --- |
| P0 Original dashboard / responsive layout | Complete in baseline; preserve | Existing CSS and reference image | Three columns 1280/929/768/670px, phone reflow; visual screenshots; no functionality lost |
| P0 Backup / checkpoints | Pre-change checkpoint c180079 and verified full snapshot | SQLite backup tool | Integrity ok; no real record edits; local-only commits |
| P0 Private employee identity and authorization | Implemented and tested | Explicit unique account-to-staff binding | Portal API tests deny forged reads/writes/files/manager endpoints; inactive binding/account lifecycle and recovery tested |
| P0 Employee mobile portal | Implemented and tested | Linked role, private API | Cross-role browser tests cover own dashboard/schedule/availability/tasks/certifications/docs and phone layout |
| P1 Requests / time off / coverage offers | Implemented and tested | Versioned SQL requests, transactional approval | Submit/withdraw, accept/decline, supervisor approval, capacity race and changed-consent snapshot rejection tested |
| P1 Explainable matching / scheduling policy | Implemented and tested | Approved policy, current records | Deterministic credentials/availability/overlap/rest/hours/area checks; private preferences/workload ranking; no external AI |
| P1 Isolated seeded demo | Implemented and tested | Separate generation directories/port and persistent mode | 12 fictional employees, roles, records/files; reset preserves prior generations; real/demo JSON merge and full-recovery isolation tests |
| P1 Alerts center | Implemented and tested | Derived IDs, per-user read table | Severity/category/read filtering and relevant workflow links tested; underlying issues resolve from records, no external sends |
| P1 Quick actions | Implemented and browser tested | Role-specific routes/forms/permissions | Compact menu opens and focuses working forms; viewers have no write menu; employee permissions determine actions |
| P1 Guided onboarding | Guided draft/resume/reviewed apply tested; category metadata remains notes | Existing facility/threshold/template forms | Existing configuration requires confirmation; schedules/thresholds/checklists preserved; remaining setup links real forms |
| P2 Scheduling views | Implemented and tested | Scoped schedule data, shared rule engine | Manager day/week/employee/area calendar, edit/export; private employee week; dated recurring availability; persistent approval history |
| P2 Pool operations | Core and reviewed supplemental metrics/history/charts/limits/reminders/corrections complete | Approved facility criteria | Existing regressions pass; no compliance claims; up to 30 supplemental definitions, archive and saved measurement context tested |
| P2 Inspections / maintenance | Core complete; equipment association verified | Retained snapshots/progress/history | Results/evidence/corrective links tested; optional equipment link retains associated maintenance history |
| P2 Incidents / documents / inventory | Complete core workflows | Server access checks | Confidential submission; protected files; stock history/low warnings; malicious requests rejected |
| P2 Reports / analytics | Implemented core summaries and tested | Supervisor-only staffing API, existing operational reports | Workload/replacements/certification forecast/current-rule gaps/maintenance/inspections/usage and CSV; no confidential data in general reports |
| P2 Announcements | Publish/read/archive tested | Supervisor SQL publication state | Employee visibility follows active state; manager publication changes versioned/audited |
| P0 Release / guides / security review | Guides/readiness/config template complete; local verification passed | Verified scope and owner facility review | Admin/employee guides, README/demo/recovery instructions, .env.example, readiness classifications; external review remains |

## Execution and verification log

- Weekly time-grid milestone: manager Schedule now renders Monday–Sunday clock-positioned area-coloured blocks with overlap lanes, overnight splits, keyboard details/editing, direct gap/request recommendations, navigation, filters, unique CSV, mobile scrolling/day view and DST review bands. **87 automated tests** and **six Edge suites** passed; 2,001-record recovery smoke passed. Existing dashboards/backend/data preserved. See `AQUAOPS_TEAM_SCHEDULE.md`.

- Recommendation discoverability milestone: dedicated light manager panel accessible from Dashboard, Staff, Schedule, navigation and Quick Actions; real scheduling-fit scores with rule explanations, per-candidate offers, approval tracking and future demo drill. **83 automated tests** and **five Edge suites** passed. Full offer/decline/re-offer/accept/approve and existing-shift reassignment verified; both dashboard layouts retained. Details: `AQUAOPS_SHIFT_RECOMMENDATIONS.md`.

- Final milestone: supplemental chemistry definitions with retained observation context, private checklist evidence/history, equipment-linked maintenance, administrator full-snapshot UI, exact alert navigation, safe idle dashboard refresh and inactive-session privacy completed. Full regression: **80/80 automated tests**, **four Edge suites**, **2,001-record smoke**. Source/launcher syntax and Git whitespace checks passed. See progress log for final runtime and backup details.

- Second milestone: recurring own-availability preview/edit/delete, request withdrawal, private soft preferences, manager calendar/edit/export, staffing analytics/CSV and stricter offer-consent snapshots completed. Full snapshot verification includes private portal evidence and bindings. **75/75 automated tests** and expanded cross-role browser suite passed. Release documentation and final local handoff continue.

- First implementation milestone: linked private employee role/portal, identity task assignments, employee permissions, versioned requests/time-off/volunteers/offers/approvals, scheduling-policy constraints and workload explanations, scoped alerts/read state, quick actions, reviewed facility onboarding and isolated 12-person demo implemented. New `portal.test.js` and `demo.test.js` plus existing suites: **70/70 tests passed**. `browser-portal.cjs` passed actual manager/employee workflows and responsive geometry with zero page errors. Existing operational/account browser regressions also rerun. See progress log for defects found/fixed. The audit table above records starting status; this milestone supersedes its "Missing" entries for implemented workflows.

- 2026-10-19 07:24 UTC: checkpoint `c180079`; verified `data/backups/full-2026-10-19T07-24-37-197Z-5ecd4a076d22ab06.sqlite`, integrity ok, revision 0, zero real operational records. Existing accounts preserved.
- Expedition completed: 80/80 automated tests, all four Edge suites and the 2,001-record responsive/restart/full-recovery smoke passed on final code. Protocol-8 real and isolated demo previews restarted and checked. Next owner milestone: review actual facility configuration/permissions and perform protected off-device recovery rehearsal. Longer-term limitations are explicitly listed in `AQUAOPS_RELEASE_READINESS.md`.

## Release boundaries

Local single-facility product, not a multi-tenant hosted platform. Separate facility databases/ports are the isolation boundary; no user-controlled database switching. Before network/sole-system use: independent security/privacy/regulatory review, TLS/secure cookies, managed backups, retention/purge rules, credential verification, emergency procedures, accessibility review, and multi-user operational rehearsal. No external AI, messages, deployment or GitHub push is authorized.
