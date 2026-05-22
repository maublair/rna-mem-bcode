export type EntityType = 'server' | 'service' | 'device';
export type RelationshipType = 'runs_on' | 'depends_on' | 'connects_to' | 'owns' | 'manages' | 'provides_access_to';
export type Environment = 'production' | 'staging' | 'development';
export type ServiceStatus = 'running' | 'stopped' | 'error' | 'unknown';

export interface Server {
  id: string;
  name: string;
  os: string;
  os_version?: string;
  ip?: string;
  ssh_port?: number;
  location?: string;
  environment: Environment;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  type: string;
  port?: number;
  protocol?: string;
  status: ServiceStatus;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  os: string;
  os_version?: string;
  owner?: string;
  location?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Relationship {
  id: string;
  source_id: string;
  source_type: EntityType;
  target_id: string;
  target_type: EntityType;
  relationship_type: RelationshipType;
  metadata?: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  name: string;
  _type: string;
  entityType: EntityType;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface InfraGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface PairResponse {
  token: string;
  expiresAt: string;
  device?: { id: string; name: string };
}

export interface HealthResponse {
  status: string;
  services: Record<string, string>;
}
