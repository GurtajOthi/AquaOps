# AquaOps administrator and supervisor guide

## Launch the right workspace

- Real facility: `Start-AquaOps.cmd` → http://127.0.0.1:8000. Existing accounts remain. A genuinely new installation uses its local setup token; there is no default real administrator password.
- Fictional showcase: `Start-AquaOpsDemo.cmd` → http://127.0.0.1:8001. Accounts `demo.admin`, `demo.manager`, `demo.employee`; demo-only password `AquaOps-Demo-2026!`. Twelve fictional linked employees are available as `demo.employee`, `demo.employee2` … `demo.employee12`.
- Never copy demo records into real operations. The banner and database mode survive full recovery. Demo/real operational JSON merges reject.
- Stop only the specific process ID printed by the launcher. Closing the launcher does not stop the server. Do not stop unrelated Node processes.

## Action Required and safe setup drafts

Open **Action Required** in the header or **Alerts** in navigation. Red gaps are unfilled, orange offers/acceptances still need action, and green replacement labels appear after approval. Read status only acknowledges an alert; saved records determine whether it resolves. Configure starting-soon urgency in Schedule; the default 120 minutes is operational, not a regulatory rule.

Facility Setup offers three guided sections. **Save setup draft** retains partial fields and the current section without changing live settings. Return later to review required fields and linked operational setup records, then use **Save reviewed configuration** with the existing-data confirmation. Only administrators create linked local accounts in Settings; invitations are not sent.

For a presentation that preserves the standard demo, use Start-AquaOpsPresentation.cmd and follow AQUAOPS_DEMONSTRATION_SCRIPT.md. Use completed full SQLite snapshots for recovery; partial/live-WAL sources and unexpected SQL logic are rejected.

## Set up a facility

1. Open **Facility Setup** as admin/manager. Review name, areas, local operating hours, roles, credential requirements, categories, procedure notes and optional chemistry interval. Existing configuration requires confirmation. Saving does not replace staff, shifts, thresholds or checklists.
2. In **Staff**, enter actual employees and independently verify certifications/expiry. Use Active/Inactive to retain employment history. Enter confirmed availability and approved unavailability.
3. Configure staffing requirements by period, area, required credentials and minimum count. These are facility-approved inputs, not legal defaults. Preview/apply weekly batches when useful.
4. In **Pool Operations**, enter equipment, approved chemistry thresholds and source procedures. Free chlorine, pH, temperature and alkalinity are built in. Supervisors may add up to 30 additional named/unit-bearing measurements with reviewed ranges and optional required status. No universal safety limits are supplied. Used identities/units are locked; archive and create a new definition rather than silently converting history. Saved values retain original context; charts/CSV include supplemental measurements.
5. Customize opening/closing checklist drafts in **Inspections**, then save facility-reviewed templates. Inventory records use actual quantities/units/restock thresholds. Configured category notes do not extend the fixed task-category choices.

## Create private employee accounts

Only an administrator manages accounts in **Settings**. Choose `employee` and explicitly select the employee's staff record. A staff record has at most one linked account. Employees cannot pick or change their identity themselves.

- `admin`: accounts, configuration, recovery, full operational access.
- `manager`: supervisory operations, scheduling, private request/incident review, configuration and reports; no account administration/full export/import.
- `employee`: own portal only. No colleague contacts/credentials, generic operational workspace, audit, manager APIs or general reports.
- `operator`: trusted legacy operations account with shared staff/operational visibility. It is **not** a private employee account.
- `viewer`: trusted shared read-only operations account. It is **not** a private employee account.

Use **Requests & Team**, or **Tasks → Private employee portal assignment**, to assign duties to explicit employee identities. A display-name owner alone does not grant portal access. Owner changes clear stale identity links; explicit assignment overrides the display owner. Optional equipment associations retain maintenance history. Grant chemistry/checklist permissions per employee only after authorization. Employees may submit confidential incidents, but cannot retrieve the restricted report afterward. Create a new individual account for a new person rather than reusing another person's login.

For a departing employee, mark staff Inactive and disable their account in Settings. Inactive staff cannot access private portal data or fill new staffing assignments; disabling also revokes sessions. Administrators can still disable a bound inactive account. Keep a second administrator and protect credentials.

## Schedule and fill coverage

- **Schedule** offers a Monday–Sunday time grid, previous/next/Today navigation, Day view, employee/area filters, click-to-view/edit and unique-assignment CSV. Dashed warning blocks open the matching Intelligent Shift Recommendations requirement. Overnight continuations and DST review bands preserve local-clock context. See [the calendar guide](AQUAOPS_TEAM_SCHEDULE.md). **Staff** provides detailed forms, availability, gap requirements, dated weekly patterns and history.
- **Find replacement** evaluates active status, valid named certifications through shift end, explicit full availability, unavailability, overlaps, configured rest, Monday-based weekly hours and area eligibility. Zero numeric policy limits disable that rule; configure approved values in Requests & Team.
- Recommendations explain recorded checks and rank soft preferred hours/areas, then lower scheduled workload. They use no protected characteristics or external AI. Eligibility is only as accurate as maintained records.
- For employee-requested coverage, review candidates in Requests & Team, send an **in-app** offer, wait for acceptance, then approve. No external message is sent. A manager may also approve an eligible volunteer for a configured gap.
- Acceptance/volunteering never finalizes an assignment. Approval rechecks eligibility, capacity, current request version and accepted period/area/requirements in one transaction. Changed offers require fresh employee review. Cancelled/rejected requests cannot be approved.
- Approving time off records unavailability; it preserves existing shifts and flags conflicts so a supervisor can arrange coverage. It does not silently erase an assignment.

## Daily operations

The compact original manager dashboard remains Staff Roster / Maintenance Schedule / Pool Status, with Facility Logs below. Expand task rows for actions and log rows for actor/time/limit details. Coverage map days/weeks are interactive.

Use **Alerts** to filter severity/category/read state and open relevant workflows. Read status is per account; alerts reflect current recorded facts, not safety certification. Review private requests/incidents regularly. Announcements are in-app; archive outdated notices in Requests & Team.

Use task progress/photos for retained maintenance evidence, inspections for immutable result snapshots and corrective tasks, and Pool Operations for timestamped measurements/corrections. Record actual measurement time for back-entry. Readings, credentials and attendance are not independently verified by AquaOps.

Reports provide date/category CSV, chemistry trends and manager staffing/replacement/qualification/maintenance/inspection/stock summaries. Current-rule coverage and current task-status summaries are labeled; they are not payroll, immutable past staffing reconstructions or jurisdiction-specific forms.

Supervisors' **All** report category includes authorized confidential incidents; choose appropriate categories before sharing exports. Idle dashboards update on minute/focus session checks while not editing/reviewing expanded panels. Drafts pause updates, and stale saves still require refresh/review.

## Back up and recover

Administrators can click **Settings → Create full local snapshot**, then **Verify snapshot**. This leaves the credential-containing SQLite file in the local backups folder; arrange protected off-device copies yourself. The browser JSON export is explicitly labeled **Export operational JSON** and is not complete disaster recovery.

```powershell
node tools/storage.cjs backup
node tools/storage.cjs verify "data/backups/VERIFIED.sqlite"
node tools/storage.cjs restore "data/backups/VERIFIED.sqlite" "data/recovered-copy"
```

The full snapshot includes accounts, identity links, portal requests/private evidence, permissions/preferences, read state, audit, records and files. Successful snapshots end in `.sqlite`; `.sqlite.partial` is incomplete. Verification checks private evidence/links too. Restore requires a new directory, preserves the source and revokes restored sessions. Test on another local port before switching.

The browser's JSON export is an **operational merge**, not complete account/portal disaster recovery. It omits SQL portal history and credentials. Use full SQLite backups for product recovery. Keep protected off-device copies and rehearse recovery; no backup upload/rotation service is configured.

## Troubleshooting

- Outdated server: stop its identified process and relaunch; do not reset the database.
- Stale revision/request: refresh, inspect current records and retry. A failed connection can leave an uncertain outcome; check for a saved record before resubmitting.
- Employee login has no active link: an admin must link the correct active staff record. Do not grant manager/operator privileges as a workaround.
- Demo reset: stop its port-8001 process; run `powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-AquaOpsDemo.ps1 -Reset`. A new generation becomes current; the previous demo directory is retained. The real workspace is untouched.
- No npm: all startup, API tests and storage commands run directly with Node 24.14+ in the 24.x line.

Consult `AQUAOPS_RELEASE_READINESS.md` before facility reliance. This remains a local supervised product, without network deployment, MFA, malware scanning, encryption, formal purge rules or tamper-proof audit.
