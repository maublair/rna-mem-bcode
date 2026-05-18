export class RNALink {
    apiKey;
    serverUrl;
    constructor(config = {}) {
        this.apiKey = config.apiKey || process.env.RNA_API_KEY || '';
        this.serverUrl = config.serverUrl || process.env.RNA_SERVER_URL || 'https://rna.bcode.work';
    }
    async request(endpoint, options = {}) {
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
    async bootstrap(req) {
        return this.request('/v1/agents/bootstrap', {
            method: 'POST',
            body: JSON.stringify(req),
        });
    }
    async query(req) {
        const params = new URLSearchParams();
        params.append('space', req.space);
        if (req.filters)
            params.append('filters', JSON.stringify(req.filters));
        return this.request(`/v1/facts?${params.toString()}`, {
            method: 'GET',
        });
    }
    async store(req) {
        return this.request('/v1/facts', {
            method: 'POST',
            body: JSON.stringify(req),
        });
    }
    async learnFromError(req) {
        await this.request('/v1/agents/learn/error', {
            method: 'POST',
            body: JSON.stringify(req),
        });
    }
    async learnFromSuccess(req) {
        await this.request('/v1/agents/learn/success', {
            method: 'POST',
            body: JSON.stringify(req),
        });
    }
    async suggestFix(errorMsg) {
        return this.request('/v1/agents/suggest', {
            method: 'POST',
            body: JSON.stringify({ error: errorMsg }),
        });
    }
}
export const rnaLink = new RNALink();
