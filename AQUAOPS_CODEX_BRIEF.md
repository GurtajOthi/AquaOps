# AquaOps — Development Handoff for Codex

## Purpose
Continue building **AquaOps**, a professional pool operations platform for aquatic facility managers and lifeguard supervisors. Build on the **actual code in this repository**, not a new unrelated prototype. The owner wants you to implement, test, and improve the application autonomously while they are away.

## Prior project context
The project began as an iterative dashboard prototype and evolved into a connected local facility application. The information below summarizes early planning, not a verified current audit; inspect the current source, tests and release documentation first.

### Prior design direction
- A polished, clean, responsive SaaS-style dashboard inspired by a reference image chosen in the original discussion.
- Light visual style, blue/teal accents, rounded cards, clear tables, navigation, restrained icons and badges.
- Primary navigation: Dashboard, Tasks, Reports, Documents, Inventory.
- Past UI concepts include an overview/KPI card area, staff roster, maintenance schedule, pool condition/status metrics, and facility logs.
- Keep the existing visual design wherever possible; don't replace it with a generic template.

### Prior implementation / repository clues (must verify)
- Previously worked with `frontend/index.html`, `frontend/style.css`, and JavaScript, with a Python backend discussed under `backend/` and/or `main.py`.
- The exact file structure, implemented features, routes, and backend state must be determined by examining the repository; older discussions included alternative Streamlit prototypes, which are not a mandate to migrate the current application.
- Some tasks and buttons may have been implemented or prototyped already. Inspect before rewriting.

## Operating instructions
1. Survey the repository. Identify the actual stack, entry points, existing pages/components, persistence, configuration, tests, and any repository-specific instructions (including `AGENTS.md`).
2. Summarize what works vs. what's stubbed or broken, then **begin implementing**, rather than stopping to ask what to do first.
3. Use existing conventions and minimize unnecessary dependencies or architectural rewrites.
4. Before substantial edits, protect existing work: inspect Git status and create a safe checkpoint/branch if appropriate. Never overwrite uncommitted user changes.
5. Implement in small coherent increments. Run appropriate checks after each increment and fix issues you introduce.
6. Continue through the priority list autonomously while time/context allows. Make reasonable reversible decisions. Only pause for genuine blockers or required authorizations.
7. Do not deploy, publish, spend money, expose secrets, remove important user data, or alter files outside AquaOps. Do not invent credentials or services.
8. Keep a concise development log in `AQUAOPS_PROGRESS.md`: features added, files touched, commands/tests and outcomes, current blockers, next steps. Don't pretend untested features are verified.

## Prioritized roadmap
### Priority 1 — Stabilize the existing app
- Identify and fix broken links, console/runtime errors, UI inconsistencies, and dead controls.
- Make Dashboard/Tasks/Reports/Documents/Inventory navigation work with the repository's chosen architecture.
- Ensure reasonable mobile and desktop responsiveness and accessible labels/controls.

### Priority 2 — Useful working MVP features
- **Tasks**: add/edit/complete/reopen/delete with status, priority, due date, and owner where sensible.
- **Dashboard**: reflect real current task and operations data, rather than hard-coded numbers where feasible.
- **Reports / logs**: structured entry and filtering/viewing of facility incidents, maintenance, or inspections, with basic export only if fitting the current stack.
- **Documents**: useful document metadata/listing, categorization and retrieval flow; avoid fake upload functionality if no storage implementation exists.
- **Inventory**: track supplies/equipment, quantities, restock thresholds, and changes where practical.
- Choose a straightforward local persistence option compatible with the existing app for MVP functionality. Make it clear if storage is demo/local-only.

### Priority 3 — Aquatics-specific enhancements
- Pool-status and basic chemistry/inspection log UX, with clear timestamps and units; do not claim regulatory compliance without verified jurisdiction-specific requirements.
- Staff roster and certification tracking, including expiry alerts.
- Shift coverage visibility and scheduling tools, introduced incrementally after the core app works.
- Maintenance reminders and facility operations workflows.

### Priority 4 — Polish and quality
- Preserve the established visual identity, use consistent icons, loading/empty/error states, responsive layouts, and realistic example data where needed.
- Add tests to match the app's stack where practical. Verify navigation, core CRUD workflows, persistence, and no obvious browser/terminal errors.

## Completion report
When work stops, report: (1) features actually completed; (2) files changed; (3) tests run with results; (4) anything blocked or still mocked; (5) top next steps. Update `AQUAOPS_PROGRESS.md` so a future Codex session can pick up without starting over.
