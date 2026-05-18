export interface RNALinkConfig {
  apiKey?: string;
  serverUrl?: string;
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

export class RNALink {
  private apiKey: string;
  private serverUrl: string;

  constructor(config: RNALinkConfig = {}) {
    this.apiKey = config.apiKey || process.env.RNA_API_KEY || '';
    this.serverUrl = config.serverUrl || process.env.RNA_SERVER_URL || 'https://rna.bcode.work';
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.serverUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RNA API Error ${response.status}: ${errorText}`);
    }
    return response.json();
  }

  async bootstrap(req: BootstrapRequest): Promise<BootstrapResponse> {
    return this.request('/v1/agents/bootstrap', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async query(req: QueryRequest): Promise<Fact[]> {
    const params = new URLSearchParams();
    params.append('space', req.space);
    if (req.filters) params.append('filters', JSON.stringify(req.filters));
    
    return this.request(`/v1/facts?${params.toString()}`, {
      method: 'GET',
    });
  }

  async store(req: StoreRequest): Promise<{ id: string }> {
    return this.request('/v1/facts', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async learnFromError(req: ErrorData): Promise<void> {
    await this.request('/v1/agents/learn/error', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async learnFromSuccess(req: SuccessData): Promise<void> {
    await this.request('/v1/agents/learn/success', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async suggestFix(errorMsg: string): Promise<string[]> {
    return this.request('/v1/agents/suggest', {
      method: 'POST',
      body: JSON.stringify({ error: errorMsg }),
    });
  }
}

export const rnaLink = new RNALink();
