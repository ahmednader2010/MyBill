# MyBill — Reusable Development Skills and Workflows

This file defines repeatable task procedures for any coding assistant or developer. These are project-specific playbooks, not vendor-specific agent syntax.

## 1. Feature implementation

Use for adding a UI feature, API capability, or application behavior.

1. Identify the user-visible outcome and acceptance criteria.
2. Inspect `README.md`, `instructions.md`, `data.md`, and `docs/ARCHITECTURE.md`.
3. Trace the relevant UI state, API endpoints, database tables, and callers.
4. Identify authentication, user ownership, date handling, and payment/reminder side effects.
5. Make the smallest coherent implementation.
6. Add a migration only if the persisted schema must change.
7. Test success, validation failures, authorization failures, and existing behavior.
8. Update documentation and report exactly what was and was not verified.

## 2. Bill lifecycle and payment changes

Relevant files: `api/bills/`, `public/index.html`, and relevant migrations.

1. Trace create, list, update, payment, pause/resume, reminder toggle, and delete paths as applicable.
2. Check recurring frequency calculations and date-only handling.
3. Check reminder scheduling/cancellation and payment state transitions.
4. Preserve payment method references and user ownership.
5. Verify one-time, recurring, paused, ended, paid, and unpaid cases as applicable.
6. Never alter reminder timing or payment semantics as an incidental refactor.

## 3. Reminder troubleshooting

Relevant files:
- `api/bills/create.js`
- `api/bills/update.js`
- `api/bills/payment.js`
- `api/reminders/send.js`
- `api/push/`
- `public/onesignal.js`

Procedure:
1. Trace initial scheduling (24 hours before due date).
2. Trace daily follow-up (starting the day after due date while unpaid).
3. Trace remind-after/snooze replacement and resumption of the daily chain.
4. Check reminder_enabled, bill status, end_date, and task cancellation.
5. Verify both email and push delivery paths.
6. Do not test by sending real notifications to users without explicit approval.

## 4. Session-based billing changes

Relevant files: `api/sessions/`, related `api/bills/` payment logic, `public/index.html`, and migrations 008–010 plus later migrations.

Procedure:
1. Treat the bill as the package/payment rule and `bill_sessions` as the historical event ledger.
2. Distinguish actual completed records from derived planned/missed occurrences.
3. Count only completed sessions toward `session_target`.
4. Respect `session_payment_timing` (first session or last required session).
5. Treat cycle boundaries as package/payment-based, never as automatic calendar-month boundaries.
6. Preserve all previous cycle records.
7. Default the tracker to the current cycle; scope historical browsing, editing, and deletion to the selected cycle.
8. Ensure editing a prior record does not trigger payment again or advance a cycle.
9. Ensure deleting a log does not silently reverse payment history.
10. Verify off-schedule completed sessions do not change configured weekdays.

## 5. Date and calendar changes

1. Identify whether each value is a date-only value or a timestamp.
2. Preserve `YYYY-MM-DD` values for bill due dates and session dates.
3. Avoid timezone-sensitive conversion of date-only strings.
4. Test dates around month boundaries, year boundaries, and timezone offsets.
5. Check calendar display, sorting, due-date summaries, and reminders.

## 6. Category and payment-method changes

Categories:
1. Inspect list/save/delete/suggest APIs.
2. Preserve parent-child relationships and user ownership.
3. Do not recreate user-deleted default categories unexpectedly.
4. Test duplicate names and deletion behavior.

Payment methods:
1. Inspect list/save/delete APIs and bill references.
2. Preserve card privacy; store/display only last four digits where applicable.
3. Check default method behavior and existing bill snapshots.
4. Avoid deleting a method in a way that corrupts bill history.

## 7. OneSignal and PWA troubleshooting

Relevant files:
- `public/onesignal.js`
- `public/OneSignalSDKWorker.js`
- `public/index.html`
- `api/push/`
- `api/reminders/send.js`

Procedure:
1. Keep a single SDK initialization path in `public/onesignal.js`.
2. Check public App ID configuration and server-side REST API key configuration separately.
3. Verify actual subscription state before changing UI labels.
4. Check service worker registration and browser/PWA context.
5. Test on the target device/browser when possible.
6. Never expose the REST API key.

## 8. Database migration workflow

1. Inspect current migrations and every API query using the affected table.
2. Add a new sequential migration file.
3. Make the migration safe for the expected existing data.
4. Preserve indexes, uniqueness, foreign keys, and user ownership.
5. Consider backfill and rollback implications.
6. Update `data.md` and architecture docs.
7. Validate both fresh-install and existing-database behavior where possible.

## 9. Deployment and GitHub synchronization

Hatchable deployment and GitHub source control are separate operations.

1. Inspect the current project draft/source.
2. Validate changed files and run the available dry run.
3. Deploy through Hatchable only when requested.
4. Confirm the resulting live version/status.
5. Fetch the current GitHub file SHA before updating an existing file.
6. Push the corresponding source changes when requested.
7. Verify GitHub updates separately.
8. Never claim one operation proves the other.

## 10. Security review

For any new endpoint or integration:
1. Determine whether it is public or authenticated.
2. Validate all input server-side.
3. Enforce ownership on every data operation.
4. Keep credentials in server-side secrets/environment variables.
5. Avoid logging tokens, keys, personal data, or billing details.
6. Consider rate limiting, replay/duplicate requests, and abuse.
7. Use least-privilege permissions for external services.

## 11. Documentation maintenance

When behavior, schema, architecture, configuration, or operational workflow changes:
- update `data.md` for data model/business data;
- update `instructions.md` for durable project rules;
- update `skills.md` for reusable procedures;
- update `docs/ARCHITECTURE.md` for component relationships and file maps;
- keep `CLAUDE.md` as a concise Claude Code adapter that points to the portable documentation.

Avoid duplicating long sections across files. Link to the canonical source instead.
