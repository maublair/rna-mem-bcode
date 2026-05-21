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

export async function ensureMemorySchema() {
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
    `INSERT INTO rna_facts (space_id, content, type, tags, source_agent, source_device, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, space_id, content, type, tags, source_agent, source_device, metadata, projection_status, created_at`,
    [
      spaceId,
      input.content,
      input.type,
      input.tags || [],
      input.sourceAgent || null,
      input.sourceDevice || null,
      input.metadata || {},
    ]
  );
  const fact = result.rows[0];
  void projectFact(fact);
  return fact;
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
    `SELECT id, space_id, content, type, tags, source_agent, source_device, metadata, projection_status, created_at
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
