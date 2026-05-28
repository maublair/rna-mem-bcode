import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import crypto from 'crypto';

const STACK_RNA_LOCAL_PATH = '/home/mblair/srv/stacks/rna/.rna';

function resolveRnaLocalPath(fallback = path.join(os.homedir(), '.rna')) {
  if (process.platform === 'linux' && fs.existsSync('/home/mblair/srv/stacks/rna')) return STACK_RNA_LOCAL_PATH;
  return fallback;
}

export interface RNALinkConfig {
  apiKey?: string;
  serverUrl?: string;
  localPath?: string;
  pairingSecret?: string;
  deviceId?: string;
  deviceName?: string;
}

interface RNALocalConfig {
  api_key?: string;
  rna_server?: string;
  pairing_secret?: string;
  device_id?: string;
  device_name?: string;
  auth_token?: string;
}

export interface BootstrapRequest {
  agent_id: string;
  message: string;
  max_tokens?: number;
}

export interface BootstrapResponse {
  injection: string;
  tasks?: any[];
}

export interface QueryRequest {
  space: string;
  filters?: any;
}

export interface Fact {
  id: string;
  space_id?: string;
  content: string;
  type: string;
  tags?: string[];
  created_at?: string;
}

export interface StoreRequest {
  space: string;
  content: string;
  type: string;
  tags?: string[];
}

export interface ErrorData {
  command: string;
  error: string;
  solution_tried?: string;
  status?: string;
}

export interface SuccessData {
  command: string;
  result: string;
}

export interface TraceData {
  agent_id?: string;
  session_id?: string;
  cwd?: string;
  command: string;
  status: 'STARTED' | 'SUCCESS' | 'ERROR' | 'BLOCKED';
  result_summary?: string;
  stdout_ref?: string;
  stderr_ref?: string;
  error_message?: string;
  duration_ms?: number;
  metadata?: any;
}

function readLocalConfig(localPath: string): RNALocalConfig {
  try {
    const configPath = path.join(localPath, 'config.json');
    if (!fs.existsSync(configPath)) return {};
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as RNALocalConfig;
  } catch {
    return {};
  }
}

export class RNALink {
  private apiKey: string;
  private serverUrl: string;
  private localPath: string;
  private pairingSecret: string;
  private deviceId: string;
  private deviceName: string;
  private authToken: string;
  private pairPromise: Promise<void> | null = null;

  constructor(config: RNALinkConfig = {}) {
    this.localPath = config.localPath || resolveRnaLocalPath();

    if (!fs.existsSync(this.localPath)) {
      fs.mkdirSync(this.localPath, { recursive: true });
    }

    const localConfig = readLocalConfig(this.localPath);
    this.apiKey = config.apiKey || process.env.RNA_API_KEY || localConfig.api_key || '';
    this.serverUrl = config.serverUrl || process.env.RNA_SERVER_URL || localConfig.rna_server || 'https://rna.bcode.work';
    this.pairingSecret = config.pairingSecret || process.env.RNA_PAIRING_SECRET || localConfig.pairing_secret || '';
    this.deviceId = config.deviceId || localConfig.device_id || crypto.randomUUID();
    this.deviceName = config.deviceName || localConfig.device_name || os.hostname();
    this.authToken = localConfig.auth_token || '';
  }

  private saveConfig(patch: Partial<RNALocalConfig>) {
    try {
      const configPath = path.join(this.localPath, 'config.json');
      const current = readLocalConfig(this.localPath);
      fs.writeFileSync(configPath, JSON.stringify({ ...current, ...patch }, null, 2));
    } catch (error) {
      console.error('Failed to persist RNA local config:', error);
    }
  }

  private async pairIfNeeded() {
    if (this.authToken || !this.pairingSecret) return;
    if (!this.pairPromise) {
      this.pairPromise = (async () => {
        const response = await fetch(`${this.serverUrl}/auth/pair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: this.deviceId,
            device_name: this.deviceName,
            fingerprint: this.deviceId,
            pairing_secret: this.pairingSecret,
          }),
        });
        if (!response.ok) {
          throw new Error(`RNA pairing failed: ${response.status}`);
        }
        const data = await response.json();
        this.authToken = data.token || '';
        if (this.authToken) {
          this.saveConfig({
            auth_token: this.authToken,
            device_id: this.deviceId,
            device_name: this.deviceName,
            pairing_secret: this.pairingSecret,
            rna_server: this.serverUrl,
            api_key: this.apiKey,
          });
        }
      })().finally(() => {
        this.pairPromise = null;
      });
    }
    await this.pairPromise;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.serverUrl}${endpoint}`;
    await this.pairIfNeeded();
    const headers = {
      'Content-Type': 'application/json',
      ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`RNA API Warning ${response.status}: ${errorText}`);
        return null;
      }
      return response.json();
    } catch {
      console.warn('RNA API connection failed, working in local mode.');
      return null;
    }
  }

  private saveLocal(space: string, content: any, type: string) {
    try {
      const relativePath = space.replace('rna:/', '').replace(/:/g, '/');
      const targetDir = path.join(this.localPath, relativePath);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const id = content.id || `local_${Date.now()}`;
      const fileName = `${type.toLowerCase()}_${id}.json`;
      const filePath = path.join(targetDir, fileName);

      fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save to local RNA storage:', error);
      return false;
    }
  }

  async store(req: StoreRequest): Promise<{ id: string }> {
    const timestamp = new Date().toISOString();
    const factData = { ...req, created_at: timestamp };

    this.saveLocal(req.space, factData, req.type);

    const apiResult = await this.request('/v1/facts', {
      method: 'POST',
      body: JSON.stringify(req),
    });

    return apiResult || { id: `local_${Date.now()}` };
  }

  async bootstrap(req: BootstrapRequest): Promise<BootstrapResponse> {
    const apiResult = await this.request('/v1/agents/bootstrap', {
      method: 'POST',
      body: JSON.stringify(req),
    });

    if (apiResult) return apiResult;
    return { injection: 'RNA Local Mode: usando cache local /home/mblair/srv/stacks/rna/.rna' };
  }

  async query(req: QueryRequest): Promise<Fact[]> {
    const apiResult = await this.request(`/v1/facts?space_id=${req.space.replace('rna:/', '')}`, {
      method: 'GET',
    });

    if (apiResult) return apiResult;

    try {
      const relativePath = req.space.replace('rna:/', '').replace(/:/g, '/');
      const targetDir = path.join(this.localPath, relativePath);
      if (fs.existsSync(targetDir)) {
        const files = fs.readdirSync(targetDir);
        return files
          .filter((f) => f.endsWith('.json'))
          .map((f) => JSON.parse(fs.readFileSync(path.join(targetDir, f), 'utf-8')));
      }
    } catch {
      return [];
    }
    return [];
  }

  async learnFromError(req: ErrorData): Promise<void> {
    this.saveLocal('rna:/operacional/aprendizaje/errores', req, 'ERROR');
    await this.request('/v1/agents/learn/error', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async learnFromSuccess(req: SuccessData): Promise<void> {
    this.saveLocal('rna:/operacional/aprendizaje/exitos', req, 'SUCCESS');
    await this.request('/v1/agents/learn/success', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async suggestFix(errorMsg: string): Promise<string[]> {
    const apiResult = await this.request('/v1/agents/suggest', {
      method: 'POST',
      body: JSON.stringify({ error: errorMsg }),
    });
    return apiResult || [];
  }

  async trace(req: TraceData): Promise<any> {
    const timestamp = new Date().toISOString();
    this.saveLocal('rna:/operacional/bitacora', { ...req, created_at: timestamp }, 'TRACE');
    const apiResult = await this.request('/v1/agents/trace', {
      method: 'POST',
      body: JSON.stringify(req),
    });
    return apiResult || { id: `local_${Date.now()}`, status: 'local' };
  }
}

export const rnaLink = new RNALink();
