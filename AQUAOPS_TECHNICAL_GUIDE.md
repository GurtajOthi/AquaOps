# AquaOps — local facility MVP

A connected pool operations application for a supervised local workstation pilot. Builds on the original HTML/CSS/JavaScript dashboard with a Node.js backend and persistent SQLite database. No cloud services, build step or runtime npm dependencies.

For facility setup and a practical handover/recovery rehearsal, use [the local pilot checklist](AQUAOPS_LOCAL_PILOT_CHECKLIST.md).

## Weekly Team Schedule

Managers can open **Schedule** for a Monday–Sunday time grid with area-coloured shift blocks, overlap lanes, overnight continuations, filters, CSV, keyboard-accessible details/editing and mobile Day view. Dashed coverage warnings open the matching recommendation requirement. [Calendar guide and local-time/DST behavior](AQUAOPS_TEAM_SCHEDULE.md). The manager homepage and employee portal are unchanged.

## Product polish and demonstration

The calendar now distinguishes red unfilled gaps, orange pending offers/approvals and green approved replacements while preserving area colours. Supervisors configure the starting-soon urgency window in Schedule. Overlap expansion, compact labels, focus previews and Expand Day improve dense schedules. **Action Required** consolidates current issues with direct workflow links and per-user read state; marking read does not resolve an issue.

**Facility Setup** has three guided sections and a resumable draft; saving a draft does not apply live configuration. Applying reviewed settings preserves operational records and requires confirmation for existing facilities. Optional category fields remain planning notes, not configurable task enums. Employee week navigation, eligibility explanations, retry states and small-screen task forms are refined without redesigning the portal.

For a reproducible fictional walkthrough that leaves your ordinary demo unchanged, use **Start-AquaOpsPresentation.cmd** (port 8002). See [the demonstration script](AQUAOPS_DEMONSTRATION_SCRIPT.md) and [the tested polish report](AQUAOPS_PRODUCT_POLISH_REPORT.md).

## Intelligent Shift Recommendations

Open **Dashboard → Staff Roster → Intelligent Shift Recommendations →**, or **Schedule → Intelligent Shift Recommendations →**. The dedicated manager panel shows actual ranked candidates, calculated fit scores, mandatory-check details, per-candidate offers and approval tracking. The isolated demo includes an unfilled **Demo Coverage Drill**. [Finding and testing the complete workflow](AQUAOPS_SHIFT_RECOMMENDATIONS.md).

## Current local product release

The original compact manager dashboard is preserved. A separate linked **employee** role now has a private mobile portal, own schedule/availability and recurring patterns, time-off/coverage requests, offers and supervisor approval, explicitly assigned duties, credential submissions, authorized daily operations, approved documents and announcements. Trusted legacy operator/viewer accounts keep their broader shared access; use employee accounts for private staff access.

Managers have Requests & Team, day/week Schedule, Alerts, Quick Actions, reviewed Facility Setup and staffing/replacement/certification summaries. Eligibility deterministically checks certifications, availability, overlaps, configured weekly hours/rest and area restrictions. Soft preferences and workload explain ranking; no external AI is required or used.

- [Administrator/supervisor guide](AQUAOPS_ADMIN_GUIDE.md)
- [Employee guide](AQUAOPS_EMPLOYEE_GUIDE.md)
- [Release readiness and honest limitations](AQUAOPS_RELEASE_READINESS.md)
- [Master roadmap and acceptance criteria](AQUAOPS_MASTER_ROADMAP.md)

### Isolated fictional demo

Double-click **Start-AquaOpsDemo.cmd** and open http://127.0.0.1:8001. The real facility remains on port 8000. Demo accounts: `demo.admin`, `demo.manager`, `demo.employee`; demo-only password **AquaOps-Demo-2026!**. Additional fictional employee accounts are `demo.employee2` through `demo.employee12`, with the same demo password. Never use these credentials for real accounts.

The visible Demo Mode banner identifies a separate `demo-data/run-UUID/` database. Twelve fictional employees, qualifications/shifts/gaps, operational history, a safe procedure document, a labeled code-drawn maintenance illustration, incidents, announcements and pending requests are seeded. No real records are inserted. Mode persists through full recovery, and real/demo operational JSON merges reject.

```powershell
node tools/demo.cjs init   # reuse the current demo, or create it if absent
node tools/demo.cjs start  # foreground demo on port 8001; keep terminal open
# Stop the specific existing demo process before resetting/relaunching:
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-AquaOpsDemo.ps1 -Reset
```

Reset creates a new generation and retains the old demo directory; it never deletes a database. Do not run two generations on the same port. The launcher refuses to reuse a server pointed at another database. The normal launcher never selects demo storage automatically.

## Start on Windows

1. Double-click **Start-AquaOps.cmd**. The launcher finds Node.js on PATH, in Program Files, or in this computer's existing Codex runtime. It starts a hidden local server and opens the browser. It detects an already-running server.
2. On first run, copy the setup token shown in the launcher into the setup screen. The same token is in `data/setup-token.txt`. Choose your own administrator name, username and password (12–256 characters). There are no default credentials. The token cannot create another administrator after initial setup.
3. Open **Pool Operations** to record your facility name and operating status; add employees, qualifications, shifts and inspection checklists. All operational data starts empty.
4. Use **Settings** to create individual accounts and set their roles. Export a backup before beginning real record entry.

Closing the launcher does not stop its background server. Its process ID is printed in the launcher; use Task Manager to stop that specific Node process when necessary. Re-running the launcher reopens the existing app.

For a foreground server, from PowerShell in this folder run:

```powershell
node server.js
```

Open http://127.0.0.1:8000 and keep the terminal open. Ctrl+C stops this foreground server. If port 8000 is occupied by an older preview, stop that specific preview process before starting the new app. `main.py` remains an untouched historical welcome script and is not the server.

## Requirements and configuration

- **Node.js 24.14 or newer within 24.x** (tested here on 24.19.0). This uses Node's built-in `node:sqlite` API; no separate database install is required. The SQLite API is still evolving in Node 24: use the tested major version. See [Node 24 SQLite documentation](https://nodejs.org/docs/latest-v24.x/api/sqlite.html).
- A current desktop browser. Automated browser tests used installed Microsoft Edge.
- **No environment variables are required.** Optional `PORT` changes the local port (default 8000). Optional `AQUAOPS_DATA_DIR` changes the database/log directory (default `data/` inside this project). Set variables before starting. `.env` files are not read automatically. Use the same data directory to retain records.
- The Windows launcher tries compatible runtimes rather than stopping at an older Node version on PATH. Optional `AQUAOPS_NODE` supplies a preferred `node.exe` path; it still must satisfy the tested Node 24.x requirement. The launcher verifies the responding app/protocol and requested data location. If another data directory is already running on that port, stop that specific server or use a different PORT; it will not silently reopen the wrong database.
- The server binds only to **127.0.0.1**. This version is for accounts using this computer; other devices cannot connect. No network deployment, firewall changes or hosting were performed.
- Browser date/time inputs use the facility workstation's local time zone. Set it correctly before entering shifts. Chemistry/report/inspection creation times are generated by the server and stored as timestamps. Due dates are calendar dates. Overnight shifts are supported; ambiguous daylight-saving transitions need operator review.

## Working workflows

| Area | Available |
| --- | --- |
| Dashboard | Actual open/overdue/today task totals, recorded facility status, latest dated chemistry, low stock, checklist due dates, unresolved corrective tasks, certification alerts, scheduled staff and equipment alerts |
| Tasks | Create, assign to employee name, edit, complete/reopen, delete; status, category, priority, due date, category/status/search filters |
| Inspections | Custom checklist lines, next due date, per-item Pass/Fail/Not applicable and notes; immutable completed snapshots; failures require notes/due date and create linked high-priority tasks |
| Staff | Employee roles/contact/notes, multiple qualifications and expiry dates, multiple shifts and coverage areas; expiry alerts within 30 days; overlap rejection |
| Reports | Incident/maintenance/inspection narratives plus generated views of inspection, chemistry, task, inventory and equipment source records; category/date filters and CSV export |
| Documents | Upload/view/download PDF, TXT, CSV, PNG, JPEG up to 5 MB; titles/categories; external http(s) links; edit metadata and remove listing |
| Inventory | Supplies/equipment, quantities/units/thresholds; low stock; adjustment reasons/history; quantity edits create history too |
| Pool Operations | Recorded facility status/restrictions; chemistry CRUD with units/timestamps; equipment status/maintenance dates; maintenance tasks/history and incident reports |
| Accounts | First-run administrator, individual accounts, roles, password change/reset, enable/disable; disabled/updated accounts lose their existing sessions |

### Operations workflows added in v0.3

- **Scheduling:** Staff now includes availability windows and configured coverage periods. Enter certification requirements one per line, using the recorded certification names (case-insensitive). New shift assignments reject overlaps, explicit unavailability, missing/expired required certifications and incomplete confirmed availability when available windows exist. Adjacent shifts are allowed. Availability is not attendance; `Unavailable` takes precedence over overlapping `Available` windows.
- **Weekly patterns:** On Staff, use **Weekly pattern builder** for repeated availability, leave, shifts or coverage requirements over a maximum 90-day range. Select weekdays, preview dated rows and explicitly apply them. Existing matching rows are skipped; any blocked record cancels the whole batch. Add confirmed availability before generating shifts. Coverage patterns specify area/minimum/certifications without assigning employees; a different requirement already saved for the same area/time is blocked for direct review/edit. Changing a field clears the preview, and concurrent workspace changes require a fresh preview. End time at or before start time means an overnight period. Leave may flag existing shifts for supervisor review; it never silently removes them.
- **Schedule review/export:** Filter shifts by overlapping dates, employee or coverage area and export the selected roster as UTF-8 CSV. Review notes use current availability/credentials, not attendance or historical credential verification. The homepage coverage detail evaluates each selected day independently, including overnight periods.
- **Coverage and replacements:** Click days or week arrows in the existing homepage coverage map. Staff shows exact gap intervals against the supervisor's configured minimum and qualifications. For an unfilled period, **Find replacement** lists every employee's eligibility/reasons. A supervisor can approve a qualified, conflict-free employee with explicitly confirmed availability covering the whole period. Approval creates a shift and retained approval history; no messages are sent. The tool fills a whole configured period rather than automatically splitting/optimizing rotations. Coverage rules are supplied by the facility, not inferred as legal staffing requirements.
- **Certifications:** Multiple credentials per employee, expiration reminders within 30 days, qualification requirements on shifts/coverage, and a roster qualification summary. A certificate must remain valid through shift end. Existing assignments that become incompatible after availability or credential changes are flagged for review; they are not silently deleted.
- Renewal records keep earlier credentials in history. Roster summaries/reminders use the latest expiration for each employee and normalized certification type, so a renewed credential does not keep triggering an old expiration alert. This does not independently verify the credential or detect revocation; the facility must maintain accurate records.
- **Former/inactive employees:** Edit employment status to Inactive rather than deleting historical employee records. Existing shifts/credentials remain, future assignments are flagged, inactive employees do not fill configured coverage and new shifts are rejected. Routine certification reminders focus on active employees. Legacy records without an employment status are treated as Active. Employment status does not change a separate login account: disable that account in Settings too when appropriate.
- **Maintenance:** **Progress / photos** on a task records notes, completion percentage, actor/time and an optional PNG/JPEG up to 5 MB. Progress updates also change task status. Photos are linked to the task and appear in the existing Recent Photo area. Tasks/photos with retained progress evidence cannot be deleted; complete or reopen the task. Inspection corrective tasks expose the same evidence flow.
- **Chemistry:** Managers configure measurement minimum/maximum pairs in Pool Operations, including the source procedure/rationale. No default limits are supplied. Bounds use ppm for chlorine/alkalinity, °C for temperature, and unitless pH. Saved readings outside the **currently configured** bounds are flagged; historical alerts may change when configuration changes. Corrective actions record responsible employees and can create an assigned high-priority follow-up task. These records never automatically declare the pool safe or compliant.
- **Corrective-task edits:** Adding a due date to an existing chemistry action creates its follow-up task. Changing the action/owner/due updates the corresponding linked task fields and retains audit history without reopening completed work. Unchanged action fields do not overwrite later independent edits on Tasks. A linked action cannot clear its due date; manage task completion/reopening on Tasks. Current linked-task status/due/owner are shown alongside the chemistry action.
- **Chemistry timing:** Optional **Measured at** records when the sample was actually taken, using facility workstation local time. Database save time/actor stay separate. Latest-reading selection, chemistry chart ordering and date filters use measurement time when entered, otherwise saved time; a later back-entry does not replace a newer measurement. New/edited measurement times over five minutes ahead are rejected; imported future times are flagged for review. Ambiguous daylight-saving times need operator review. No measurement is automatically verified.
- **Recording reminders:** Supervisors may set an optional **Chemistry reminder interval** in Facility status (whole minutes, 1–10080). Blank disables it; no default interval or legal requirement is assumed. Dashboard/account reminders flag missing/overdue records against that configured interval, independently of measurement limits. Operators may update operating status but cannot change this configuration. Reminder age does not determine whether water is safe.
- **Logs and reports:** Dashboard Facility Logs supports text/date filtering with recorded users. Reports includes stock-change/usage entries and structured incidents when permitted. Operational analytics provides historical chemistry charts with accessible data tables, configured coverage gaps, inspection/corrective-action totals and task-completion event history from the server audit. Completion counts are events (a reopened task may be completed again), not unique tasks; operational JSON imports do not recreate missing audit history. Analytics uses the workstation date/time zone and the chosen report date range; inspection totals are current saved totals, explicitly labeled.
- **Inspection templates:** Opening/closing starter buttons populate editable drafts. Review/customize and save these against facility procedures; starters are neither executed inspections nor regulatory checklists.
- **Inspection evidence:** Expand a saved inspection to attach PDF/TXT/CSV/PNG/JPEG evidence up to 5 MB with a description. Evidence retains its inspection link, original user/time and file bytes without altering results. Supervisors can restrict access and edit document metadata; evidence listings cannot be deleted. Operators may attach shared operational evidence; viewers cannot upload. Keep sensitive incident details in restricted incident records instead.
- **Incidents and documents:** Managers/admins review and manage structured incidents and legacy Incident narratives. Operators may submit a **confidential incident**, receive its reference and cannot read/update/delete restricted records afterward. Operator submissions always enter Open status for supervisor review. No external notification is sent: follow facility emergency/reporting procedures and arrange supervisor review. Document uploads and links support `All staff` or `Supervisors`; documents categorized as `Incident records` (case-insensitive, ignoring surrounding spaces) are always supervisor-only. Restricted records are filtered from ordinary workspace and mutation responses; protected file requests enforce the same access checks. In-app operational reminders include open incidents for supervisors.
- **Finding records:** Documents supports title/details search and category filtering; Inventory supports search and restock/stocked filters; restricted Incidents supports search, status and severity filters. Filters stay local to the current signed-in interface and clear on sign-out/expiry. CSV exports escape spreadsheet formulas and include a UTF-8 marker for Windows spreadsheet tools.
- **Long lists:** Operational record tables and generated reports show 50 rows per page. Paging preserves other unfinished forms; filters reset the list as needed. Report/schedule CSV exports include **all matching records**, regardless of the currently visible page. Paging caches clear on refreshed data, sign-out and session expiry.

Completed inspection snapshots are not edited or deleted. Record a new inspection to reassess; complete/reopen the linked corrective task. Corrective tasks cannot be deleted. Other record edits/deletions retain previous values in the database audit table. The Settings history shows the latest 300 action summaries; it is not a tamper-proof regulatory audit system.

Reports combine narrative records and current source records. Source records without a known timestamp are excluded from date-bounded reports. This is not a time-travel inventory ledger or jurisdiction-specific reporting form. Source editing is available on the relevant operational page; narrative reports can be edited in Reports.

## Roles

Admin, manager, trusted operator and viewer accounts can read shared facility operational/staff data. **Employee accounts use a separate private API and cannot read that generic workspace, colleague contacts/credentials or general exports.** Incidents and supervisor-only documents remain excluded from operator/viewer access. This is a single-facility workspace, not a multi-tenant service; independent database instances isolate separate facilities.

| Capability | Admin | Manager | Operator | Viewer |
| --- | --- | --- | --- | --- |
| Read operations, staff, documents; export report CSV | Yes | Yes | Yes | Yes |
| Create/edit tasks, reports, chemistry, inventory, equipment, facility status; record inspections | Yes | Yes | Yes | No |
| Delete operational records | Yes | Yes | Tasks only | No |
| Manage employees, qualifications, shifts, checklists and document uploads/links | Yes | Yes | No | No |
| View recent audit summaries | Yes | Yes | No | No |
| Manage accounts, export full data/documents, import backups | Yes | No | No | No |

Operators may add task progress/photos, chemistry corrective actions, shared inspection evidence and confidential incident submissions. Managers/admins configure availability, coverage, qualification requirements and chemistry limits, approve replacements, and manage restricted incidents/documents. A disabled/revoked session is checked again at write transaction time, including requests that were already in flight. Account editors reject stale settings if another administrator has changed the account or reset its password; refresh and review before retrying.

The separate `employee` role requires a unique explicit account-to-staff binding in Settings. It can read only its private portal payload and authorized documents, manage its own availability/preferences/requests, update explicitly assigned task progress and submit confidential incidents. Chemistry/checklist recording requires supervisor-granted permission. Credential submissions are private pending review. Employees cannot change their identity, approve replacements, manage accounts or query manager APIs. Accepted offers retain the reviewed period/area/requirements and require a final supervisor approval with fresh eligibility/capacity checks.

Permissions are enforced in the API, not only by hiding controls. Sessions expire after eight hours. The interface clears cached records/unsaved forms at expiry or after an unauthorized response; local session checks on focus and every minute while visible detect revocation or another tab signing out. Temporary connection failures preserve forms. Passwords use unique salts and scrypt hashes. Session cookies are HttpOnly and SameSite=Strict; writes require a session CSRF token and same-origin checks. The HTTP cookie intentionally has no Secure flag because this app runs on loopback HTTP only. TLS and secure cookies are required before any future network exposure; do not change the bind address as a deployment shortcut.

## Persistence, migration and recovery

- `data/aquaops.sqlite` stores workspace records, uploaded file bytes, account password hashes, sessions and full before/after audit entries. SQLite uses WAL mode and full synchronous transactions. Revision checks reject stale saves; refresh explicitly discards unsaved fields. A network error can leave the save outcome uncertain: refresh and check for the record before retrying.
- Leaving a page or closing/reloading a tab with changed form fields prompts before discarding them. Editing another record, switching dashboard log/coverage views or saving a different form also warns before replacing unfinished entries. This is a local browser guard, not automatic draft storage. Expired/revoked sessions deliberately clear unsaved fields; finish one record at a time.
- Existing browser data is **not overwritten or automatically imported**. Sign in as admin, open the app at the same origin used previously (normally http://127.0.0.1:8000), then choose **Import this browser's old workspace**. It reads `aquaopsWorkspaceV1` or the older task/chemistry keys. Existing JSON backups can also be imported. Legacy Fahrenheit values convert to Celsius; unknown dates remain unknown; old staff fields split into qualifications/shifts.
- **Export operational JSON** creates a merge package with operational records and file bytes, excluding account credentials, active sessions and full SQL portal/audit history. Keep it access-controlled. Import is all-or-nothing: matching values skip; conflicts cancel without overwriting. It does not roll a workspace backward. Use **Settings → Full Local Recovery Snapshots** or the CLI below for complete account/employee-history recovery. Individual uploads are limited to 5 MB and browser import to 32 MB.
- **Full disaster recovery:** use a completed, verified SQLite snapshot and restore it into a new directory with the tools below. This retains accounts, records and audit history while revoking restored sessions. Never copy only a live SQLite main file: committed records may still be in its WAL. Protect credential-containing snapshots and retain the original database.
- If all administrator passwords are lost, there is no email recovery service. Have a second administrator who can reset accounts in Settings, or recover from a protected full backup. Do not delete the live database to regain access.
- Deleting a document removes its listing/retrieval access. Its file bytes and previous metadata remain in database history/backups. A formal data retention/purge process is not implemented.

- **Full product recovery requires SQLite snapshots.** Employee identity/task links, requests, private credential evidence associations, permissions/preferences, announcements, per-user alert read state and account/audit history live in additive SQL tables. Browser JSON exports are only an operational merge and do not reconstruct these tables. Full snapshots/recovery include and verify employee links/private evidence and retain demo classification. Never downgrade current data to an older application version.

### Full backup and tested recovery tools

Administrators can also create and verify full local snapshots in **Settings → Full Local Recovery Snapshots**. Files remain in the server workspace's `backups/` folder; no credential-containing snapshot is downloaded or sent externally. Keep protected off-device copies. Verification/listing is administrator-only and path constrained; the UI does not restore over a running database.

From this folder:

```powershell
node tools/storage.cjs backup
node tools/storage.cjs verify "data/backups/YOUR-BACKUP.sqlite"
node tools/storage.cjs restore "data/backups/YOUR-BACKUP.sqlite" "data/recovered-copy"
```

`backup` takes a consistent live SQLite snapshot into the configured data directory's `backups/` folder and verifies SQLite integrity, workspace validation and document file references. It includes records, files, account hashes and audit history. Keep protected copies off the facility computer; this tool does not upload or schedule anything.

Snapshots are written as `.sqlite.partial` and receive the completed `.sqlite` filename only after verification succeeds. Failed/interrupted partial files are retained for investigation and are not completed backups. The source database and earlier verified snapshots are preserved.

Validation also checks retained inspection/corrective-task associations, chemistry follow-up links, duplicate history IDs and linked progress-photo records. Damaged imports cancel without changing records or inserting partial file bytes. Keep the original backup if verification fails; the tools never repair or delete history automatically.

`restore` requires a **new target directory**, refuses to overwrite existing data, verifies the backup, copies it, revokes restored sessions and appends a recovery audit event. Accounts/passwords and records remain. Test the recovered copy on a different local port before switching the normal server to it:

```powershell
$env:AQUAOPS_DATA_DIR = (Resolve-Path .\data\recovered-copy).Path
$env:PORT = '8003'
node server.js
```

After stopping that foreground test with Ctrl+C, restore or clear the temporary environment variables before normal startup. These backup/verify/restore workflows, including preserved login credentials and revoked sessions, are covered by isolated automated tests. Restore rejects partial snapshots, a source with uncheckpointed WAL records, malformed private requests/accounts, and unexpected SQL triggers/views/virtual tables. Use trusted completed snapshots; verification cannot make an untrusted file trustworthy. A backup is not a substitute for an off-device retention and recovery plan.

Workspaces use **schema v4** with additive optional metadata and employee/portal SQL tables. v1/v2/v3 records upgrade without deleting data or inventing measurements. Do not downgrade against live data: older v4 code cannot enforce new employee policies or capture additional chemistry. Use verified backup copies for historical-version testing. Client/server protocol **10** and launcher checks reject stale running servers rather than silently mixing versions.

## Readiness checklist

**Verified for a local workstation pilot**

- [x] All ten pages load and navigate; forms call the backend.
- [x] Core record create/view/edit/delete, role checks and useful errors.
- [x] Real uploads, protected view/download, inspection follow-up actions.
- [x] Records, accounts, sessions and files persist across server restart.
- [x] JSON backup import/recovery tested in a separate database.
- [x] Browser tests cover all ten pages, scheduling/replacements, progress images, chemistry configuration/corrective actions, restricted incidents and analytics at 390px without page errors.
- [x] Full SQLite backup verification and recovery tested, including account retention/session revocation.

**Owner setup before real recordkeeping**

- [ ] Create the facility administrator and individual user accounts; protect passwords and the OS account.
- [ ] Enter actual employees/certifications, facility status, equipment and inventory; review any imported records.
- [ ] Define facility-specific checklists, inspection cadence, staffing requirements and chemistry response procedures with the responsible facility authority. App alerts track configured checks and dates; they do not certify legal compliance or determine safe opening automatically.
- [ ] Assign an owner for backups, test recovery with a copy, set retention/privacy rules and protect the computer/storage. Database/files are not encrypted by the app; use appropriate OS/disk protection.
- [ ] Run a supervised pilot against the facility's existing required records before making AquaOps the sole recordkeeping system.

**Not production/network ready**

- [ ] Multi-device access/TLS, managed hosting, MFA, off-site automated backups, independent security review, malware scanning and immutable audit/signatures. Linked employee privacy and supervisor document/incident restrictions are tested; an actual off-device recovery rehearsal remains the owner's responsibility.
- [ ] Jurisdiction-specific compliance verification, email/SMS reminders and automatic ongoing rotations are not implemented. Explicitly previewed weekly availability/shift patterns are supported. Staffing minimums/gaps and chemistry bands are configurable, **not regulatory defaults**. Expiry/due/abnormal-reading alerts are in-app only.
- [ ] Employee identity/task bindings are explicit and tested; legacy display-name task owners alone do not grant portal access. Dated recurring batches work, while unattended ongoing rotations and partial-period optimization remain future work. Inspection evidence uploads work; formal retention/purge rules and tamper-proof signatures remain outside this local product.

No external services were purchased, no user records were deleted during development, and nothing was deployed.

## Tests and architecture

```powershell
node --test tests/*.test.js
node tests/browser.cjs
node tests/browser-access.cjs
node tests/browser-portal.cjs
node tests/browser-chemistry.cjs
node tests/browser-recommendations.cjs
node tests/browser-calendar.cjs
node tests/scale.cjs
```

Model/API tests have no npm dependencies. Browser tests require Playwright and an installed browser: set `AQUAOPS_PLAYWRIGHT` to its package path if it is not locally resolvable, and optionally `AQUAOPS_BROWSER_CHANNEL=msedge` or `chrome`. No browsers are downloaded automatically. Tests create isolated databases under ignored `test-data/`; they do not use the facility's `data/` directory or browser storage. Generated desktop/mobile screenshots are in `tests/` and ignored by Git.

`scale.cjs` is an optional 2,001-record synthetic smoke test, including 1,000 chemistry readings and 450 shifts. It checks all ten pages at desktop/tablet/phone widths, filtering, paging without losing drafts, full filtered CSV export, restart and full backup/recovery with retained accounts/revoked sessions. This verifies that fixture on this workstation; it is not a multi-user or unlimited-scale performance guarantee.

Frontend: `frontend/index.html`, existing `style.css`, `model.js` shared validation/migration and `script.js` views/API integration. Backend: `server.js` local HTTP/static entrypoint and `backend/app.js` SQLite/auth/API. Parameterized SQL stores a versioned workspace and file BLOBs transactionally; this favors a small local MVP over large-scale querying. `checkpoints/initial/` retains the original prototype; Git history contains development checkpoints. See `AQUAOPS_PROGRESS.md` for milestones and exact test outcomes.

Employee/manager workflow extensions are in `frontend/portal.js`, scoped `frontend/portal.css` and `backend/portal.js`. Protocol **9** prevents silent reuse of stale servers. Existing accounts/records are preserved; no rewrite/destructive migration is required. Idle manager/employee dashboards refresh on the existing visible-minute/session-focus check, pausing for drafts, edit forms and expanded panels; operational navigation reloads the current snapshot. Stale writes still reject.

### Additional facility chemistry

Pool Operations lets supervisors define up to 30 additional measurement definitions with names, units, reviewed minimum/maximum pairs, source procedures and optional required status. No values/limits are supplied for real facilities. Values outside configured ranges are saved and flagged; they are not blocked or certified as safe/unsafe. Authorized employee chemistry forms use the same definitions and validation.

Saved values retain their name/unit/range/procedure context. Unchanged values retain that context during note edits; current alerts compare against current active definitions. Changing a used measurement's identity/unit is blocked; archive it and create a new definition instead. Archived readings remain in history, CSV and selectable trend charts. Older readings with missing newly required measurements are not filled with invented values. Unit mismatches require review rather than numeric comparison. The original three blue-panel readings remain unchanged; supplemental values expand below them or in Facility Logs.
