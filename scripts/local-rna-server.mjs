import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const root = path.join(os.homedir(), '.rna');
const port = Number(process.env.PORT || 3017);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 5_000_000) req.destroy();
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization, x-api-key',
    'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
  });
  res.end(JSON.stringify(body));
}

function factDir(space) {
  return path.join(root, String(space || 'operacional').replace(/^rna:\//, '').replaceAll(':', path.sep));
}

function saveFact({ space = 'operacional', content, type = 'note', tags = [], metadata = {} }) {
  const dir = factDir(space);
  ensureDir(dir);
  const id = crypto.randomUUID();
  const fact = {
    id,
    space,
    content,
    type,
    tags,
    metadata,
    created_at: new Date().toISOString(),
    sync_status: 'local-api',
  };
  fs.writeFileSync(path.join(dir, `${type.toLowerCase()}_${id}.json`), JSON.stringify(fact, null, 2));
  return fact;
}

function readFacts(space = 'operacional') {
  const dir = factDir(space);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const file of fs.readdirSync(dir, { recursive: true })) {
    if (!String(file).endsWith('.json')) continue;
    const full = path.join(dir, file);
    try {
      const raw = fs.readFileSync(full, 'utf8');
      if (raw.trim()) out.push(JSON.parse(raw));
    } catch {
      // Ignore malformed local cache entries.
    }
  }
  return out.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

function bootstrap(agentId, message) {
  const facts = readFacts('operacional').slice(0, 20);
  const tasks = facts.filter(f => f.type === 'task' && ((f.tags || []).includes('for:any') || (f.tags || []).includes(`for:${agentId}`)));
  const learnings = facts.filter(f => f.type !== 'task').slice(0, 12);
  return {
    injection: [
      `RNA local bootstrap for ${agentId}.`,
      message ? `Session: ${message}` : '',
      tasks.length ? `Open tasks: ${tasks.map(t => t.content).join(' | ')}` : 'Open tasks: none found.',
      learnings.length ? `Useful learnings: ${learnings.map(l => l.content).join(' | ')}` : 'Useful learnings: none found.',
    ].filter(Boolean).join('\n'),
    tasks,
    learnings,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, { status: 'healthy', mode: 'local-api', root, timestamp: new Date().toISOString() });
    }

    if (req.method === 'GET' && url.pathname === '/v1/facts') {
      return send(res, 200, readFacts(url.searchParams.get('space') || url.searchParams.get('space_id') || 'operacional'));
    }

    if (req.method === 'POST' && url.pathname === '/v1/facts') {
      const body = await readBody(req);
      const fact = saveFact({
        space: body.space || body.space_id || 'operacional',
        content: String(body.content || ''),
        type: String(body.type || 'note'),
        tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
        metadata: body.metadata || {},
      });
      return send(res, 201, { id: fact.id, status: 'created', fact });
    }

    if (req.method === 'POST' && url.pathname === '/v1/agents/bootstrap') {
      const body = await readBody(req);
      return send(res, 200, bootstrap(String(body.agent_id || 'unknown'), String(body.message || '')));
    }

    if (req.method === 'POST' && url.pathname === '/v1/agents/trace') {
      const body = await readBody(req);
      const fact = saveFact({
        space: `operacional/bitacora/${body.agent_id || 'unknown'}`,
        content: `${body.status || 'TRACE'}: ${body.command || ''}\n${body.result_summary || ''}\n${body.error_message || ''}`,
        type: 'trace',
        tags: ['bitacora', `agent:${body.agent_id || 'unknown'}`, `status:${body.status || 'TRACE'}`],
        metadata: body,
      });
      return send(res, 201, fact);
    }

    return send(res, 404, { error: 'not_found' });
  } catch (error) {
    return send(res, 500, { error: 'internal_error', detail: error.message });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Local RNA API listening at http://127.0.0.1:${port}`);
});
