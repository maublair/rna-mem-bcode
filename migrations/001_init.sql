-- F25.3: PostgreSQL migrations

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
