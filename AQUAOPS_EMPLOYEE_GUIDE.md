# AquaOps employee guide

Your administrator creates an `employee` login linked to your staff record. Use that individual account; an operator/manager account has different access. Your private portal does not show colleague contacts, credentials or confidential incidents.

## My Dashboard and schedule

- **My Dashboard** shows upcoming assignments, open duties, active requests and facility announcements.
- **My Schedule** lists your shifts and a selectable week. Times use the facility workstation's local time. The schedule records assignments, not attendance.
- Approved replacements update your schedule. Pages fetch current records when opened. Use Account menu → Refresh data to reload; review unsaved entries before discarding them.

My Schedule has previous/next week and Today controls. An empty date shows a recoverable prompt. Requests defaults to eligible available periods; **Show eligibility issues** explains exclusions without allowing an invalid assignment. If a private read fails, **Retry my records** reloads it without requiring a sign-out.

Coverage requests leave your existing assignment in place until an approved replacement is saved. Accepted offers are awaiting supervisor approval; they are not assigned shifts yet. Historical superseded credentials remain visible and are distinguished from the latest recorded expiry.

## Availability and time off

- In **Availability**, add Available/Unavailable periods. Unavailability takes precedence. This can flag conflicts with an existing shift; it does not delete that shift.
- Preview a recurring availability pattern for selected weekdays over at most 90 days, then explicitly apply it. Changed inputs require a new preview. Matching existing rows are skipped.
- Edit/remove periods you personally submitted. Supervisor-entered availability and approved leave require supervisor review.
- Submit a **Time-Off Request** for approval. Pending requests do not themselves change the schedule. Follow facility procedures while awaiting approval.
- Set preferred areas and weekly hours. These help rank offers; they do not override hard eligibility or promise hours.

## Coverage and offers

In **Requests**, select one of your upcoming shifts to request coverage. Eligible configured gaps show a volunteer form. Your current recorded qualifications, availability and scheduling rules determine eligibility.

You may accept or decline an in-app offer. **Acceptance is not final approval.** A supervisor must review and approve the replacement; only then does the schedule change. Changed offer times/areas/requirements need fresh review. No external message is sent, so check the portal and follow facility communications procedures.

Request history shows status, reference and decision notes. Withdraw pending requests/offers when no longer needed. Approved records require supervisor review rather than deletion.

## Duties, credentials and documents

- **My Tasks** contains duties explicitly assigned to your identity. Record notes, completion percentage and an optional PNG/JPEG evidence photo up to 5 MB. Do not put sensitive incident details into shared task notes.
- **Certifications** shows your recorded credentials. Submit renewal details and supporting PDF/TXT/CSV/PNG/JPEG up to 5 MB for supervisor review. Submission does not grant a qualification. Only you and authorized supervisors can retrieve your submission file.
- **Documents** provides approved facility material and authorized task evidence. Unavailable documents require supervisor review; changing a URL does not grant access.

## Daily Operations

Your supervisor must explicitly authorize chemistry logging and safety checklists. Use approved procedures and actual observed measurements. Answer every checklist item; failures require notes and a corrective due date and create a supervisor follow-up task. The application does not certify compliance or safe water.

Facility-defined supplemental measurements appear with their units/ranges; record actual observations, including out-of-range values. Required values must be recorded for new entries. In **My Completed Checklists**, review your latest 20 results and attach evidence to your own checks while authorized. Evidence is a shared operational inspection document: keep private credential/employee/incident information in its appropriate confidential workflow. Older unlinked inspections remain in supervisor history rather than being attributed to you by name.

Submit maintenance concerns for review. For incidents, use the confidential form and record the minimum necessary information. Only supervisors can retrieve the report afterward; retain its returned reference. **Use facility emergency procedures for urgent situations.** The application sends no emergency or external notification.

## Alerts and account

**Alerts** provides category/severity/read filters and links to related workflows. Marking an alert read does not resolve its underlying issue. Announcements and changed assignments can generate in-app alerts.

The compact **+ New** menu opens relevant forms. In Account menu you can refresh, change your password or sign out. Sessions last up to eight hours and clear cached records/unsaved forms on expiry or revocation. Finish one entry at a time and sign out on shared workstations.

Your dashboard refreshes during idle minute/focus checks; drafts and open workflows pause data replacement. Marking employment Inactive revokes linked employee sessions; changing a binding also revokes sessions and preserves previous identity/history in audit.

If a form reports a conflict, refresh and check what was saved before trying again. Contact an administrator if your staff link is missing/inactive; do not use another employee's login.

## Fictional demo

Open `Start-AquaOpsDemo.cmd`, then http://127.0.0.1:8001. Use `demo.employee` / `AquaOps-Demo-2026!`. The visible Demo Mode banner means all records are fictional. Use the normal launcher/port 8000 and your actual individual credentials for facility records.
