# MyBill — Portable Agent Instructions

These instructions apply to any coding assistant, IDE agent, or developer working on this repository. They are intentionally agent-neutral.

## Project identity

- Product: MyBill (also referred to as MyBills in conversation).
- Live app: https://mybill.hatchable.site
- Repository: https://github.com/ahmednader2010/MyBill
- Hosting/runtime: Hatchable.
- Frontend: single-page HTML, Alpine.js, Tailwind CDN.
- Backend: Hatchable JavaScript server functions under `api/`.
- Database: Hatchable PostgreSQL; schema history under `migrations/`.
- Authentication: Hatchable email authentication.
- In-app AI: OpenAI through Hatchable configuration.
- Push notifications: OneSignal Web SDK v16.
- PWA: web manifest and service worker.

## Required reading

Before changing code:
1. Read this file.
2. Read `data.md`.
3. Read `skills.md` and choose the relevant workflow.
4. Read `README.md` and `docs/ARCHITECTURE.md`.
5. Inspect the exact frontend, API, migration, and configuration files involved.
6. Inspect recent Git changes when relevant.

The code, migrations, and runtime configuration are authoritative. Documentation is a guide and must be updated when it becomes stale.

## Core working principles

- Treat the existing app as production-like.
- Investigate before editing. Do not guess about uninspected code.
- Make the smallest targeted change that solves the request.
- Preserve existing working functionality and established business rules.
- Do not refactor unrelated areas or replace libraries without a clear reason.
- Trace callers, data flow, ownership checks, and side effects before modifying a backend endpoint.
- Explain meaningful tradeoffs before making a change that alters business behavior.
- Do not claim tests, browser checks, deployment, or Git synchronization unless actually performed and verified.

## Safety and data integrity

- Never expose secrets in frontend code, source control, logs, screenshots, or responses.
- Keep API keys and credentials in Hatchable secrets/environment configuration.
- Preserve authenticated user scoping in every user-data query and mutation.
- Never trust a client-supplied `user_id`.
- Do not weaken authentication or table ownership rules for convenience.
- Do not delete historical billing/session data as a side effect of normal cycle advancement.
- Never silently reverse a payment when editing or deleting a session log.
- Add schema changes as new numbered SQL migrations; do not rewrite migrations that may already have run.

## Critical application rules

### Date handling
Bill due dates and session dates are date-only values. Avoid timezone conversions that shift the selected calendar date. Keep date-only strings separate from timestamps.

### Reminders
- Initial reminder is 24 hours before due date.
- Unpaid follow-ups continue daily starting the day after due date.
- Remind-after/snooze temporarily replaces the daily chain; daily follow-up resumes after the snoozed reminder fires.
- Respect bill status, reminder_enabled, and end_date.
- Email and push are both part of the reminder flow.

### Pause and resume
Pausing freezes the recurring cycle and cancels reminders. Resuming shifts the due date by the number of calendar days paused.

### Session-based billing
- Sessions are manually logged.
- Only completed sessions count toward the package target.
- Postponed/cancelled entries do not count as completed.
- A package can be paid on its first session or last required session.
- The first session of the next package belongs to the next cycle after the prior package is complete and next payment is due/recorded.
- Payment cycle boundaries are package/payment-based, not calendar-month-based.
- Keep old cycle records.
- The tracker defaults to the current cycle; selecting an older cycle scopes displayed/editable/deletable records to that cycle.
- Editing an old record must not trigger payment a second time or advance the cycle.
- Off-schedule completed sessions may count but must not modify configured weekdays.

### Categories
Categories and subcategories are user-editable. A deleted default must not silently reappear.

### OneSignal
- Keep all direct OneSignal SDK calls inside `public/onesignal.js`.
- Do not initialize OneSignal a second time elsewhere.
- Keep the REST API key server-side.
- The notification settings UI must reflect actual subscription state.

### AI provider
The app currently uses OpenAI through Hatchable. Do not replace or supplement the in-app AI provider with another provider unless explicitly requested.

## Implementation and verification procedure

For every change:
1. State a short plan for non-trivial work.
2. Read relevant files and their callers.
3. Identify invariants and side effects.
4. Make a minimal change.
5. Re-read the changed code.
6. Run available syntax, validation, API, or targeted tests.
7. Review the diff for unrelated changes and secret exposure.
8. Update relevant docs.
9. Commit/push to GitHub when requested.
10. Deploy through Hatchable when requested and verify the deployed version separately.

A successful GitHub commit does not prove deployment. A successful Hatchable deployment does not prove GitHub synchronization.

## Project configuration

- `hatchable.toml` defines authentication, AI provider, user-owned table access, and secret declarations.
- Preserve its user ownership rules.
- Never commit live secret values.
- The OneSignal App ID may be public configuration; the OneSignal REST API key is secret.

## When uncertain

Do not invent schema columns, runtime capabilities, provider behavior, or business rules. Inspect the code/migrations or ask one focused clarification if the missing detail changes the implementation.
