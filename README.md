# MyBill

Personal bill, payment, reminder, and session-based billing app built with Hatchable.

## Source of truth

This repository contains the MyBill Hatchable source. Secrets are configured in Hatchable and are not stored in this repository.

## Portable project knowledge

These files are the agent-neutral knowledge base. Read them when working on the project, regardless of which AI assistant or IDE is used:

- [instructions.md](./instructions.md) — durable project rules, safety constraints, and development procedure.
- [data.md](./data.md) — data model, business entities, and critical data/business rules.
- [skills.md](./skills.md) — repeatable workflows for common development tasks.
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — runtime architecture and application map.

## AI coding assistants

- Claude Code: also read [CLAUDE.md](./CLAUDE.md), which acts as a Claude-specific entry point.
- Other assistants: use the portable files above as the primary project context.
- Keep changes targeted and preserve existing bill, reminder, session, calendar, and OneSignal behavior.
- Secrets remain in Hatchable and must never be committed to Git.
- GitHub changes do not by themselves prove that a Hatchable deployment occurred.
