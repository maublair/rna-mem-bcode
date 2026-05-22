import postgres from './postgresService.js';
import neo4j from './neo4jService.js';

export interface InfrastructureServer {
  id: string;
  name: string;
  os: string;
  osVersion?: string;
  ip?: string;
  sshPort?: number;
  location?: string;
  environment: 'production' | 'staging' | 'development';
  description?: string;
  metadata?: any;
}

export interface InfrastructureService {
  id: string;
  name: string;
  type: string;
  port?: number;
  protocol?: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  description?: string;
  metadata?: any;
}

export interface InfrastructureDevice {
  id: string;
  name: string;
  type: string;
  os: string;
  osVersion?: string;
  owner?: string;
  location?: string;
  description?: string;
  metadata?: any;
}

export interface InfrastructureRelationship {
  id: string;
  sourceId: string;
  sourceType: 'server' | 'service' | 'device';
  targetId: string;
  targetType: 'server' | 'service' | 'device' | 'network';
  type: 'runs_on' | 'depends_on' | 'connects_to' | 'owns' | 'manages' | 'provides_access_to';
  metadata?: any;
}

let infrastructureSchemaReady = false;
let infrastructureSchemaPromise: Promise<void> | null = null;

export async function ensureInfrastructureSchema() {
  if (infrastructureSchemaReady) return;
  if (infrastructureSchemaPromise) return infrastructureSchemaPromise;

  infrastructureSchemaPromise = ensureInfrastructureSchemaInternal()
    .then(() => {
      infrastructureSchemaReady = true;
    })
    .finally(() => {
      infrastructureSchemaPromise = null;
    });

  return infrastructureSchemaPromise;
}

async function ensureInfrastructureSchemaInternal() {
  // Create PostgreSQL tables for infrastructure
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_infrastructure_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      os TEXT NOT NULL,
      os_version TEXT,
      ip TEXT,
      ssh_port INTEGER DEFAULT 22,
      location TEXT,
      environment TEXT NOT NULL DEFAULT 'production',
      description TEXT,
      metadata JSONB DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_infrastructure_services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      port INTEGER,
      protocol TEXT,
      status TEXT NOT NULL DEFAULT 'unknown',
      description TEXT,
      metadata JSONB DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_infrastructure_devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      os TEXT NOT NULL,
      os_version TEXT,
      owner TEXT,
      location TEXT,
      description TEXT,
      metadata JSONB DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_infrastructure_relationships (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  // Create indexes
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_infra_servers_os ON rna_infrastructure_servers(os)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_infra_servers_env ON rna_infrastructure_servers(environment)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_infra_services_type ON rna_infrastructure_services(type)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_infra_services_status ON rna_infrastructure_services(status)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_infra_devices_type ON rna_infrastructure_devices(type)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_infra_devices_owner ON rna_infrastructure_devices(owner)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_infra_rels_source ON rna_infrastructure_relationships(source_id, source_type)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_infra_rels_target ON rna_infrastructure_relationships(target_id, target_type)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS idx_infra_rels_type ON rna_infrastructure_relationships(relationship_type)`);

  // Create Neo4j constraints and indexes
  try {
    await neo4j.runQuery(`CREATE CONSTRAINT server_id IF NOT EXISTS FOR (s:Server) REQUIRE s.id IS UNIQUE`);
    await neo4j.runQuery(`CREATE CONSTRAINT service_id IF NOT EXISTS FOR (s:Service) REQUIRE s.id IS UNIQUE`);
    await neo4j.runQuery(`CREATE CONSTRAINT device_id IF NOT EXISTS FOR (d:Device) REQUIRE d.id IS UNIQUE`);
    await neo4j.runQuery(`CREATE INDEX server_name IF NOT EXISTS FOR (s:Server) ON (s.name)`);
    await neo4j.runQuery(`CREATE INDEX service_name IF NOT EXISTS FOR (s:Service) ON (s.name)`);
    await neo4j.runQuery(`CREATE INDEX device_name IF NOT EXISTS FOR (d:Device) ON (d.name)`);
  } catch (error) {
    // Constraints may already exist
    console.log('Neo4j schema constraints already exist or not needed');
  }
}

export async function createServer(server: InfrastructureServer) {
  await ensureInfrastructureSchema();

  const result = await postgres.query(
    `INSERT INTO rna_infrastructure_servers (id, name, os, os_version, ip, ssh_port, location, environment, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      server.id,
      server.name,
      server.os,
      server.osVersion || null,
      server.ip || null,
      server.sshPort || 22,
      server.location || null,
      server.environment,
      server.description || null,
      server.metadata || {},
    ]
  );

  const createdServer = result.rows[0];

  // Project to Neo4j
  try {
    await neo4j.runQuery(
      `MERGE (s:Server {id: $id})
       SET s.name = $name,
           s.os = $os,
           s.osVersion = $osVersion,
           s.ip = $ip,
           s.sshPort = $sshPort,
           s.environment = $environment,
           s.location = $location,
           s.description = $description,
           s.created_at = $created_at,
           s.updated_at = $updated_at`,
      {
        id: server.id,
        name: server.name,
        os: server.os,
        osVersion: server.osVersion || null,
        ip: server.ip || null,
        sshPort: server.sshPort || 22,
        environment: server.environment,
        location: server.location || null,
        description: server.description || null,
        created_at: createdServer.created_at?.toISOString?.() || createdServer.created_at,
        updated_at: createdServer.updated_at?.toISOString?.() || createdServer.updated_at,
      }
    );
  } catch (error: any) {
    console.error('Error projecting server to Neo4j:', error);
  }

  return createdServer;
}

export async function createService(service: InfrastructureService) {
  await ensureInfrastructureSchema();

  const result = await postgres.query(
    `INSERT INTO rna_infrastructure_services (id, name, type, port, protocol, status, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      service.id,
      service.name,
      service.type,
      service.port || null,
      service.protocol || null,
      service.status,
      service.description || null,
      service.metadata || {},
    ]
  );

  const createdService = result.rows[0];

  try {
    await neo4j.runQuery(
      `MERGE (s:Service {id: $id})
       SET s.name = $name,
           s.type = $type,
           s.port = $port,
           s.protocol = $protocol,
           s.status = $status,
           s.description = $description,
           s.created_at = $created_at,
           s.updated_at = $updated_at`,
      {
        id: service.id,
        name: service.name,
        type: service.type,
        port: service.port || null,
        protocol: service.protocol || null,
        status: service.status,
        description: service.description || null,
        created_at: createdService.created_at?.toISOString?.() || createdService.created_at,
        updated_at: createdService.updated_at?.toISOString?.() || createdService.updated_at,
      }
    );
  } catch (error: any) {
    console.error('Error projecting service to Neo4j:', error);
  }

  return createdService;
}

export async function createDevice(device: InfrastructureDevice) {
  await ensureInfrastructureSchema();

  const result = await postgres.query(
    `INSERT INTO rna_infrastructure_devices (id, name, type, os, os_version, owner, location, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      device.id,
      device.name,
      device.type,
      device.os,
      device.osVersion || null,
      device.owner || null,
      device.location || null,
      device.description || null,
      device.metadata || {},
    ]
  );

  const createdDevice = result.rows[0];

  try {
    await neo4j.runQuery(
      `MERGE (d:Device {id: $id})
       SET d.name = $name,
           d.type = $type,
           d.os = $os,
           d.osVersion = $osVersion,
           d.owner = $owner,
           d.location = $location,
           d.description = $description,
           d.created_at = $created_at,
           d.updated_at = $updated_at`,
      {
        id: device.id,
        name: device.name,
        type: device.type,
        os: device.os,
        osVersion: device.osVersion || null,
        owner: device.owner || null,
        location: device.location || null,
        description: device.description || null,
        created_at: createdDevice.created_at?.toISOString?.() || createdDevice.created_at,
        updated_at: createdDevice.updated_at?.toISOString?.() || createdDevice.updated_at,
      }
    );
  } catch (error: any) {
    console.error('Error projecting device to Neo4j:', error);
  }

  return createdDevice;
}

export async function createRelationship(rel: InfrastructureRelationship) {
  await ensureInfrastructureSchema();

  const result = await postgres.query(
    `INSERT INTO rna_infrastructure_relationships (id, source_id, source_type, target_id, target_type, relationship_type, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      rel.id,
      rel.sourceId,
      rel.sourceType,
      rel.targetId,
      rel.targetType,
      rel.type,
      rel.metadata || {},
    ]
  );

  const createdRel = result.rows[0];

  try {
    const sourceNodeType = rel.sourceType.charAt(0).toUpperCase() + rel.sourceType.slice(1);
    const targetNodeType = rel.targetType.charAt(0).toUpperCase() + rel.targetType.slice(1);
    const relName = rel.type.toUpperCase();

    await neo4j.runQuery(
      `MATCH (source:${sourceNodeType} {id: $sourceId})
       MATCH (target:${targetNodeType} {id: $targetId})
       MERGE (source)-[r:${relName}]->(target)
       SET r.metadata = $metadata,
           r.created_at = $created_at,
           r.updated_at = $updated_at`,
      {
        sourceId: rel.sourceId,
        targetId: rel.targetId,
        metadata: rel.metadata || {},
        created_at: createdRel.created_at?.toISOString?.() || createdRel.created_at,
        updated_at: createdRel.updated_at?.toISOString?.() || createdRel.updated_at,
      }
    );
  } catch (error: any) {
    console.error('Error projecting relationship to Neo4j:', error);
  }

  return createdRel;
}

export async function getServers() {
  await ensureInfrastructureSchema();
  const result = await postgres.query(`SELECT * FROM rna_infrastructure_servers ORDER BY created_at DESC`);
  return result.rows;
}

export async function getServices() {
  await ensureInfrastructureSchema();
  const result = await postgres.query(`SELECT * FROM rna_infrastructure_services ORDER BY created_at DESC`);
  return result.rows;
}

export async function getDevices() {
  await ensureInfrastructureSchema();
  const result = await postgres.query(`SELECT * FROM rna_infrastructure_devices ORDER BY created_at DESC`);
  return result.rows;
}

export async function getRelationships(filters?: { sourceId?: string; targetId?: string; type?: string }) {
  await ensureInfrastructureSchema();
  const clauses = ['1 = 1'];
  const values: any[] = [];

  if (filters?.sourceId) {
    values.push(filters.sourceId);
    clauses.push(`source_id = $${values.length}`);
  }
  if (filters?.targetId) {
    values.push(filters.targetId);
    clauses.push(`target_id = $${values.length}`);
  }
  if (filters?.type) {
    values.push(filters.type);
    clauses.push(`relationship_type = $${values.length}`);
  }

  const result = await postgres.query(
    `SELECT * FROM rna_infrastructure_relationships WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC`,
    values
  );
  return result.rows;
}

export async function getInfrastructureGraph() {
  await ensureInfrastructureSchema();

  // Get all infrastructure entities
  const serversResult = await postgres.query(`SELECT id, name, type as _type FROM rna_infrastructure_servers`);
  const servicesResult = await postgres.query(`SELECT id, name, type as _type FROM rna_infrastructure_services`);
  const devicesResult = await postgres.query(`SELECT id, name, type as _type FROM rna_infrastructure_devices`);
  const relsResult = await postgres.query(`SELECT * FROM rna_infrastructure_relationships`);

  const nodes = [
    ...serversResult.rows.map(r => ({ ...r, entityType: 'server' })),
    ...servicesResult.rows.map(r => ({ ...r, entityType: 'service' })),
    ...devicesResult.rows.map(r => ({ ...r, entityType: 'device' })),
  ];

  const edges = relsResult.rows.map(r => ({
    id: r.id,
    source: r.source_id,
    target: r.target_id,
    type: r.relationship_type,
    metadata: r.metadata,
  }));

  return { nodes, edges };
}
