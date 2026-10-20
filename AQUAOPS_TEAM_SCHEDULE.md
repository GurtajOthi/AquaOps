# Team Schedule — weekly time grid

Sign in as a manager or administrator and open **Schedule** in the operations navigation. The local fictional demo is at `http://127.0.0.1:8001/#schedule`; the actual facility uses port 8000. Launchers remain `Start-AquaOpsDemo.cmd` and `Start-AquaOps.cmd`.

## Using the calendar

- **Week** shows Monday–Sunday, with facility-workstation local clock hours on the left. **Previous week**, **Next week**, **Today** and the date picker navigate periods. In **Day** view the arrows move by one day.
- Shift blocks are positioned by local start/end clock time at 48 pixels per hour. Scroll vertically for all 24 hours. Overnight shifts split at midnight with continuation arrows; their details retain the complete original period.
- Areas have labelled pastel colours and a legend. Up to eight areas receive distinct colours; labels continue to identify areas when the palette is reused. Concurrent blocks occupy separate lanes. Very short/dense events may truncate visible text: their accessible names, hover titles and details retain the full information.
- Click a shift, or focus it with Tab and press Enter/Space, to open its details. **Edit shift** opens the existing employee/qualification-aware form in Staff. Saving continues to use server validation and optimistic conflicts. Return to Schedule to see the saved block; date, view and employee/area filters persist within the signed-in session.
- Dashed, striped **⚠ Needs coverage** blocks show the actual unfilled intervals and headcount. Click one to open **Intelligent Shift Recommendations** with its parent coverage requirement selected. The existing recommendation workflow reviews the full configured coverage period; it does not silently create a new partial-period requirement. Offers and approvals retain the existing server checks.
- Pending employee coverage requests are marked **↗ Coverage requested** on assigned shifts. Open details and choose **Review requested replacement →** to select that request in recommendations.
- **Employee** filters assigned shifts. Gap warnings remain facility-wide and explicitly say so, because an unfilled position does not belong to that employee. **Area** filters both assignments and gaps; areas with only a coverage requirement remain selectable.
- **Export displayed schedule CSV** exports unique filtered assignments with their original full periods, including overnight shifts only once. Gap warnings are not assignments and are not exported as staff shifts.
- **Refresh schedule** reloads current saved records and approval results. Failed loads show a retry action. Invalid dates and empty filters show explicit messages without changing records.

On phones, the week grid scrolls horizontally inside its own container while the time gutter stays visible. **Day** view is a practical alternative. The **Accessible agenda** below the grid lists complete event information and equivalent action buttons. Native shift-detail dialogs support keyboard focus and Escape to close. Status wording, dashed borders and symbols supplement colour.

## Coverage status and crowded days

Unfilled gaps are red; active or starting-soon gaps carry stronger urgency labels. Pending offers and accepted offers awaiting approval are orange. Saved approved replacements show a green status label while retaining their normal area colour. Historical uncovered periods are muted. Labels/patterns supplement colour; an offer does not count as coverage.

Supervisors can save **Coverage urgency settings** (0–10,080 minutes; default 120). Zero means active-only critical priority. Actual facility staffing requirements and response procedures still require authorized review.

Blocks expand into unused overlap lanes. Busy days get additional width and an **Expand day** action. Compact initials retain full accessible labels and hover/focus previews; Escape dismisses a preview. The accessible agenda remains an equivalent route to event details and recommendations.

## Local time and daylight saving

This application retains its existing `YYYY-MM-DDTHH:mm` facility-local storage and backend. Configure the workstation/browser timezone correctly; no automatic remote facility timezone conversion or data migration has been introduced.

The grid deliberately uses **local clock coordinates**, not a fixed 24-hour elapsed-millisecond calculation. Day/week navigation advances calendar dates. On daylight-saving transition days it marks skipped/repeated clock bands and identifies the day's actual elapsed hours. A shift spanning the spring transition can occupy two clock hours but have one elapsed hour; its detail panel reports the elapsed duration. A fall span from 00:30 to 02:30 can span three elapsed hours, and the detail panel reflects that.

An endpoint inside a repeated hour has no stored UTC offset to distinguish the first and second occurrence. An endpoint in a skipped hour does not exist. Such records remain visible at their saved clock coordinates, marked for review; the detail panel does not invent an elapsed duration. This interface does not resolve that missing historical information or establish payroll/labor compliance. Review affected records with the facility authority before reliance. Toronto 23-/25-hour cases and ambiguous/nonexistent endpoint handling have automated model and browser coverage.

## Verification

- `node --test tests/*.test.js`: **87 passed**, including four calendar model tests for Monday/date boundaries, minute positions, overnight splitting, overlap lanes and Toronto daylight-saving behavior.
- `node tests/browser-calendar.cjs`: geometry, lane placement, navigation, filters, unique CSV rows, keyboard activation, saved editing, exact coverage selection, loading/empty/error/retry states, mobile overflow/scroll/day view, DST-spanning and ambiguous records, and employee access boundaries.
- All six browser suites passed, including existing operations/accounts/private employee/custom chemistry/recommendation-to-approval regressions. The 2,001-record responsive/restart/recovery smoke also passed. Browser tests require configured Playwright and an installed browser as described in README.
- Manager home and employee portal layouts were preserved; no real operational records were used in tests. Existing actual and demo databases were backed up and retained without reseeding.

Native dialogs, labels, focus and responsive checks are verified behaviors, not a substitute for independent accessibility, privacy, security or municipal operational review.
