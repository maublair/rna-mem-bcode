import { v4 as uuidv4 } from 'uuid';
import type { Migration } from '../services/migrationService.js';
import {
  createServer,
  createService,
  createDevice,
  createRelationship,
  ensureInfrastructureSchema,
} from '../services/infrastructureService.js';

/**
 * Migration: Create initial infrastructure from documentation
 * Adds bcode-work server, BlairCode.com server, and W11 device with their base configurations
 */
const migration: Migration = {
  name: '001-initial-infrastructure',
  up: async () => {
  console.log('Running migration: 001-initial-infrastructure');

  await ensureInfrastructureSchema();

  // Create the main production server: bcode-work
  const bcodeWorkId = uuidv4();
  await createServer({
    id: bcodeWorkId,
    name: 'bcode-work',
    os: 'Ubuntu Linux',
    osVersion: '20.04 LTS',
    ip: '192.168.1.100', // Placeholder, adjust as needed
    sshPort: 22,
    location: 'Primary Data Center',
    environment: 'production',
    description: 'Primary production server for BlairCode services. Hosts Docker Compose stacks including gateway (NPM + Cloudflared), SIA orchestration, and support services.',
    metadata: {
      role: 'primary',
      vcs: 'git',
      region: 'local',
    },
  });

  // Create BlairCode.com server (Ubuntu)
  const blairCodeComId = uuidv4();
  await createServer({
    id: blairCodeComId,
    name: 'blaircode-com',
    os: 'Ubuntu',
    osVersion: 'TBD',
    ip: 'TBD',
    sshPort: 22,
    location: 'Cloud VPS',
    environment: 'production',
    description: 'Ubuntu-based VPS for BlairCode.com. To be configured with details.',
    metadata: {
      role: 'vps',
      region: 'cloud',
    },
  });

  // Create W11 personal computer device
  const w11DeviceId = uuidv4();
  await createDevice({
    id: w11DeviceId,
    name: 'W11 Personal Computer',
    type: 'desktop',
    os: 'Windows',
    osVersion: '11',
    owner: 'Mauricio Blair',
    location: 'Personal',
    description: 'Windows 11 personal computer. Details to be configured.',
    metadata: {
      form_factor: 'desktop',
      primary: true,
    },
  });

  // Create some base services
  const dockerServiceId = uuidv4();
  await createService({
    id: dockerServiceId,
    name: 'Docker Daemon',
    type: 'container-runtime',
    port: 2375,
    protocol: 'TCP',
    status: 'running',
    description: 'Docker container runtime and daemon for managing services.',
    metadata: {
      version: '24.0+',
    },
  });

  const npmServiceId = uuidv4();
  await createService({
    id: npmServiceId,
    name: 'Nginx Proxy Manager',
    type: 'reverse-proxy',
    port: 80,
    protocol: 'HTTP',
    status: 'running',
    description: 'Centralized Nginx reverse proxy for routing public domains to internal services.',
    metadata: {
      admin_port: 81,
    },
  });

  const cloudflaredServiceId = uuidv4();
  await createService({
    id: cloudflaredServiceId,
    name: 'Cloudflared Tunnel',
    type: 'tunnel',
    protocol: 'HTTPS',
    status: 'running',
    description: 'Cloudflare tunnel connecting the infrastructure to the public internet.',
    metadata: {
      provider: 'cloudflare',
    },
  });

  const siaServiceId = uuidv4();
  await createService({
    id: siaServiceId,
    name: 'SIA Bot',
    type: 'application',
    port: 3005,
    protocol: 'HTTP',
    status: 'running',
    description: 'BlairCode AI orchestration service (SIA) handling sales, communication, and learning.',
    metadata: {
      language: 'TypeScript',
      runtime: 'Node.js',
    },
  });

  const rnaServiceId = uuidv4();
  await createService({
    id: rnaServiceId,
    name: 'RNA API',
    type: 'application',
    port: 3007,
    protocol: 'HTTP',
    status: 'running',
    description: 'Red de Memoria Anidada (RNA) - Distributed memory system and knowledge hub.',
    metadata: {
      language: 'TypeScript',
      runtime: 'Node.js',
      databases: ['Neo4j', 'PostgreSQL', 'Qdrant'],
    },
  });

  const neo4jServiceId = uuidv4();
  await createService({
    id: neo4jServiceId,
    name: 'Neo4j Graph Database',
    type: 'database',
    port: 7687,
    protocol: 'Bolt',
    status: 'running',
    description: 'Neo4j graph database for knowledge and infrastructure relationships.',
    metadata: {
      database_type: 'graph',
    },
  });

  const postgresServiceId = uuidv4();
  await createService({
    id: postgresServiceId,
    name: 'PostgreSQL Database',
    type: 'database',
    port: 5432,
    protocol: 'TCP',
    status: 'running',
    description: 'PostgreSQL relational database for facts, documents, and transactions.',
    metadata: {
      database_type: 'relational',
    },
  });

  const qdrantServiceId = uuidv4();
  await createService({
    id: qdrantServiceId,
    name: 'Qdrant Vector DB',
    type: 'database',
    port: 6333,
    protocol: 'HTTP',
    status: 'running',
    description: 'Qdrant vector database for semantic search and embeddings.',
    metadata: {
      database_type: 'vector',
    },
  });

  // Create relationships
  // Services run on bcode-work server
  await createRelationship({
    id: uuidv4(),
    sourceId: dockerServiceId,
    sourceType: 'service',
    targetId: bcodeWorkId,
    targetType: 'server',
    type: 'runs_on',
    metadata: { container: true },
  });

  await createRelationship({
    id: uuidv4(),
    sourceId: npmServiceId,
    sourceType: 'service',
    targetId: bcodeWorkId,
    targetType: 'server',
    type: 'runs_on',
    metadata: { container: true },
  });

  await createRelationship({
    id: uuidv4(),
    sourceId: cloudflaredServiceId,
    sourceType: 'service',
    targetId: bcodeWorkId,
    targetType: 'server',
    type: 'runs_on',
    metadata: { container: true },
  });

  await createRelationship({
    id: uuidv4(),
    sourceId: siaServiceId,
    sourceType: 'service',
    targetId: bcodeWorkId,
    targetType: 'server',
    type: 'runs_on',
    metadata: { container: true },
  });

  await createRelationship({
    id: uuidv4(),
    sourceId: rnaServiceId,
    sourceType: 'service',
    targetId: bcodeWorkId,
    targetType: 'server',
    type: 'runs_on',
    metadata: { container: true },
  });

  await createRelationship({
    id: uuidv4(),
    sourceId: neo4jServiceId,
    sourceType: 'service',
    targetId: bcodeWorkId,
    targetType: 'server',
    type: 'runs_on',
    metadata: { container: true },
  });

  await createRelationship({
    id: uuidv4(),
    sourceId: postgresServiceId,
    sourceType: 'service',
    targetId: bcodeWorkId,
    targetType: 'server',
    type: 'runs_on',
    metadata: { container: true },
  });

  await createRelationship({
    id: uuidv4(),
    sourceId: qdrantServiceId,
    sourceType: 'service',
    targetId: bcodeWorkId,
    targetType: 'server',
    type: 'runs_on',
    metadata: { container: true },
  });

  // Service dependencies
  await createRelationship({
    id: uuidv4(),
    sourceId: npmServiceId,
    sourceType: 'service',
    targetId: cloudflaredServiceId,
    targetType: 'service',
    type: 'depends_on',
    metadata: { upstream: true },
  });

  await createRelationship({
    id: uuidv4(),
    sourceId: siaServiceId,
    sourceType: 'service',
    targetId: neo4jServiceId,
    targetType: 'service',
    type: 'depends_on',
  });

  await createRelationship({
    id: uuidv4(),
    sourceId: siaServiceId,
    sourceType: 'service',
    targetId: postgresServiceId,
    targetType: 'service',
    type: 'depends_on',
  });

  await createRelationship({
    id: uuidv4(),
    sourceId: rnaServiceId,
    sourceType: 'service',
    targetId: neo4jServiceId,
    targetType: 'service',
    type: 'depends_on',
  });

  await createRelationship({
    id: uuidv4(),
    sourceId: rnaServiceId,
    sourceType: 'service',
    targetId: postgresServiceId,
    targetType: 'service',
    type: 'depends_on',
  });

  await createRelationship({
    id: uuidv4(),
    sourceId: rnaServiceId,
    sourceType: 'service',
    targetId: qdrantServiceId,
    targetType: 'service',
    type: 'depends_on',
  });

    console.log('Migration: 001-initial-infrastructure completed successfully');
  },
};

export default migration;
