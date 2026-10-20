# Intelligent Shift Recommendations

## Where to find it

Sign in as an administrator or manager. Open any of these:

- **Dashboard → Staff Roster → Intelligent Shift Recommendations →**.
- Top operations navigation → **Shift Recommendations**.
- **Schedule → Intelligent Shift Recommendations →** below the calendar.
- **Staff → Intelligent Shift Recommendations →** at the top, or **Coverage requirements & replacements → Find replacement** on a particular requirement.
- **+ New → Find Replacement**.
- A future staffing-gap link in the dashboard coverage map opens that specific period.

The direct local route is `http://127.0.0.1:8001/#recommendations` for the fictional demo, or port 8000 for the actual facility. A supervisor login is required. Employees cannot access the underlying management/candidate APIs.

## What managers see

Choose a **Coverage period / replacement request**. The page shows dates, area, required qualifications, staffing minimum and current gap intervals. It also supports pending employee requests to replace an existing assigned shift.

Eligible employees are ranked in light AquaOps-style cards. Each card shows rank, a calculated scheduling-fit score, recorded qualification expirations, confirmed full-period availability, overlap information, configured rest/hour/area checks, weekly workload and an explanation. Expand **Qualifications, availability, rest & scoring details** for the individual results. Ineligible people are separated under **Excluded employees** and receive neither a score nor an offer button. Inactive linked accounts cannot receive offers.

Eligibility is deterministic: active staff record; qualifications valid through the shift end date; confirmed availability over the complete period; no overlapping unavailability/approved time off or assigned shift; configured minimum rest, maximum weekly hours and area eligibility. The employee who requested a replacement is excluded from that request. Ended coverage periods cannot receive new offers. These checks use saved records, not independent verification of real credentials or labor-law compliance.

Only after all mandatory checks pass is the 0–100 scheduling-fit score calculated:

| Factor | Points | Rule |
| --- | --- | --- |
| Recorded workload | 0–70 | `round(70 × max(0, 1 − scheduledHours / referenceHours))` |
| Preferred weekly hours | 0 or 20 | 20 if there is no preference or the proposed shift stays within it |
| Preferred area | 0 or 10 | 10 if there is no preference or the area matches |

Scheduled hours are clipped to the Monday-start week containing the proposed start. The workload reference is the configured weekly maximum, or 40 hours solely as a scoring reference when no maximum is configured. Hard weekly-limit checks cover every week overlapped by the proposed shift. Scores sort descending, then lower scheduled hours, then name for stable ties. A high score is not a probability, guarantee, or reason to bypass a failed check. Protected personal characteristics are not used. No generative AI, paid API or external transmission is involved.

## Offer and approval workflow

1. Enter notes on an eligible candidate and click **Send coverage offer**. An active, explicitly linked employee login is required. The saved request is **Offered**; the schedule has not changed.
2. The employee opens **Requests → My Request History**, selects **Accepted** or **Declined**, and clicks **Respond to offer**. Acceptance still does not change the schedule.
3. The manager clicks **Refresh recommendations & approvals**, then **Review offers & approvals**. An accepted offer exposes **Decision**, **Reason** and **Save decision**.
4. Select **Approved**, enter the reason and save. The transaction rechecks eligibility, request version, offered period/area/requirements and remaining capacity. It creates a shift for a coverage gap or reassigns the existing requested shift. Approval/audit history persists. Competing/stale approvals reject rather than silently overfill a place.
5. The page shows **Resolved / filled** when the requirement is met; the employee schedule includes the assignment and the related gap/pending-approval alert resolves. If a requirement needs more than one employee, additional gaps remain until filled. Declined/rejected offers remain history and do not assign staff.

The retained **Supervisor assignment without an offer** expander is the older immediate scheduling workflow. It clearly identifies that no employee response is collected; the supervisor still confirms and the API rechecks eligibility. Use the offer workflow above when acceptance is required.

## Fictional walkthrough

Launch `Start-AquaOpsDemo.cmd` and open `http://127.0.0.1:8001`. Sign in as `demo.manager`, password `AquaOps-Demo-2026!` (**demo only**).

1. Open **Shift Recommendations**. A newly seeded demo defaults to **Demo Coverage Drill**, an unfilled four-hour period three days after generation creation. It includes recorded eligible candidates and excluded cases for conflicting/unavailable/expiring records.
2. Choose a candidate, enter fictional notes and send an offer. Each demo candidate card displays its corresponding fictional employee username. In the verified 2026-10-19 seed, Avery Wilson is `demo.employee9`.
3. Use another independent browser/profile/private window for that employee, with the same demo-only password. Alternatively sign out and switch accounts in the same browser. Separate tabs in one browser profile share the session; they are not separate identities.
4. Open **Requests**, accept the offer, then return to the manager account and refresh the panel. Approve with a reason. Open **Schedule** at the displayed date and the employee's **My Schedule** to inspect the assignment.
5. For the decline path, decline an offer before approving it. The gap stays open and you can issue a new offer.

After completing the drill it is intentionally filled. To replay later, stop only the demo server (PID printed by its launcher), then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-AquaOpsDemo.ps1 -Reset
```

Reset creates a new isolated generation with dates relative to that day. Previous demo generations are retained. Never point demo tools at the actual facility directory. The actual database and accounts are unaffected.

## Verification and pilot boundary

Verified 2026-10-19: 83 automated tests; all five Edge workflow suites; the new browser suite covers discovery, ranks/scores/exclusions, phone layout, decline/re-offer/accept/approve, no pre-approval assignment, schedule changes, resolved gap alerts, and an existing-shift reassignment. The 2,001-record regression also checks restart/full recovery. Live in-app-browser demonstration additionally completed offer/accept/approval against fictional data. Manager three-column geometry and private employee dashboard regressions pass.

Tests: `node --test tests/*.test.js`, `node tests/browser-recommendations.cjs` (requires configured Playwright and installed browser; see README). Fixture databases and screenshots stay under ignored test paths.

This is a local single-facility workflow, not municipal-pilot approval. Actual certification/availability accuracy, adopted rest/hour policies, privacy/security/accessibility review and owner-run protected recovery rehearsal remain necessary. The software does not certify safe staffing, legal compliance or real attendance.
