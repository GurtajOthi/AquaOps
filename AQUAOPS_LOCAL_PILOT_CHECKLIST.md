# AquaOps — local pilot checklist

Use this with the responsible facility supervisor. AquaOps records operations; it does not independently verify water readings, credentials, attendance or legal compliance.

## Launch and accounts

- [ ] Double-click `Start-AquaOps.cmd`, then open http://127.0.0.1:8000. Use the existing account on this computer. A new installation asks for its local setup token and a new administrator; no default password exists.
- [ ] In Settings, create individual accounts. Admin manages accounts/recovery; manager supervises operations; employee has a unique linked private staff portal. Operator/viewer retain trusted shared visibility and must not substitute for private employee accounts.
- [ ] In Requests & Team, explicitly assign employee portal duties and grant chemistry/checklist permissions only after authorization. Rehearse private credential review, time off, offer acceptance/final approval and scoped Alerts. Review admin/employee guides.
- [ ] Keep a second administrator/recovery plan. Inactive employee status and disabled login access are separate settings.

## Enter real facility configuration

- [ ] Pool Operations: facility name, accurately recorded operating status/restrictions and equipment records. Enter approved measurement limits and response procedures; there are no default safety limits.
- [ ] Optionally set a supervisor-approved chemistry recording reminder interval. Blank disables it. The reminder is independent of water-limit alerts and does not decide safe opening.
- [ ] Staff: actual employee records and verified credential names/references/expirations. Renewals retain earlier records; current reminders use the latest expiry per employee/type.
- [ ] Record confirmed availability and leave. Unavailability takes precedence. Configure coverage areas, required periods, minimums and credential names from facility procedures.
- [ ] Use Weekly pattern builder to preview/approve dated availability, coverage requirements and shifts. Existing conflicting requirements/assignments are blocked. Requirements alone do not assign staff or confirm attendance.
- [ ] Inventory: actual items, units, quantities and restock thresholds. Use stock adjustments with reasons for consumption/corrections.

## Rehearse daily workflows

- [ ] Dashboard: verify the roster/coverage map, maintenance tasks, latest chemistry and Facility Logs against entered records. The original three-column homepage is retained.
- [ ] Record a real chemistry sample. Use Measured at for back-entry; server save time/user remain separate. Older measurements must not replace newer samples in the status panel.
- [ ] Customize opening/closing checklist drafts before use. Execute checks, document failures and assign corrective tasks. Review retained results and evidence.
- [ ] Create/assign a maintenance task, record progress/photo and complete/reopen it. Progress/evidence is retained.
- [ ] Confirm supervisors review confidential incident submissions. Operators receive a reference but cannot read restricted incidents. No external notification is sent; use facility emergency/reporting procedures.
- [ ] Upload/view/download a procedure and test its access classification. Task notes are shared operational data; use restricted incidents for sensitive narratives. Restricted progress photos redact their file metadata for lower roles.
- [ ] Test report/date filters and CSV export. Lists page at 50 rows; exports include all filtered records.
- [ ] If migrating browser data, use its original browser/address or an exported backup. Import preserves original browser storage, skips identical records and rejects conflicts; review migrated records before reliance.

## Protect and recover records

- [ ] Assign a backup owner and protected off-device retention location. The application does not upload or schedule backups.
- [ ] From this folder, run `node tools/storage.cjs backup`. Retain only successfully verified completed `.sqlite` snapshots as backups; `.sqlite.partial` means incomplete/failed verification.
- [ ] Rehearse `node tools/storage.cjs restore "BACKUP.sqlite" "NEW-DIRECTORY"`. Restore refuses an existing target, retains accounts/files/history and revokes restored sessions.
- [ ] Start the recovered copy with a different local PORT and `AQUAOPS_DATA_DIR`, sign in and inspect records/files. The launcher refuses to silently reuse a server using another data directory. Keep the original directory intact.
- [ ] Protect the Windows account, disk and backup permissions. Database/files are not encrypted by AquaOps. Deleted document listings do not purge retained file bytes/history/backups.

## Verified scope and remaining work

Verified locally: core CRUD/authentication/roles; scheduling/coverage/replacements; inspections and corrective evidence; chemistry limits/times/reminders; maintenance progress; stock history; documents; reports/CSV; confidential incident submission; optimistic conflict protection; restart and full backup recovery. Automated and browser test details are in `AQUAOPS_PROGRESS.md`.

Before sole-system, network or production reliance: an actual owner-run off-device recovery rehearsal and independent facility/security/privacy/regulatory review remain. TLS/multi-device hosting, MFA, malware scanning, formal retention/purge rules and tamper-proof audit signatures are not implemented. Private employee identity/access are now tested; legacy trusted roles intentionally retain shared visibility. Dated recurring batches work; unattended rotations and partial-period replacement optimization remain future work. Full SQLite backups are required to retain employee requests/identity/permissions/read state; browser JSON exports are operational merges only. Run the pilot alongside required existing records until its responsible authority approves the workflow. See `AQUAOPS_RELEASE_READINESS.md`.
