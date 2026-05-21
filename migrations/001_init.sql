-- F25.3: PostgreSQL migrations

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Canonical Spaces and Facts
CREATE TABLE IF NOT EXISTS rna_spaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rna_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id TEXT NOT NULL REFERENCES rna_spaces(id) ON DELETE RESTRICT,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    source_agent TEXT,
    source_device TEXT,
    confidence NUMERIC(4,3) DEFAULT 1.0,
    metadata JSONB DEFAULT '{}'::JSONB,
    projection_status JSONB DEFAULT '{"neo4j":"pending","qdrant":"pending"}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rna_facts_space_created ON rna_facts(space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rna_facts_type ON rna_facts(type);
CREATE INDEX IF NOT EXISTS idx_rna_facts_tags ON rna_facts USING GIN(tags);

-- Firebase-like Collections and Documents
CREATE TABLE IF NOT EXISTS rna_collections (
    id TEXT PRIMARY KEY,
    space_id TEXT REFERENCES rna_spaces(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    schema_version TEXT,
    visibility TEXT NOT NULL DEFAULT 'shared',
    owner_type TEXT NOT NULL DEFAULT 'system',
    owner_id TEXT,
    policy JSONB DEFAULT '{}'::JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rna_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id TEXT NOT NULL REFERENCES rna_collections(id) ON DELETE CASCADE,
    path TEXT,
    type TEXT NOT NULL,
    title TEXT,
    content TEXT,
    data JSONB DEFAULT '{}'::JSONB,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_by TEXT,
    updated_by TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rna_document_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES rna_documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    data JSONB DEFAULT '{}'::JSONB,
    content TEXT,
    changed_by TEXT,
    change_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rna_collection_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id TEXT NOT NULL REFERENCES rna_collections(id) ON DELETE CASCADE,
    subject_type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(collection_id, subject_type, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_rna_collections_space ON rna_collections(space_id);
CREATE INDEX IF NOT EXISTS idx_rna_documents_collection_updated ON rna_documents(collection_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_rna_documents_type ON rna_documents(type);
CREATE INDEX IF NOT EXISTS idx_rna_documents_tags ON rna_documents USING GIN(tags);

INSERT INTO rna_spaces (id, name, path) VALUES
    ('public', 'public', 'public'),
    ('agents', 'agents', 'agents'),
    ('tasks', 'tasks', 'tasks'),
    ('routines', 'routines', 'routines'),
    ('personal', 'personal', 'personal'),
    ('family', 'family', 'family'),
    ('companies', 'companies', 'companies'),
    ('brands', 'brands', 'brands'),
    ('accounting', 'accounting', 'accounting'),
    ('projects', 'projects', 'projects'),
    ('home', 'home', 'home'),
    ('devices', 'devices', 'devices'),
    ('contacts', 'contacts', 'contacts'),
    ('documents', 'documents', 'documents'),
    ('system', 'system', 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rna_collections (id, space_id, name, visibility, owner_type, owner_id, policy) VALUES
    ('public/messages', 'public', 'Public Messages', 'public', 'system', 'rna', '{"write":"trusted-agents"}'),
    ('public/decisions', 'public', 'Public Decisions', 'public', 'system', 'rna', '{"write":"trusted-agents"}'),
    ('tasks/inbox', 'tasks', 'Task Inbox', 'shared', 'system', 'rna', '{"write":"trusted-agents"}'),
    ('tasks/for-any', 'tasks', 'Tasks For Any Agent', 'shared', 'system', 'rna', '{"write":"trusted-agents"}'),
    ('tasks/done', 'tasks', 'Done Tasks', 'shared', 'system', 'rna', '{"write":"trusted-agents"}'),
    ('tasks/blocked', 'tasks', 'Blocked Tasks', 'shared', 'system', 'rna', '{"write":"trusted-agents"}'),
    ('routines/scheduled', 'routines', 'Scheduled Routines', 'shared', 'system', 'rna', '{"write":"admin-or-sia"}'),
    ('routines/history', 'routines', 'Routine History', 'shared', 'system', 'rna', '{"append_only":true}'),
    ('personal/preferences', 'personal', 'Personal Preferences', 'private', 'user', 'mauricio', '{"write":"mauricio-or-sia"}'),
    ('companies/index', 'companies', 'Companies Index', 'shared', 'system', 'rna', '{"write":"admin-or-sia"}'),
    ('brands/index', 'brands', 'Brands Index', 'shared', 'system', 'rna', '{"write":"admin-or-sia"}'),
    ('accounting/transactions', 'accounting', 'Accounting Transactions', 'private', 'system', 'rna', '{"write":"admin-or-sia"}'),
    ('system/audit', 'system', 'System Audit', 'admin', 'system', 'rna', '{"append_only":true}'),
    ('system/backups', 'system', 'Backup Snapshots', 'admin', 'system', 'rna', '{"append_only":true}')
ON CONFLICT (id) DO NOTHING;

-- Transactions
CREATE TABLE IF NOT EXISTS rna_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- INCOME, EXPENSE, etc.
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'PEN',
    category TEXT,
    description TEXT,
    document_type TEXT,
    document_id TEXT,
    document_file TEXT,
    tags TEXT[],
    linked_contact_id UUID,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    verified BOOLEAN DEFAULT false,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON rna_transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_space ON rna_transactions(space_id);

-- Tax Events
CREATE TABLE IF NOT EXISTS rna_tax_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id TEXT NOT NULL,
    tax_type TEXT NOT NULL,
    frequency TEXT,
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'PENDING',
    amount DECIMAL(12,2),
    proof_document TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Devices
CREATE TABLE IF NOT EXISTS rna_devices (
    id TEXT PRIMARY KEY, -- device_id
    name TEXT,
    type TEXT,
    last_location_lat DOUBLE PRECISION,
    last_location_lon DOUBLE PRECISION,
    battery_level INTEGER,
    status TEXT,
    last_seen TIMESTAMPTZ DEFAULT now(),
    metrics JSONB
);

-- Execution Traces (Agent logs)
CREATE TABLE IF NOT EXISTS rna_execution_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    command TEXT NOT NULL,
    result TEXT,
    status TEXT, -- SUCCESS, ERROR
    error_message TEXT,
    execution_time_ms INTEGER,
    context JSONB,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Immutable Agent Bitacora
CREATE TABLE IF NOT EXISTS rna_agent_bitacora (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    device_id TEXT,
    session_id TEXT,
    cwd TEXT,
    command TEXT NOT NULL,
    status TEXT NOT NULL, -- STARTED, SUCCESS, ERROR, BLOCKED
    result_summary TEXT,
    stdout_ref TEXT,
    stderr_ref TEXT,
    error_message TEXT,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}'::JSONB,
    previous_hash TEXT,
    entry_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rna_agent_bitacora_agent_created ON rna_agent_bitacora(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rna_agent_bitacora_status ON rna_agent_bitacora(status);

CREATE OR REPLACE FUNCTION prevent_rna_agent_bitacora_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'rna_agent_bitacora is immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rna_agent_bitacora_no_update ON rna_agent_bitacora;
CREATE TRIGGER rna_agent_bitacora_no_update
BEFORE UPDATE ON rna_agent_bitacora
FOR EACH ROW EXECUTE FUNCTION prevent_rna_agent_bitacora_mutation();

DROP TRIGGER IF EXISTS rna_agent_bitacora_no_delete ON rna_agent_bitacora;
CREATE TRIGGER rna_agent_bitacora_no_delete
BEFORE DELETE ON rna_agent_bitacora
FOR EACH ROW EXECUTE FUNCTION prevent_rna_agent_bitacora_mutation();

-- Contacts Extended
CREATE TABLE IF NOT EXISTS rna_contacts_extended (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    ruc_dni TEXT UNIQUE,
    business_name TEXT,
    role TEXT, -- PROVIDER, CLIENT, etc.
    payment_terms TEXT,
    bank_info JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
