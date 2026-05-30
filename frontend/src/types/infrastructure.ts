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

export interface SpaceSummary {
  id: string;
  name: string;
  path: string;
}

export interface CollectionSummary {
  id: string;
  space_id: string | null;
  name: string;
  schema_version?: string | null;
  visibility: string;
  owner_type: string;
  owner_id?: string | null;
  policy?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DocumentSummary {
  id: string;
  collection_id: string;
  path?: string | null;
  type: string;
  title?: string | null;
  content?: string | null;
  data?: Record<string, unknown>;
  tags?: string[];
  created_by?: string | null;
  updated_by?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface FactSummary {
  id: string;
  space_id: string;
  content: string;
  type: string;
  tags: string[];
  source_agent?: string | null;
  source_device?: string | null;
  source_runtime?: string | null;
  source_workspace?: string | null;
  metadata?: Record<string, unknown>;
  projection_status?: Record<string, unknown>;
  created_at: string;
}

export interface TraceEntry {
  id: string;
  agent_id: string;
  device_id?: string | null;
  session_id?: string | null;
  cwd?: string | null;
  command: string;
  status: string;
  result_summary?: string | null;
  stdout_ref?: string | null;
  stderr_ref?: string | null;
  error_message?: string | null;
  duration_ms?: number | null;
  metadata?: Record<string, unknown>;
  previous_hash?: string | null;
  entry_hash: string;
  created_at: string;
}

export interface SessionSummary {
  id: string;
  agent_id: string;
  session_id: string;
  objective: string;
  status: string;
  summary?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TopicSummary {
  id: string;
  topic_id: string;
  title: string;
  summary?: string | null;
  tags: string[];
  session_id?: string | null;
  related_topics: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TopicRelationSummary {
  id: string;
  source_topic: string;
  target_topic: string;
  relation_type: string;
  weight: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string | null;
}

export interface HandoffCardSummary {
  id: string;
  agent_id: string;
  session_id?: string | null;
  topic_id?: string | null;
  summary: string;
  next_steps: string[];
  blockers: string[];
  avoid: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentMessageSummary {
  id: string;
  from_agent: string;
  to_agent: string;
  channel: string;
  content: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  source_device?: string | null;
  source_agent?: string | null;
  source_runtime?: string | null;
  source_workspace?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionPermission {
  id: string;
  collection_id: string;
  subject_type: string;
  subject_id: string;
  permissions: string[];
  created_at: string;
}

export interface DocumentRevision {
  id: string;
  document_id: string;
  version: number;
  data?: Record<string, unknown>;
  content?: string | null;
  changed_by?: string | null;
  change_reason?: string | null;
  created_at: string;
}

export interface SyncOutboxEntry {
  id: string;
  source_device?: string | null;
  source_agent?: string | null;
  source_runtime?: string | null;
  source_workspace?: string | null;
  target_space?: string | null;
  target_collection?: string | null;
  payload: Record<string, unknown>;
  status: string;
  retry_count: number;
  last_error?: string | null;
  scheduled_at?: string | null;
  created_at: string;
  updated_at: string;
  processed_at?: string | null;
}

export interface SnapshotHealth {
  id: string;
  kind: string;
  status: string;
  location?: string | null;
  size_bytes?: number | null;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface SiaBackupHookStatus {
  configured: boolean;
  hook_path: string | null;
  exists: boolean;
  executable: boolean;
}

export interface RestorePlan {
  order: string[];
  rule: string[];
  latest_snapshots: SnapshotHealth[];
}

export interface RestoreJob {
  id: string;
  mode: string;
  target_snapshot_id?: string | null;
  target_snapshot_kind?: string | null;
  target_location?: string | null;
  status: string;
  current_step?: string | null;
  step_index: number;
  total_steps: number;
  last_error?: string | null;
  summary?: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}
