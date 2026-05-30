import crypto from 'crypto';
import postgres from './postgresService.js';
import neo4j from './neo4jService.js';
import qdrant from './qdrantService.js';
import { getEmbedding } from './embeddingService.js';

export interface FactInput {
  spaceId: string;
  content: string;
  type: string;
  tags?: string[];
  sourceAgent?: string;
  sourceDevice?: string;
  sourceRuntime?: string;
  sourceWorkspace?: string;
  metadata?: any;
}

export interface FactFilters {
  spaceId?: string;
  type?: string;
  tag?: string;
  targetAgent?: string;
  limit?: number;
}

export interface BitacoraInput {
  agentId: string;
  deviceId?: string;
  sessionId?: string;
  cwd?: string;
  command: string;
  status: string;
  resultSummary?: string;
  stdoutRef?: string;
  stderrRef?: string;
  errorMessage?: string;
  durationMs?: number;
  metadata?: any;
}

export interface SnapshotHealthInput {
  kind: string;
  status: string;
  location?: string;
  sizeBytes?: number;
  details?: any;
}

export interface SessionRecord {
  id: string;
  agent_id: string;
  session_id: string;
  objective: string;
  status: string;
  summary?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface SessionInput {
  agent_id: string;
  session_id: string;
  objective: string;
  status?: string;
  summary?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface TopicRecord {
  id: string;
  topic_id: string;
  title: string;
  summary?: string | null;
  tags?: string[];
  session_id?: string | null;
  related_topics?: string[];
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface TopicInput {
  topic_id: string;
  title: string;
  summary?: string | null;
  tags?: string[];
  session_id?: string | null;
  related_topics?: string[];
  metadata?: Record<string, unknown>;
}

export interface HandoffRecord {
  id: string;
  agent_id: string;
  session_id?: string | null;
  topic_id?: string | null;
  summary: string;
  next_steps?: string[];
  blockers?: string[];
  avoid?: string[];
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface HandoffInput {
  agent_id: string;
  session_id?: string | null;
  topic_id?: string | null;
  summary: string;
  next_steps?: string[];
  blockers?: string[];
  avoid?: string[];
  metadata?: Record<string, unknown>;
}

export interface SyncOutboxInput {
  source_device?: string | null;
  source_agent?: string | null;
  source_runtime?: string | null;
  source_workspace?: string | null;
  target_space?: string | null;
  target_collection?: string | null;
  payload?: Record<string, unknown>;
  status?: string;
  retry_count?: number;
  last_error?: string | null;
  scheduled_at?: string | null;
}

export interface ProjectInput {
  project_id: string;
  space_id?: string | null;
  title: string;
  objective?: string | null;
  status?: string | null;
  priority?: string | null;
  owner_agent?: string | null;
  current_session_id?: string | null;
  active_topics?: string[];
  parallel_tracks?: string[];
  handoff_card?: string | null;
  relations?: unknown[];
  artifacts?: unknown[];
  milestones?: string[];
  risks?: string[];
  decisions?: string[];
  open_questions?: string[];
  brainstorming?: string[];
  constraints?: string[];
  version?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ProjectFileInput {
  project_id: string;
  filename: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  content?: string | null;
  summary?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  source_agent?: string | null;
  source_device?: string | null;
  source_runtime?: string | null;
  source_workspace?: string | null;
}

let schemaReady = false;
let schemaPromise: Promise<void> | null = null;

export async function ensureMemorySchema() {
  if (schemaReady) return;
  if (schemaPromise) return schemaPromise;

  schemaPromise = ensureMemorySchemaInternal()
    .then(() => {
      schemaReady = true;
    })
    .finally(() => {
      schemaPromise = null;
    });

  return schemaPromise;
}

async function ensureMemorySchemaInternal() {
  await postgres.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_spaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await postgres.query(`
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
    )
  `);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_facts_space_created ON rna_facts(space_id, created_at DESC)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_facts_type ON rna_facts(type)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_facts_tags ON rna_facts USING GIN(tags)`);
  await postgres.query(`
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
    )
  `);
  await postgres.query(`
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
    )
  `);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_document_revisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID NOT NULL REFERENCES rna_documents(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      data JSONB DEFAULT '{}'::JSONB,
      content TEXT,
      changed_by TEXT,
      change_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_collection_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      collection_id TEXT NOT NULL REFERENCES rna_collections(id) ON DELETE CASCADE,
      subject_type TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(collection_id, subject_type, subject_id)
    )
  `);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_sync_outbox (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_device TEXT,
      source_agent TEXT,
      source_runtime TEXT,
      source_workspace TEXT,
      target_space TEXT,
      target_collection TEXT,
      payload JSONB NOT NULL DEFAULT '{}'::JSONB,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      scheduled_at TIMESTAMPTZ DEFAULT now(),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      processed_at TIMESTAMPTZ
    )
  `);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_sync_outbox_status_scheduled ON rna_sync_outbox(status, scheduled_at ASC)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_sync_outbox_created ON rna_sync_outbox(created_at DESC)`);
  await postgres.query(`ALTER TABLE rna_sync_outbox ADD COLUMN IF NOT EXISTS source_runtime TEXT`);
  await postgres.query(`ALTER TABLE rna_sync_outbox ADD COLUMN IF NOT EXISTS source_workspace TEXT`);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_snapshot_health (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      location TEXT,
      size_bytes BIGINT,
      details JSONB DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_snapshot_health_kind_created ON rna_snapshot_health(kind, created_at DESC)`);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_restore_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mode TEXT NOT NULL DEFAULT 'dry-run',
      target_snapshot_id TEXT,
      target_snapshot_kind TEXT,
      target_location TEXT,
      status TEXT NOT NULL DEFAULT 'planned',
      current_step TEXT,
      step_index INTEGER NOT NULL DEFAULT 0,
      total_steps INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      summary JSONB DEFAULT '{}'::JSONB,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ
    )
  `);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_restore_jobs_created ON rna_restore_jobs(created_at DESC)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_restore_jobs_status ON rna_restore_jobs(status)`);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id TEXT NOT NULL,
      session_id TEXT NOT NULL UNIQUE,
      objective TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      summary TEXT,
      started_at TIMESTAMPTZ DEFAULT now(),
      ended_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_topics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      topic_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT,
      tags TEXT[] DEFAULT ARRAY[]::TEXT[],
      session_id TEXT,
      related_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
      metadata JSONB DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_topic_relations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_topic TEXT NOT NULL,
      target_topic TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      weight NUMERIC(4,3) DEFAULT 0.5,
      metadata JSONB DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_handoff_cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id TEXT NOT NULL,
      session_id TEXT,
      topic_id TEXT,
      summary TEXT NOT NULL,
      next_steps TEXT[] DEFAULT ARRAY[]::TEXT[],
      blockers TEXT[] DEFAULT ARRAY[]::TEXT[],
      avoid TEXT[] DEFAULT ARRAY[]::TEXT[],
      metadata JSONB DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_projects (
      project_id TEXT PRIMARY KEY,
      space_id TEXT REFERENCES rna_spaces(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      objective TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      priority TEXT,
      owner_agent TEXT,
      current_session_id TEXT,
      active_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
      parallel_tracks TEXT[] DEFAULT ARRAY[]::TEXT[],
      handoff_card TEXT,
      relations JSONB DEFAULT '[]'::JSONB,
      artifacts JSONB DEFAULT '[]'::JSONB,
      milestones TEXT[] DEFAULT ARRAY[]::TEXT[],
      risks TEXT[] DEFAULT ARRAY[]::TEXT[],
      decisions TEXT[] DEFAULT ARRAY[]::TEXT[],
      open_questions TEXT[] DEFAULT ARRAY[]::TEXT[],
      brainstorming TEXT[] DEFAULT ARRAY[]::TEXT[],
      constraints TEXT[] DEFAULT ARRAY[]::TEXT[],
      version TEXT,
      metadata JSONB DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_project_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id TEXT NOT NULL REFERENCES rna_projects(project_id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      mime_type TEXT,
      size_bytes BIGINT,
      content TEXT,
      summary TEXT,
      tags TEXT[] DEFAULT ARRAY[]::TEXT[],
      metadata JSONB DEFAULT '{}'::JSONB,
      source_agent TEXT,
      source_device TEXT,
      source_runtime TEXT,
      source_workspace TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_projects_status_updated ON rna_projects(status, updated_at DESC)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_project_files_project_created ON rna_project_files(project_id, created_at DESC)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_sessions_agent_created ON rna_sessions(agent_id, created_at DESC)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_topics_created ON rna_topics(created_at DESC)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_topic_relations_source_target ON rna_topic_relations(source_topic, target_topic)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_handoff_cards_agent_created ON rna_handoff_cards(agent_id, created_at DESC)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_collections_space ON rna_collections(space_id)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_documents_collection_updated ON rna_documents(collection_id, updated_at DESC)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_documents_type ON rna_documents(type)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_documents_tags ON rna_documents USING GIN(tags)`);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_agent_bitacora (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id TEXT NOT NULL,
      device_id TEXT,
      session_id TEXT,
      cwd TEXT,
      command TEXT NOT NULL,
      status TEXT NOT NULL,
      result_summary TEXT,
      stdout_ref TEXT,
      stderr_ref TEXT,
      error_message TEXT,
      duration_ms INTEGER,
      metadata JSONB DEFAULT '{}'::JSONB,
      previous_hash TEXT,
      entry_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_agent_bitacora_agent_created ON rna_agent_bitacora(agent_id, created_at DESC)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_rna_agent_bitacora_status ON rna_agent_bitacora(status)`);
  await postgres.query(`ALTER TABLE rna_facts ADD COLUMN IF NOT EXISTS source_runtime TEXT`);
  await postgres.query(`ALTER TABLE rna_facts ADD COLUMN IF NOT EXISTS source_workspace TEXT`);
  await postgres.query(`
    CREATE OR REPLACE FUNCTION prevent_rna_agent_bitacora_mutation()
    RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'rna_agent_bitacora is immutable';
    END;
    $$ LANGUAGE plpgsql
  `);
  await postgres.query(`
    DROP TRIGGER IF EXISTS rna_agent_bitacora_no_update ON rna_agent_bitacora;
    CREATE TRIGGER rna_agent_bitacora_no_update
    BEFORE UPDATE ON rna_agent_bitacora
    FOR EACH ROW EXECUTE FUNCTION prevent_rna_agent_bitacora_mutation()
  `);
  await postgres.query(`
    DROP TRIGGER IF EXISTS rna_agent_bitacora_no_delete ON rna_agent_bitacora;
    CREATE TRIGGER rna_agent_bitacora_no_delete
    BEFORE DELETE ON rna_agent_bitacora
    FOR EACH ROW EXECUTE FUNCTION prevent_rna_agent_bitacora_mutation()
  `);
}

function normalizeSpace(spaceId: string) {
  return spaceId.replace('rna:/', '').trim();
}

export async function storeFact(input: FactInput) {
  await ensureMemorySchema();
  const spaceId = normalizeSpace(input.spaceId);
  await postgres.query(
    `INSERT INTO rna_spaces (id, name, path)
     VALUES ($1, $1, $1)
     ON CONFLICT (id) DO NOTHING`,
    [spaceId]
  );

  const result = await postgres.query(
    `INSERT INTO rna_facts (space_id, content, type, tags, source_agent, source_device, source_runtime, source_workspace, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, space_id, content, type, tags, source_agent, source_device, source_runtime, source_workspace, metadata, projection_status, created_at`,
    [
      spaceId,
      input.content,
      input.type,
      input.tags || [],
      input.sourceAgent || null,
      input.sourceDevice || null,
      input.sourceRuntime || null,
      input.sourceWorkspace || null,
      input.metadata || {},
    ]
  );
  const fact = result.rows[0];
  void projectFact(fact);
  return fact;
}

export async function upsertSyncOutbox(input: SyncOutboxInput) {
  await ensureMemorySchema();
  const result = await postgres.query(
    `INSERT INTO rna_sync_outbox (source_device, source_agent, source_runtime, source_workspace, target_space, target_collection, payload, status, retry_count, last_error, scheduled_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11, now()))
     RETURNING id, source_device, source_agent, source_runtime, source_workspace, target_space, target_collection, payload, status, retry_count, last_error, scheduled_at, created_at, updated_at, processed_at`,
    [
      input.source_device ?? null,
      input.source_agent ?? null,
      input.source_runtime ?? null,
      input.source_workspace ?? null,
      input.target_space ?? null,
      input.target_collection ?? null,
      input.payload || {},
      input.status || 'pending',
      input.retry_count ?? 0,
      input.last_error ?? null,
      input.scheduled_at ?? null,
    ]
  );
  return result.rows[0];
}

export async function listSyncOutbox(limit = 100) {
  await ensureMemorySchema();
  const result = await postgres.query(
    `SELECT id, source_device, source_agent, source_runtime, source_workspace, target_space, target_collection, payload, status, retry_count, last_error, scheduled_at, created_at, updated_at, processed_at
     FROM rna_sync_outbox
     ORDER BY created_at DESC
     LIMIT $1`,
    [Math.min(limit, 500)]
  );
  return result.rows;
}

export async function updateSyncOutbox(id: string, input: { status: string; retry_count?: number | null; last_error?: string | null }) {
  await ensureMemorySchema();
  const result = await postgres.query(
    `UPDATE rna_sync_outbox
     SET status = $2,
         retry_count = COALESCE($3, retry_count),
         last_error = COALESCE($4, last_error),
         processed_at = CASE WHEN $2 = 'done' THEN now() ELSE processed_at END,
         updated_at = now()
     WHERE id = $1
     RETURNING id, source_device, source_agent, source_runtime, source_workspace, target_space, target_collection, payload, status, retry_count, last_error, scheduled_at, created_at, updated_at, processed_at`,
    [id, input.status, input.retry_count ?? null, input.last_error ?? null]
  );
  return result.rows[0] ?? null;
}

export async function upsertSession(input: SessionInput) {
  await ensureMemorySchema();
  const result = await postgres.query(
    `INSERT INTO rna_sessions (agent_id, session_id, objective, status, summary, started_at, ended_at, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (session_id)
     DO UPDATE SET
       agent_id = EXCLUDED.agent_id,
       objective = EXCLUDED.objective,
       status = EXCLUDED.status,
       summary = EXCLUDED.summary,
       started_at = EXCLUDED.started_at,
       ended_at = EXCLUDED.ended_at,
       metadata = EXCLUDED.metadata,
       updated_at = now()
     RETURNING id, agent_id, session_id, objective, status, summary, started_at, ended_at, metadata, created_at, updated_at`,
    [
      input.agent_id,
      input.session_id,
      input.objective,
      input.status || 'active',
      input.summary || null,
      input.started_at || null,
      input.ended_at || null,
      input.metadata || {},
    ]
  );
  return result.rows[0];
}

export async function listSessions(limit = 50, agentId?: string) {
  await ensureMemorySchema();
  const result = await postgres.query(
    `SELECT id, agent_id, session_id, objective, status, summary, started_at, ended_at, metadata, created_at, updated_at
     FROM rna_sessions
     WHERE ($1::text IS NULL OR agent_id = $1)
     ORDER BY updated_at DESC
     LIMIT $2`,
    [agentId || null, Math.min(limit, 200)]
  );
  return result.rows;
}

export async function upsertTopic(input: TopicInput) {
  await ensureMemorySchema();
  const result = await postgres.query(
    `INSERT INTO rna_topics (topic_id, title, summary, tags, session_id, related_topics, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (topic_id)
     DO UPDATE SET
       title = EXCLUDED.title,
       summary = EXCLUDED.summary,
       tags = EXCLUDED.tags,
       session_id = EXCLUDED.session_id,
       related_topics = EXCLUDED.related_topics,
       metadata = EXCLUDED.metadata,
       updated_at = now()
     RETURNING id, topic_id, title, summary, tags, session_id, related_topics, metadata, created_at, updated_at`,
    [
      input.topic_id,
      input.title,
      input.summary || null,
      input.tags || [],
      input.session_id || null,
      input.related_topics || [],
      input.metadata || {},
    ]
  );
  return result.rows[0];
}

export async function listTopics(limit = 50) {
  await ensureMemorySchema();
  const result = await postgres.query(
    `SELECT id, topic_id, title, summary, tags, session_id, related_topics, metadata, created_at, updated_at
     FROM rna_topics
     ORDER BY updated_at DESC
     LIMIT $1`,
    [Math.min(limit, 200)]
  );
  return result.rows;
}

export async function upsertTopicRelation(input: { source_topic: string; target_topic: string; relation_type: string; weight?: number; metadata?: Record<string, unknown> }) {
  await ensureMemorySchema();
  const result = await postgres.query(
    `INSERT INTO rna_topic_relations (source_topic, target_topic, relation_type, weight, metadata)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, source_topic, target_topic, relation_type, weight, metadata, created_at`,
    [input.source_topic, input.target_topic, input.relation_type, input.weight ?? 0.5, input.metadata || {}]
  );
  return result.rows[0];
}

export async function listTopicRelations(limit = 100) {
  await ensureMemorySchema();
  const result = await postgres.query(
    `SELECT id, source_topic, target_topic, relation_type, weight, metadata, created_at
     FROM rna_topic_relations
     ORDER BY created_at DESC
     LIMIT $1`,
    [Math.min(limit, 300)]
  );
  return result.rows;
}

export async function upsertHandoffCard(input: HandoffInput) {
  await ensureMemorySchema();
  const result = await postgres.query(
    `INSERT INTO rna_handoff_cards (agent_id, session_id, topic_id, summary, next_steps, blockers, avoid, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, agent_id, session_id, topic_id, summary, next_steps, blockers, avoid, metadata, created_at, updated_at`,
    [
      input.agent_id,
      input.session_id || null,
      input.topic_id || null,
      input.summary,
      input.next_steps || [],
      input.blockers || [],
      input.avoid || [],
      input.metadata || {},
    ]
  );
  return result.rows[0];
}

export async function listHandoffCards(limit = 50, agentId?: string) {
  await ensureMemorySchema();
  const result = await postgres.query(
    `SELECT id, agent_id, session_id, topic_id, summary, next_steps, blockers, avoid, metadata, created_at, updated_at
     FROM rna_handoff_cards
     WHERE ($1::text IS NULL OR agent_id = $1)
     ORDER BY created_at DESC
     LIMIT $2`,
    [agentId || null, Math.min(limit, 200)]
  );
  return result.rows;
}

export async function listProjects(limit = 100) {
  await ensureMemorySchema();
  const result = await postgres.query(
    `SELECT project_id, space_id, title, objective, status, priority, owner_agent, current_session_id, active_topics, parallel_tracks, handoff_card, relations, artifacts, milestones, risks, decisions, open_questions, brainstorming, constraints, version, metadata, created_at, updated_at
     FROM rna_projects
     ORDER BY updated_at DESC
     LIMIT $1`,
    [Math.min(limit, 500)]
  );
  return result.rows;
}

export async function upsertProject(input: ProjectInput) {
  await ensureMemorySchema();
  const result = await postgres.query(
    `INSERT INTO rna_projects (project_id, space_id, title, objective, status, priority, owner_agent, current_session_id, active_topics, parallel_tracks, handoff_card, relations, artifacts, milestones, risks, decisions, open_questions, brainstorming, constraints, version, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     ON CONFLICT (project_id)
     DO UPDATE SET
       space_id = EXCLUDED.space_id,
       title = EXCLUDED.title,
       objective = EXCLUDED.objective,
       status = EXCLUDED.status,
       priority = EXCLUDED.priority,
       owner_agent = EXCLUDED.owner_agent,
       current_session_id = EXCLUDED.current_session_id,
       active_topics = EXCLUDED.active_topics,
       parallel_tracks = EXCLUDED.parallel_tracks,
       handoff_card = EXCLUDED.handoff_card,
       relations = EXCLUDED.relations,
       artifacts = EXCLUDED.artifacts,
       milestones = EXCLUDED.milestones,
       risks = EXCLUDED.risks,
       decisions = EXCLUDED.decisions,
       open_questions = EXCLUDED.open_questions,
       brainstorming = EXCLUDED.brainstorming,
       constraints = EXCLUDED.constraints,
       version = EXCLUDED.version,
       metadata = EXCLUDED.metadata,
       updated_at = now()
     RETURNING project_id, space_id, title, objective, status, priority, owner_agent, current_session_id, active_topics, parallel_tracks, handoff_card, relations, artifacts, milestones, risks, decisions, open_questions, brainstorming, constraints, version, metadata, created_at, updated_at`,
    [
      input.project_id,
      input.space_id || null,
      input.title,
      input.objective || null,
      input.status || 'active',
      input.priority || null,
      input.owner_agent || null,
      input.current_session_id || null,
      input.active_topics || [],
      input.parallel_tracks || [],
      input.handoff_card || null,
      input.relations || [],
      input.artifacts || [],
      input.milestones || [],
      input.risks || [],
      input.decisions || [],
      input.open_questions || [],
      input.brainstorming || [],
      input.constraints || [],
      input.version || null,
      input.metadata || {},
    ]
  );
  return result.rows[0];
}

export async function listProjectFiles(projectId: string, limit = 200) {
  await ensureMemorySchema();
  const result = await postgres.query(
    `SELECT id, project_id, filename, mime_type, size_bytes, content, summary, tags, metadata, source_agent, source_device, source_runtime, source_workspace, created_at, updated_at
     FROM rna_project_files
     WHERE project_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [projectId, Math.min(limit, 500)]
  );
  return result.rows;
}

function deriveProjectFileSummary(input: ProjectFileInput) {
  const summary = String(input.summary || '').trim();
  if (summary) return summary;
  const content = String(input.content || '').trim();
  if (!content) return 'Archivo sin contenido textual';
  const lineCount = content.split(/\r?\n/).filter(Boolean).length;
  const excerpt = content.replace(/\s+/g, ' ').slice(0, 280);
  return `${excerpt}${content.length > 280 ? '…' : ''} · ${content.length} chars · ${lineCount} lines`;
}

export async function upsertProjectFile(input: ProjectFileInput) {
  await ensureMemorySchema();
  const summary = deriveProjectFileSummary(input);
  const result = await postgres.query(
    `INSERT INTO rna_project_files (project_id, filename, mime_type, size_bytes, content, summary, tags, metadata, source_agent, source_device, source_runtime, source_workspace)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id, project_id, filename, mime_type, size_bytes, content, summary, tags, metadata, source_agent, source_device, source_runtime, source_workspace, created_at, updated_at`,
    [
      input.project_id,
      input.filename,
      input.mime_type || null,
      input.size_bytes ?? null,
      input.content || null,
      summary,
      input.tags || [],
      input.metadata || {},
      input.source_agent || null,
      input.source_device || null,
      input.source_runtime || null,
      input.source_workspace || null,
    ]
  );
  return result.rows[0];
}

export async function queryFacts(filters: FactFilters) {
  await ensureMemorySchema();
  const clauses = ['1 = 1'];
  const values: any[] = [];

  if (filters.spaceId) {
    values.push(normalizeSpace(filters.spaceId));
    clauses.push(`space_id = $${values.length}`);
  }
  if (filters.type) {
    values.push(filters.type);
    clauses.push(`type = $${values.length}`);
  }
  if (filters.tag) {
    values.push(filters.tag);
    clauses.push(`$${values.length} = ANY(tags)`);
  }
  if (filters.targetAgent) {
    values.push(`for:${filters.targetAgent}`);
    clauses.push(`('for:any' = ANY(tags) OR $${values.length} = ANY(tags))`);
  }

  values.push(Math.min(filters.limit || 50, 200));
  const result = await postgres.query(
    `SELECT id, space_id, content, type, tags, source_agent, source_device, source_runtime, source_workspace, metadata, projection_status, created_at
     FROM rna_facts
     WHERE ${clauses.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${values.length}`,
    values
  );
  return result.rows;
}

export async function appendBitacora(input: BitacoraInput) {
  await ensureMemorySchema();
  const previous = await postgres.query(
    `SELECT entry_hash FROM rna_agent_bitacora WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [input.agentId]
  );
  const previousHash = previous.rows[0]?.entry_hash || null;
  const payload = JSON.stringify({
    agentId: input.agentId,
    deviceId: input.deviceId || null,
    sessionId: input.sessionId || null,
    cwd: input.cwd || null,
    command: input.command,
    status: input.status,
    resultSummary: input.resultSummary || null,
    errorMessage: input.errorMessage || null,
    durationMs: input.durationMs || null,
    metadata: input.metadata || {},
    previousHash,
  });
  const entryHash = crypto.createHash('sha256').update(payload).digest('hex');
  const result = await postgres.query(
    `INSERT INTO rna_agent_bitacora
       (agent_id, device_id, session_id, cwd, command, status, result_summary, stdout_ref, stderr_ref, error_message, duration_ms, metadata, previous_hash, entry_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id, agent_id, device_id, session_id, command, status, result_summary, error_message, duration_ms, previous_hash, entry_hash, created_at`,
    [
      input.agentId,
      input.deviceId || null,
      input.sessionId || null,
      input.cwd || null,
      input.command,
      input.status,
      input.resultSummary || null,
      input.stdoutRef || null,
      input.stderrRef || null,
      input.errorMessage || null,
      input.durationMs || null,
      input.metadata || {},
      previousHash,
      entryHash,
    ]
  );
  return result.rows[0];
}

export async function queryBitacora(input: { agentId?: string; limit?: number }) {
  await ensureMemorySchema();
  const values: any[] = [];
  const clauses = ['1 = 1'];
  if (input.agentId) {
    values.push(input.agentId);
    clauses.push(`agent_id = $${values.length}`);
  }
  values.push(Math.min(input.limit || 100, 500));
  const result = await postgres.query(
    `SELECT id, agent_id, device_id, session_id, cwd, command, status, result_summary, error_message, duration_ms, previous_hash, entry_hash, created_at
     FROM rna_agent_bitacora
     WHERE ${clauses.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${values.length}`,
    values
  );
  return result.rows;
}

async function projectFact(fact: any) {
  const projection: any = {};
  try {
    await neo4j.runQuery(
      `
      MERGE (s:Space {id: $space_id})
        ON CREATE SET s.name = $space_id, s.path = $space_id
      MERGE (f:Fact {id: $id})
      SET f.content = $content,
          f.type = $type,
          f.tags = $tags,
          f.created_at = $created_at
      MERGE (f)-[:IN_SPACE]->(s)
      `,
      {
        id: fact.id,
        space_id: fact.space_id,
        content: fact.content,
        type: fact.type,
        tags: fact.tags || [],
        created_at: fact.created_at?.toISOString?.() || fact.created_at,
      }
    );
    projection.neo4j = 'done';
  } catch (error: any) {
    projection.neo4j = `failed:${error.message}`;
  }

  try {
    const vector = await getEmbedding(fact.content);
    await qdrant.upsert('facts', {
      wait: true,
      points: [{
        id: fact.id,
        vector,
        payload: {
          space_id: fact.space_id,
          content: fact.content,
          type: fact.type,
          tags: fact.tags || [],
          created_at: fact.created_at,
        },
      }],
    });
    projection.qdrant = 'done';
  } catch (error: any) {
    projection.qdrant = `failed:${error.message}`;
  }

  await postgres.query(`UPDATE rna_facts SET projection_status = projection_status || $2::jsonb WHERE id = $1`, [
    fact.id,
    JSON.stringify(projection),
  ]);
}
