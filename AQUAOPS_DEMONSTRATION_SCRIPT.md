# AquaOps fictional demonstration

Local walkthrough, 19 October 2026. All people, credentials, readings, incidents and files in this scenario are fictional. It demonstrates recorded workflows, not regulatory compliance or verified pool safety.

## Prepare once

Run **Start-AquaOpsPresentation.cmd** and open http://127.0.0.1:8002. This uses `demo-data/presentation/run-UUID/`, independently of the real facility on 8000 and the retained ordinary demo on 8001. Confirm the yellow Demo Mode banner before entering anything.

Use `demo.manager`; the demo-only password is `AquaOps-Demo-2026!`. The administrator account is `demo.admin`. Candidate cards show the matching fictional employee login. Never reuse these credentials in a real facility.

Use separate browser profiles/private windows for manager and employee. Two ordinary tabs share a login. Local ports also share the host's session cookie name: signing into another local instance in the same browser profile can require signing in again. This does not grant access to the other database. For a single-window presentation, explicitly sign out and switch roles at steps 6, 7 and 10.

## Ten-step walkthrough (about ten minutes)

| Step | Action | What to demonstrate |
| --- | --- | --- |
| 1 | Sign in as `demo.manager` | Original compact manager dashboard and visible fictional mode. |
| 2 | Review Staff Roster, Maintenance Schedule, Pool Status and Facility Logs | Saved staffing, overdue work, labeled illustration, timestamped chemistry and configured-limit warning. Schedule is not attendance; the warning is not a safety determination. |
| 3 | Open Schedule; navigate to the date of **Demo Coverage Drill** (three days after generation creation) | Red dashed unfilled block, area labels, accessible agenda. Click the gap. The recommendations selector defaults to the drill when it is still open. |
| 4 | Review ranked employees and expand qualification/rest/scoring details | Mandatory eligibility checks precede deterministic workload/preferences scoring. Excluded candidates retain reasons. No generative AI or external service is used. |
| 5 | Add fictional notes and send one eligible candidate a coverage offer | Record the recipient login printed on the card. Schedule remains unfilled; calendar status becomes orange pending. |
| 6 | Sign in as that employee; Requests → offer → Accepted → Respond to offer | The confirmation explicitly says acceptance awaits supervisor approval and has not assigned the shift. |
| 7 | Return as manager; Action Required → Awaiting approval for the drill | Open the related workflow, review the accepted offer, choose Approved, enter the decision reason, and Save decision. Server rechecks current eligibility and capacity. |
| 8 | Open Schedule on the drill date | The red gap disappears. The saved assignment retains its area colour and shows a green Approved replacement label. The underlying issue also disappears from Action Required. |
| 9 | Return to Dashboard / Pool Operations and Tasks | Review chemistry history/limits, maintenance progress/photos, corrective actions and responsible records. Only enter fictional observations; do not imply that a saved value verifies a safe pool. |
| 10 | Return as the recipient; My Schedule | The new drill assignment appears in the appropriate week and upcoming assignments. My Dashboard also shows the next shift. |

Optional extensions: save an incomplete Facility Setup draft, navigate away and resume it without applying live settings; review a failed inspection and its linked corrective task; view the sample approved document; inspect stock history or export a filtered report. Authorized headguard operations are available through `demo.employee`.

## Replay safely

An accepted or approved drill is retained. To replay with fresh relative dates, stop **only** the presentation process ID printed by its launcher, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-AquaOpsDemo.ps1 -Presentation -Reset
```

Reset changes the presentation manifest to a new generation and retains the prior directory. It does not reset the ordinary demo or real facility. The launcher refuses reset while its preview responds. Do not stop unrelated Node processes. Ordinary launch reuses the current presentation; it does not reset it. If a long-retained scenario has ended, create a fresh presentation generation before a demonstration.

Foreground alternative: `node tools/demo.cjs start --presentation`. Keep the terminal open. Use `node tools/demo.cjs reset --presentation` only after stopping that presentation server.

## Supported capabilities and boundaries

- Private linked employee portal; server-enforced role boundaries; administrator-created local accounts.
- Saved scheduling/availability/leave, coverage gaps and configurable urgency, explainable candidates, offers, acceptance and audited supervisor approval.
- Action Required filtering/read state/direct workflows; in-app announcements and permission-aware Quick Actions.
- Reviewed chemistry ranges/history/charts, inspections/evidence/correctives, maintenance/equipment, protected incidents/documents, stock history and filtered reports/CSV.
- Guided setup drafts, persistent SQLite records and verified snapshots restored into new directories with restored sessions revoked.

One facility per database, workstation-local dates, no hosted multitenancy, no external invitations/messages, no independent credential verification, no formal compliance certification. Operating-hours/category setup notes are not an enforced policy engine. Network deployment, retention, independent security/accessibility/safety review and protected off-device recovery remain prerequisites for broader use.
