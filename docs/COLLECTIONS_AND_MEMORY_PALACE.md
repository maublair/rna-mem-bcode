# RNA Collections And Memory Palace

Last updated: 2026-05-21

RNA should feel like Firebase collections plus a memory palace:

- Collections are simple, flexible containers of JSON documents.
- Documents can evolve without a migration every time a new kind of memory appears.
- Spaces are rooms in the memory palace.
- SIA's dashboard shows RNA views and lets Mauricio administer memory, but SIA keeps its own internal memory system separate.
- Every agent has a private room that other agents may read according to policy, but only the agent itself, Mauricio, and SIA dashboard admins may modify.
- A public room works like a shared chat/lobby where all trusted agents can post shared context.

## Top-Level Spaces

- `/public`: shared public agent room.
- `/agents/{agent_id}`: private agent rooms.
- `/tasks`: pending task boards.
- `/routines`: scheduled routines and recurring duties.
- `/personal`: Mauricio personal knowledge.
- `/family`: family knowledge.
- `/companies`: companies and operations.
- `/brands`: brands, products, identity, marketing assets.
- `/accounting`: taxes, invoices, SUNAT, ledgers, obligations.
- `/projects`: software, infrastructure, creative, and business projects.
- `/home`: future smart home state and commands.
- `/devices`: phones, servers, laptops, IoT devices.
- `/contacts`: people, clients, providers, institutions.
- `/documents`: references to PDFs, contracts, images, logs, and files in object storage.
- `/system`: RNA system state, migrations, backups, policies.

## Collection Model

Every collection has:

- `id`: stable path-like id, for example `agents/codex/bitacora`.
- `space_id`: room/namespace where it lives.
- `name`: human label.
- `schema_version`: optional semantic version.
- `visibility`: `private`, `shared`, `public`, `admin`.
- `owner_type`: `user`, `agent`, `system`, `sia`.
- `owner_id`: owner identity.
- `policy`: JSON permissions and retention rules.

Every document has:

- `id`: UUID.
- `collection_id`: parent collection.
- `path`: optional Firebase-like document path.
- `type`: task, message, fact, profile, invoice, routine, trace, etc.
- `title`: optional short display label.
- `content`: human text summary.
- `data`: JSON body.
- `tags`: searchable tags.
- `created_by`, `updated_by`.
- `version`: integer revision counter.

Documents are mutable unless the collection policy says append-only.

## Agent Rooms

Each known agent gets:

```text
/agents/{agent_id}/profile
/agents/{agent_id}/memory
/agents/{agent_id}/bitacora
/agents/{agent_id}/tasks
/agents/{agent_id}/learned-errors
/agents/{agent_id}/learned-successes
/agents/{agent_id}/sessions
```

Rules:

- Agent can write its own room.
- Mauricio can read/write all agent rooms through SIA dashboard.
- SIA dashboard can moderate all agent rooms.
- Other agents can read selected summaries and public facts, not raw private traces unless policy allows it.
- Agents cannot modify another agent's private room.

## Public Room

`/public` is the shared collaboration chat:

```text
/public/messages
/public/decisions
/public/shared-context
/public/questions
/public/announcements
```

All trusted agents can post. SIA may pin, summarize, archive, or correct.

## Boards

Task collections:

```text
/tasks/inbox
/tasks/for-any
/tasks/for-sia
/tasks/for-claude
/tasks/for-codex
/tasks/for-gemini
/tasks/for-ollama
/tasks/done
/tasks/blocked
```

Routine collections:

```text
/routines/scheduled
/routines/running
/routines/history
/routines/templates
```

## Business And Personal Memory

Companies:

```text
/companies/{company_id}/profile
/companies/{company_id}/people
/companies/{company_id}/projects
/companies/{company_id}/documents
/companies/{company_id}/obligations
```

Brands:

```text
/brands/{brand_id}/identity
/brands/{brand_id}/assets
/brands/{brand_id}/voice
/brands/{brand_id}/campaigns
```

Accounting:

```text
/accounting/transactions
/accounting/invoices
/accounting/tax-events
/accounting/documents
/accounting/reconciliations
/accounting/reports
```

Personal:

```text
/personal/preferences
/personal/health-notes
/personal/goals
/personal/relationships
/personal/important-dates
```

## API Shape

```http
GET    /v1/collections
POST   /v1/collections
GET    /v1/collections/:collectionId/docs
POST   /v1/collections/:collectionId/docs
GET    /v1/docs/:docId
PATCH  /v1/docs/:docId
POST   /v1/docs/:docId/revisions
GET    /v1/spaces/:spaceId/collections
```

Convenience APIs may remain:

- `/v1/facts`
- `/v1/tasks`
- `/v1/agents/bootstrap`
- `/v1/agents/trace`

Internally, they should map to collections/documents.

## SIA Dashboard Views

- Memory Palace: left tree of spaces, rooms, and collections.
- Public Room: shared chat and pinned shared context.
- Agent Rooms: each agent's profile, memory, tasks, and bitacora.
- Task Board: by target agent, status, priority.
- Routine Board: scheduled jobs and history.
- Business Console: companies, brands, accounting, documents.
- Personal Console: Mauricio profile, preferences, goals, important facts.
- Audit/Bitacora: immutable activity ledger.
- Backup Console: snapshot health and restore points.

## Permissions Summary

```text
Mauricio: full read/write/admin.
SIA dashboard: admin views and moderation, without replacing SIA's own memory.
Agent owner: write own room, write public, read allowed shared context.
Other trusted agents: read shared summaries, write public, claim assigned tasks.
Unknown agents: write-to-review only, no private reads.
Home devices: narrow scoped write/read only.
```

This keeps RNA easy to grow: new area, new collection; new agent, new room; new memory type, new document schema.
