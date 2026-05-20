import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
function readLocalConfig(localPath) {
    try {
        const configPath = path.join(localPath, 'config.json');
        if (!fs.existsSync(configPath))
            return {};
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    catch {
        return {};
    }
}
export class RNALink {
    apiKey;
    serverUrl;
    localPath;
    constructor(config = {}) {
        this.localPath = config.localPath || path.join(os.homedir(), '.rna');
        if (!fs.existsSync(this.localPath)) {
            fs.mkdirSync(this.localPath, { recursive: true });
        }
        const localConfig = readLocalConfig(this.localPath);
        this.apiKey = config.apiKey || process.env.RNA_API_KEY || localConfig.api_key || '';
        this.serverUrl =
            config.serverUrl || process.env.RNA_SERVER_URL || localConfig.rna_server || 'https://rna.bcode.work';
    }
    async request(endpoint, options = {}) {
        const url = `${this.serverUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
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
        }
        catch {
            console.warn('RNA API connection failed, working in local mode.');
            return null;
        }
    }
    saveLocal(space, content, type) {
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
        }
        catch (error) {
            console.error('Failed to save to local RNA storage:', error);
            return false;
        }
    }
    async store(req) {
        const timestamp = new Date().toISOString();
        const factData = { ...req, created_at: timestamp };
        this.saveLocal(req.space, factData, req.type);
        const apiResult = await this.request('/v1/facts', {
            method: 'POST',
            body: JSON.stringify(req),
        });
        return apiResult || { id: `local_${Date.now()}` };
    }
    async bootstrap(req) {
        const apiResult = await this.request('/v1/agents/bootstrap', {
            method: 'POST',
            body: JSON.stringify(req),
        });
        if (apiResult)
            return apiResult;
        return { injection: 'RNA Local Mode: usando cache local ~/.rna/' };
    }
    async query(req) {
        const apiResult = await this.request(`/v1/facts?space_id=${req.space.replace('rna:/', '')}`, {
            method: 'GET',
        });
        if (apiResult)
            return apiResult;
        try {
            const relativePath = req.space.replace('rna:/', '').replace(/:/g, '/');
            const targetDir = path.join(this.localPath, relativePath);
            if (fs.existsSync(targetDir)) {
                const files = fs.readdirSync(targetDir);
                return files
                    .filter((f) => f.endsWith('.json'))
                    .map((f) => JSON.parse(fs.readFileSync(path.join(targetDir, f), 'utf-8')));
            }
        }
        catch {
            return [];
        }
        return [];
    }
    async learnFromError(req) {
        this.saveLocal('rna:/operacional/aprendizaje/errores', req, 'ERROR');
        await this.request('/v1/agents/learn/error', {
            method: 'POST',
            body: JSON.stringify(req),
        });
    }
    async learnFromSuccess(req) {
        this.saveLocal('rna:/operacional/aprendizaje/exitos', req, 'SUCCESS');
        await this.request('/v1/agents/learn/success', {
            method: 'POST',
            body: JSON.stringify(req),
        });
    }
    async suggestFix(errorMsg) {
        const apiResult = await this.request('/v1/agents/suggest', {
            method: 'POST',
            body: JSON.stringify({ error: errorMsg }),
        });
        return apiResult || [];
    }
}
export const rnaLink = new RNALink();
