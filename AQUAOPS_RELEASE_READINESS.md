# AquaOps local release readiness

Release candidate: 2026-10-19. Local workstation use only; no public deployment. See the final verification entries in `AQUAOPS_PROGRESS.md` for exact tested code checkpoints and runtime PIDs.

## Product polish verification

Calendar statuses/urgency/dense-event previews, actionable consolidated alerts, safe resumable setup drafts, employee retry/confirmation/mobile improvements, stricter full-recovery validation and independent presentation generations are verified. [Full polish report](AQUAOPS_PRODUCT_POLISH_REPORT.md) and [fictional walkthrough](AQUAOPS_DEMONSTRATION_SCRIPT.md) include acceptance evidence, screenshots and exact limitations. Protocol 10; original dashboards retained.

Recovery requires trusted completed snapshots, a new destination and session revocation; partial/live-WAL sources, malformed private history/accounts and unexpected SQL logic reject. In-flight revoked manager writes are denied. These checks do not replace independent security review or an off-device rehearsal. Public GitHub publication remains blocked by historical conversation-link privacy review.

## Complete and tested in the current expedition

| Area | Implemented scope | Evidence |
| --- | --- | --- |
| Preserved manager home | Original compact three columns, staff cards/badges, blue chemistry panel, coverage map, Facility Logs, operational controls | Existing and new browser suites; responsive geometry 1280/929/768/670px and phone reflow; screenshot review |
| Authentication/authorization | Admin/manager/trusted operator/viewer plus uniquely linked private employee role; CSRF, scrypt, account/session revocation, private file checks | API/account/privacy tests; forged employee requests denied; browser role flows |
| Employee portal | Own dashboard/schedule/week/availability, dated recurring patterns, time off, coverage/volunteers/offers, tasks/evidence, credentials, approved documents, authorized checks/chemistry, confidential submissions | `portal.test.js`, `browser-portal.cjs`; actual cross-role workflows |
| Staffing assistance | Active/credential/availability/overlap/rest/weekly-hour/area rules; workload and soft preference explanations; versioned approval and accepted-period snapshot | Approval race, changed-offer rejection, policy/ownership tests and offer→accept→approve browser flow |
| Demo isolation | 12 fictional employees, all roles, realistic operations/history, sample safe document and labeled illustration; separate generation DBs, visible mode, non-destructive reset | `demo.test.js`; real/demo merge rejection, independent accounts, retained mode after full recovery |
| Alerts/actions | Scoped derived alerts, severity/category/read filters, persistent per-account read state; role-aware Quick Actions | API/browser read-state/filter/navigation/focus tests; no external sends |
| Operations | Four core plus up to 30 reviewed supplemental chemistry definitions; immutable value context, current-limit alerts, archive/history/charts/CSV; inspections/evidence/tasks/equipment links; documents/incidents/inventory | Operations/evidence/integrity/custom-chemistry suites and browser workflows |
| Scheduling/reports | Manager weekly/day time grid, overlap/overnight/DST review, direct gap recommendations, employee/area filters, edit and export; dated batches, own weekly schedule; staffing/replacement/certification/maintenance/inspection/usage summaries | Portal browser calendar/edit/export and supervisor report authorization tests |
| Guided setup | Three guided sections, incomplete draft/resume, reviewed apply with existing-config confirmation; required/optional operational checklist and account links | API preservation/confirmation tests and browser onboarding save |
| Persistence/recovery | SQLite WAL/full sync, revision/request conflicts, all-or-nothing changes; administrator UI/CLI verified full snapshots; private identity/evidence/mode checks | Backup API permissions/path tests, restart/recovery/damage/lock tests; browser snapshot create/verify |

Most recent complete automated gate: **110/110 passed**. All seven Edge suites (operations, accounts, employee/manager, supplemental chemistry, recommendations, weekly time grid, product polish) and the 2,001-record responsive/restart/full-recovery smoke passed. Later final handoff/screenshot checks are recorded in the progress log; narrow tests are not a production assurance.

## Implemented but needing facility/independent review

- Real operating hours, staffing counts, certification validity, work-hour/rest/area policies, chemistry limits/response procedures, checklist adequacy and permissions. No universal legal/safety defaults are supplied.
- Accessibility: native labels/focus/keyboard controls and responsive checks are implemented; full assistive-technology/contrast/user testing remains a release review item.
- Employee data scope is tested in this local single-facility boundary. Retained operational text/documents must still be classified appropriately by supervisors. Trusted operator/viewer accounts intentionally retain shared visibility and must not substitute for employee accounts.
- Browser-local date/time and daylight-saving transitions require responsible review. Scheduled hours are not attendance, payroll or labor-law determinations.
- Full backup tools are tested with synthetic accounts/records; the owner must perform an actual protected off-device recovery rehearsal and establish a retention schedule.

## Incomplete or deliberately limited

- One facility per server/database. Multi-tenant/multi-facility account membership, cross-facility reporting and per-pool chemistry datasets are not implemented. Separate database instances are the isolation boundary.
- Supplemental measurement definitions and saved unit/range/procedure context are implemented; automatic unit conversion, instruments/sensors and independent physical measurement verification are not.
- Dated recurring batches work; unattended ongoing rotations, partial-period replacement optimization and roster optimization are not implemented.
- Onboarding records category/operating-hour/area requirements as reviewed metadata and links to real forms. It does not generate schedules, extend fixed task categories or automatically enforce operating hours.
- Reports use current records/rules with explicit date scoping; they do not reconstruct immutable historical staffing compliance or a time-travel inventory/payroll ledger.
- Optional generative AI, external communications, SSO, email invitations/recovery and push/mobile applications are not configured. Core eligibility works locally without an API key or paid provider.
- Formal purge/retention rules, malware scanning, immutable audit signatures, database encryption and unattended off-device backup rotation remain future work.

## Blocked / not appropriate for real-world sole-system or network use yet

Public/network deployment requires architecture and independent security/privacy review, TLS and secure cookies, host/network controls, MFA or equivalent account policy, managed recovery and incident response. No deployment has been performed. External messaging/AI needs explicit authorization and safeguards before private data transmission.

Jurisdiction-specific compliance, actual credential verification, certified chemistry measurement and emergency response cannot be established by these software tests. Continue required existing facility records and emergency procedures during a supervised local pilot. Do not rely on application calculations alone to open a pool or certify staffing/water safety.

## Local launch and handover

- Real: `Start-AquaOps.cmd` / http://127.0.0.1:8000; existing credentials retained.
- Demo: `Start-AquaOpsDemo.cmd` / http://127.0.0.1:8001; `demo.admin`, `demo.manager`, `demo.employee`, password `AquaOps-Demo-2026!` (demo only).
- Admin/supervisor guide: `AQUAOPS_ADMIN_GUIDE.md`; employee guide: `AQUAOPS_EMPLOYEE_GUIDE.md`; owner review: `AQUAOPS_LOCAL_PILOT_CHECKLIST.md`.
- Requirements: Node 24.14+ in the 24.x line; no runtime npm dependencies or cloud credentials. Protocol 9 requires restarting an older local server after code updates. Workspace v4 optional metadata and additive SQL tables migrate without deleting existing records. Never downgrade against live data.
- Recovery: use `node tools/storage.cjs backup` and restore into a new directory. Browser JSON exports do not contain full account/portal history. Environment settings and test commands are in README.
