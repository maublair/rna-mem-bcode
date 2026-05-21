# RNA Collections DB Schema

PostgreSQL keeps a flexible Firebase-like collections/documents model so RNA can grow without a migration for every new memory type.

## Tables

- `rna_collections`: collections with owner, visibility, policy and metadata.
- `rna_documents`: flexible JSON documents inside collections.
- `rna_document_revisions`: document change history.
- `rna_collection_permissions`: permissions by user, agent, device or role.

## Covered Areas

This model covers:

- agent rooms
- public room
- task boards
- scheduled routines
- companies
- brands
- accounting
- personal memory
- home automation
- devices
- contacts
- documents
- system policies

## Relationship To Existing APIs

Existing convenience APIs should map into collections:

- `/v1/facts` -> documents in memory collections
- `/v1/tasks` -> documents in task collections
- `/v1/agents/trace` -> append-only documents in agent bitacora collections
- `/v1/agents/bootstrap` -> reads selected collections and summaries

PostgreSQL remains canonical. Neo4j and Qdrant remain rebuildable projections.
