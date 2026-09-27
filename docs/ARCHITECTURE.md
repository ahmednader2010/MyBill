# MyBill Architecture

This document is a compact map for developers and coding agents working on MyBill.

## Runtime

MyBill is a Hatchable-hosted web application.

- Frontend: `public/index.html`
- Backend: JavaScript server functions in `api/`
- Database: Hatchable PostgreSQL
- Schema history: `migrations/*.sql`
- Auth: Hatchable email auth
- AI: Hatchable/OpenAI integration for category suggestions
- Push: OneSignal Web SDK v16
- PWA: web manifest + service worker

## Repository layout

```
/
├── api/
│   ├── bills/
│   ├── categories/
│   ├── payment-methods/
│   ├── push/
│   ├── reminders/
│   ├── sessions/
│   └── events-token.js
├── migrations/
├── public/
│   ├── index.html
│   ├── login.html
│   ├── onesignal.js
│   ├── OneSignalSDKWorker.js
│   ├── manifest.json
│   └── theme.css
├── hatchable.toml
├── README.md
└── CLAUDE.md
```

## Bill lifecycle

A normal bill is created through `api/bills/create.js`.

The bill may then be:
- listed through `api/bills/list.js`
- edited through `api/bills/update.js`
- paused/resumed through `api/bills/pause.js`
- reminder enabled/disabled through `api/bills/toggle.js`
- marked paid or snoozed through `api/bills/payment.js`
- deleted through `api/bills/delete.js`

Recurring bills calculate a future due date after payment. Reminder scheduling is coupled to the due date and must be kept consistent with that lifecycle.

## Reminder lifecycle

### Initial reminder

The initial reminder is scheduled for 24 hours before the bill due date.

### Follow-up

`api/reminders/send.js` sends the reminder and schedules the next daily follow-up when appropriate.

### Snooze

`api/bills/payment.js` handles a user-selected reminder delay. The selected duration is measured from the current time. The scheduled task uses the same reminder endpoint, so normal follow-up behavior resumes after the snoozed reminder fires.

### Hard stop

If `end_date` is set, reminder scheduling must not continue beyond that date.

## Session billing

Session-based bills use:
- `bill_sessions` for individual completed session records
- `session_target` for the number of sessions in a package
- `session_count` for the current cycle
- `session_cycle` for the current package/cycle
- `session_payment_timing` for first-session vs last-session payment behavior

Actual sessions are manually logged by the user.

## Category system

Category APIs:
- `api/categories/list.js`
- `api/categories/save.js`
- `api/categories/delete.js`
- `api/categories/suggest.js`

The suggestion endpoint uses the configured AI provider to match a bill name to the user's available categories.

## Payment methods

Payment-method APIs:
- `api/payment-methods/list.js`
- `api/payment-methods/save.js`
- `api/payment-methods/delete.js`

Bills may reference a payment method and subscription/reference ID.

## Push notifications

OneSignal integration has three layers:

1. `public/onesignal.js`
   - single wrapper around the OneSignal Web SDK
   - initialization
   - login/external ID
   - subscription state
   - opt-in/opt-out
   - registration verification

2. `public/index.html`
   - loads the official OneSignal Web SDK
   - uses the wrapper for application behavior
   - owns the notification settings button

3. `api/push/`
   - returns public OneSignal configuration
   - sends a server-side test push using the secret REST API key

The REST API key must remain server-side.

## Data ownership

The Hatchable configuration uses `own` access for the application tables. Backend functions should continue to query/update using the authenticated user's identity.

Never broaden data access to make development easier.

## Date handling

Bill dates are date-only strings. Frontend calendar comparisons must compare normalized date-only strings.

Avoid timezone-sensitive conversions for due dates.

## Change hotspots

| Requirement | Primary files |
|---|---|
| Bill CRUD | `api/bills/*.js`, `public/index.html` |
| Reminder timing | `api/bills/create.js`, `api/bills/update.js`, `api/bills/payment.js`, `api/reminders/send.js` |
| Calendar dates | `public/index.html` |
| Session billing | `api/sessions/*.js`, `api/bills/payment.js`, `migrations/008_session_billing.sql`, `migrations/009_session_payment_timing.sql` |
| Categories | `api/categories/*.js`, `migrations/004_categories.sql`, `migrations/005_category_defaults.sql` |
| Payment methods | `api/payment-methods/*.js`, `migrations/007_payment_methods_and_subscription.sql` |
| Push | `public/onesignal.js`, `public/index.html`, `api/push/*.js`, `api/reminders/send.js`, `public/OneSignalSDKWorker.js` |
| Auth/data ownership | `hatchable.toml`, every authenticated API function |
| Schema | `migrations/*.sql` |

## Verification checklist

For changes affecting bills:
- create a bill
- edit a bill
- confirm the calendar shows the exact selected date
- confirm recurring behavior
- confirm reminder enabled/disabled behavior
- confirm payment/snooze behavior

For changes affecting reminders:
- verify 24-hour initial timing
- verify daily follow-up timing
- verify snooze timing
- verify end-date behavior
- verify email and push paths

For changes affecting sessions:
- log a completed session
- confirm the count increments
- confirm the payment timing rule
- confirm previous cycle history remains visible

For changes affecting notifications:
- verify OneSignal initializes once
- verify the current subscription state
- verify enable/disable button text
- verify push delivery on a subscribed device

## Important non-goals

Using Claude Code to develop this repository does **not** mean the application itself should call Claude.

Do not add Anthropic/Claude API credentials, SDKs, or runtime calls unless the user explicitly requests an in-app Claude feature or an AI-provider migration.
