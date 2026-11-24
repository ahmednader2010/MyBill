# MyBill Data Model and Business Data

This document describes the persisted data model and domain rules for MyBill. The SQL migrations in `migrations/` are the schema source of truth. If this document conflicts with a migration or live schema, inspect the migrations and verify the deployed schema before changing anything.

## Application data ownership

- Data is user-scoped through `user_id`.
- `hatchable.toml` configures `read = "own"` and `write = "own"` for the application tables.
- Backend queries must continue to scope reads and writes to the authenticated user's identity.
- Never broaden table access or trust a client-supplied user ID.

## Tables

### `bills`

Primary record for a bill, subscription, recurring payment, or session-based package.

Initial columns from `001_bills.sql`:
- `id`: UUID primary key.
- `user_id`: owner identifier.
- `name`: required display name.
- `amount`: numeric amount.
- `currency`: required, defaults to USD.
- `category`: category text/reference label used by the application.
- `frequency`: required frequency/type. The application supports monthly, quarterly, yearly, weekly, one-time, custom interval, and `session_based`.
- `due_date`: SQL DATE, not a timestamp.
- `due_day`: optional day-of-period value.
- `reminder_enabled`: defaults true.
- `notes`: optional notes.
- `created_at`, `updated_at`: timestamps.

Additional columns added by later migrations and application evolution include:
- lifecycle: `status`, `end_date`, pause/resume state and related scheduling fields (inspect the relevant migration before changing these);
- payment follow-up: snooze/remind-after state;
- payment method: `payment_method_id`, `payment_method_name`, `payment_card_last4`, `subscription_id`;
- session billing: `session_target`, `session_count`, `session_weekdays`, `session_next_date`, `session_cycle`, `session_payment_timing`, `session_schedule_start`.

Do not assume this list is a complete live column inventory. Read all migrations and relevant API queries before schema work.

### `bill_categories`

User-owned categories and subcategories:
- `id`: UUID primary key.
- `user_id`: owner.
- `name`: category name.
- `parent_id`: optional self-reference; deleting a parent cascades to children.
- `is_default`: marks seeded/default categories.
- timestamps.

A unique index prevents duplicate category names for the same user and parent. User-deleted defaults must not silently reappear.

### `bill_category_settings`

User-specific category preferences/settings. Inspect its creation migration and API usage before changing it.

### `bill_payment_methods`

User-owned payment methods:
- `id`: UUID primary key.
- `user_id`: owner.
- `name`: display name.
- `type`: defaults to `other`.
- `card_last4`: optional last four digits only.
- `is_default`: default-method flag.
- timestamps.

Bills may reference a payment method and may retain a payment-method name/card suffix snapshot.

### `bill_sessions`

Ledger of individual session events for session-based bills:
- `id`: UUID primary key.
- `user_id`: owner.
- `bill_id`: associated bill.
- `session_date`: SQL DATE.
- `status`: application statuses include completed, postponed, and cancelled; planned/missed schedule occurrences may be derived by the tracker rather than stored as completed events.
- `note`: optional note.
- timestamps.
- `cycle`: payment/package cycle number, default 1.
- `source`: source marker, default manual.

Indexes include bill/user/date lookup and a unique constraint allowing at most one row per bill, user, and session date.

## Session-based billing rules

A session-based bill represents a package/payment rule. `bill_sessions` is the historical event ledger.

- Actual sessions are entered by the user; the application must not invent completed attendance.
- Only `completed` sessions count toward the package target.
- Postponed and cancelled sessions do not count as completed sessions.
- `session_target` is the number of completed sessions in a package.
- `session_count` is the current cycle's completed count.
- `session_cycle` identifies the active package cycle.
- `session_payment_timing` supports `first_session` and `last_session` payment behavior.
- Payment/cycle advancement must preserve historical session rows.
- The first newly logged session after the previous package has been completed and the next package is due/paid belongs to the new cycle. Do not use calendar-month boundaries as a substitute for package/payment boundaries.
- Editing a historical session must not trigger a payment or advance a cycle again.
- Viewing, editing, and deleting session records must be scoped to the selected payment cycle. Default view is the current cycle.
- Deleting a log must not silently reverse an already-recorded payment.

Schedule configuration includes `session_weekdays` and `session_schedule_start`. A logged off-schedule completed session may still count; it must not rewrite configured weekdays.

## Dates and time

- Bill due dates and session dates are calendar dates (SQL DATE / `YYYY-MM-DD`), not instants.
- Do not round-trip date-only strings through timezone-sensitive JavaScript Date conversions that can shift the day.
- Timestamps such as `created_at` and `updated_at` are instants and should be treated separately from date-only fields.

## Reminders and payments

- Initial reminder: 24 hours before due date.
- Unpaid follow-ups: daily starting the day after due date.
- A user-selected remind-after/snooze temporarily replaces the daily chain; after it fires, normal follow-up resumes.
- Respect bill status, `reminder_enabled`, and `end_date`.
- Email and OneSignal push are both part of the reminder flow.
- Pause freezes the recurring cycle and cancels reminders; resume shifts the due date by the number of calendar days paused.

## Related files

- Schema: `migrations/*.sql`
- User/table access: `hatchable.toml`
- Bill APIs: `api/bills/`
- Session APIs: `api/sessions/`
- Reminder delivery: `api/reminders/send.js`
- Category APIs: `api/categories/`
- Payment methods: `api/payment-methods/`
- Push: `api/push/`, `public/onesignal.js`

## Schema-change procedure

1. Inspect all relevant migrations and API queries.
2. Add a new numbered migration; do not rewrite an already-applied migration.
3. Preserve user ownership and existing data.
4. Update this document when the data model or business rules change.
5. Test both new records and existing/historical records.
