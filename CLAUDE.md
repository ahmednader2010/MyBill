# MyBill — Claude Code Project Guide

## Project identity

- App: **MyBill**
- Live app: https://mybill.hatchable.site
- GitHub: https://github.com/ahmednader2010/MyBill
- Platform/runtime: **Hatchable**
- Frontend: single-page HTML + Alpine.js + Tailwind CDN
- Backend: Hatchable server functions under `api/`
- Database: Hatchable PostgreSQL tables + SQL migrations under `migrations/`
- Authentication: Hatchable email authentication
- Current in-app AI provider: **OpenAI through Hatchable**. Do not replace it with Anthropic/Claude unless the user explicitly asks for an AI-provider migration.

## Primary instruction

Treat the existing application as production-like and preserve working behavior.

**Investigate before editing.** Read the relevant files and trace the existing flow before making a change. Do not guess about code that has not been inspected.

**Make the smallest targeted change that solves the request.** Do not refactor unrelated code, rename working APIs, change the database model unnecessarily, or replace working libraries.

After a code change:
1. Re-read the changed code.
2. Check the affected flow and related callers.
3. Run any available validation/checks.
4. Review the diff for unintended changes.
5. Commit the change with a clear message when working through Git.
6. If deployment is requested, verify the deployment separately. Never claim a Hatchable deployment succeeded unless it was actually verified.

## Current architecture

### Frontend

The main UI is `public/index.html`.

It contains the Alpine.js application state and most UI behavior. External libraries are loaded from CDNs.

Important frontend files:
- `public/index.html` — main application UI and Alpine app
- `public/login.html` — authentication page
- `public/theme.css` — application styling
- `public/manifest.json` — PWA metadata
- `public/OneSignalSDKWorker.js` — OneSignal service worker
- `public/onesignal.js` — centralized OneSignal wrapper
- `public/mybills-logo.svg` — app icon/logo

### Backend

Hatchable API functions are grouped by feature:

- `api/bills/` — create, list, update, delete, pause/resume, payment state, reminder toggle
- `api/categories/` — list, save, delete, AI category suggestion
- `api/payment-methods/` — list, save, delete
- `api/sessions/` — session-based billing history
- `api/reminders/send.js` — scheduled email/push reminder delivery
- `api/push/` — OneSignal configuration and test push
- `api/events-token.js` — event integration

Use Hatchable's `hatchable` package and its existing auth/database/scheduler APIs. Do not introduce a second backend framework.

### Database

Database schema changes are represented by numbered SQL files in `migrations/`.

Current major tables include:
- `bills`
- `bill_categories`
- `bill_category_settings`
- `bill_payment_methods`
- `bill_sessions`

User-owned data must remain scoped to the authenticated user. Preserve the existing Hatchable table access rules in `hatchable.toml`.

## Critical business rules

### Dates

Bill due dates are date-only values (`YYYY-MM-DD`), not timestamps.

**Do not convert a bill date through `new Date("YYYY-MM-DD")` and then use `toISOString().slice(0,10)`.** That can shift the displayed calendar day because of timezone conversion.

The frontend deliberately uses local date helpers such as `localDateKey()` and `dateOnly()`. Preserve this behavior.

### Reminders

Current intended behavior:
- Main bill reminder: **24 hours before the due date**.
- If the bill remains unpaid, follow-up reminders continue **daily starting the day after the due date**.
- If the user chooses **Remind me after X days**, that scheduled reminder temporarily replaces the daily chain; after it fires, the daily follow-up behavior resumes.
- Reminder scheduling must respect bill status, reminder_enabled, and end_date.
- Both email and OneSignal push are part of the reminder flow.

Be careful when modifying `api/reminders/send.js`, `api/bills/create.js`, `api/bills/update.js`, or `api/bills/payment.js`.

### Pause/resume

Pausing a recurring bill freezes its cycle and cancels its reminder. Resuming shifts the due date forward by the number of calendar days paused.

### Session-based billing

Session-based bills are manually logged; the app does **not** automatically invent or schedule completed sessions.

- Completed sessions count.
- Postponed/cancelled sessions do not count.
- A package can be paid on the first session or on the last required session.
- Payment starts the next cycle while preserving previous session history.
- `bill_sessions` stores the history.

Do not remove old session history when advancing the cycle.

### Categories

Categories and subcategories are user-editable. Deleted defaults must not silently reappear.

### OneSignal

OneSignal is already integrated for Web Push/PWA.

**Keep all direct OneSignal SDK calls inside `public/onesignal.js`.** Do not add a second `OneSignal.init()` elsewhere.

The current notification button must reflect the actual subscription state:
- opted in → `Disable notifications`
- not opted in → `Enable notifications`

Disabling the app subscription does not revoke the iOS system permission.

Do not commit OneSignal API keys or other secrets. Secrets belong in Hatchable configuration.

## Hatchable configuration

`hatchable.toml` defines authentication, AI provider configuration, user-owned database access, and OneSignal secrets.

Never hardcode secret values in source code.

The OneSignal App ID is public configuration; the OneSignal REST API key is server-side secret material and must not be exposed in frontend code.

## Deployment and source control

GitHub repository:
https://github.com/ahmednader2010/MyBill

Hatchable is the application deployment environment.

GitHub and Hatchable are separate concerns:
- A Git commit does not by itself prove a Hatchable deployment happened.
- A Hatchable deployment does not by itself prove GitHub was updated.
- When the user asks to push changes, update GitHub.
- When the user asks to deploy, deploy through the available Hatchable workflow and verify the resulting version/status.

## Safety rules for changes

Before changing a working feature, identify its callers and data flow.

Do not:
- expose secrets
- change authentication ownership rules casually
- bypass user ownership checks
- replace date-only handling with timezone conversions
- duplicate OneSignal initialization
- delete historical session records as part of ordinary cycle/payment operations
- change reminder timing without explicitly checking all reminder scheduling paths
- add an Anthropic API integration just because Claude Code is being used to develop the project

If a requested change conflicts with an existing business rule, explain the conflict and make the requested behavior explicit before changing unrelated behavior.

## Useful first investigation

For a new task, inspect:
1. `CLAUDE.md`
2. `README.md`
3. the relevant frontend section in `public/index.html`
4. the relevant API function(s)
5. the related migration(s)
6. `hatchable.toml`
7. recent Git history/diff

For reminder or payment work, inspect all of:
- `api/bills/create.js`
- `api/bills/update.js`
- `api/bills/payment.js`
- `api/reminders/send.js`

For notification work, inspect:
- `public/onesignal.js`
- `public/index.html`
- `api/push/config.js`
- `api/push/test.js`
- `public/OneSignalSDKWorker.js`

## Claude-specific workflow

Claude Code should prefer direct repository investigation and implementation over speculative advice.

When a task is large:
- make a short plan,
- implement incrementally,
- verify each affected flow,
- keep progress in repository files only when it materially helps continuation.

Do not create temporary scripts or abstractions unless they are actually useful to the project. Remove scratch files before finishing.

The goal is a maintainable MyBill codebase, not a Claude-specific rewrite.
