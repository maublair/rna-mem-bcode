import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import neo4j from '../services/neo4jService.js';
import { deviceAuth, AuthedRequest } from '../middleware/deviceAuth.js';

const router = Router();
router.use(deviceAuth);

function normalizeAgent(agentId: unknown) {
  const value = String(agentId || 'unknown').trim().toLowerCase();
  return value || 'unknown';
}

function summarizeFact(fact: any) {
  const props = fact.properties || fact;
  return {
    id: props.id,
    content: props.content,
    type: props.type,
    tags: props.tags || [],
    created_at: props.created_at,
  };
}

async function storeOperationalFact(input: { content: string; type: string; tags: string[] }) {
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  await neo4j.runQuery(
    `
    MERGE (s:Space {id: 'operacional'})
      ON CREATE SET s.name = 'operacional', s.path = 'operacional'
    CREATE (f:Fact {
      id: $id,
      content: $content,
      type: $type,
      tags: $tags,
      created_at: $timestamp
    })
    CREATE (f)-[:IN_SPACE]->(s)
    RETURN f
    `,
    { id, content: input.content, type: input.type, tags: input.tags, timestamp }
  );
  return { id, status: 'created' };
}

router.post('/bootstrap', async (req: AuthedRequest, res) => {
  const agentId = normalizeAgent(req.body?.agent_id);
  const message = String(req.body?.message || '').slice(0, 500);
  const maxItems = Math.min(Number(req.body?.max_items || 12), 25);

  try {
    const result = await neo4j.runQuery(
      `
      MATCH (f:Fact)-[:IN_SPACE]->(:Space {id: 'operacional'})
      WHERE f.type IN ['task', 'error-pattern', 'success-pattern', 'decision', 'note']
        AND (
          f.type <> 'task'
          OR 'for:any' IN coalesce(f.tags, [])
          OR $agentTag IN coalesce(f.tags, [])
        )
      RETURN f
      ORDER BY f.created_at DESC
      LIMIT $maxItems
      `,
      { agentTag: `for:${agentId}`, maxItems }
    );
    const facts = result.records.map(record => summarizeFact(record.get('f')));
    const tasks = facts.filter(fact => fact.type === 'task');
    const learnings = facts.filter(fact => fact.type !== 'task');
    const injection = [
      `RNA bootstrap for ${agentId}.`,
      message ? `Session: ${message}` : '',
      tasks.length ? `Open tasks: ${tasks.map(task => task.content).join(' | ')}` : 'Open tasks: none found.',
      learnings.length ? `Useful learnings: ${learnings.map(item => item.content).join(' | ')}` : 'Useful learnings: none found.',
    ].filter(Boolean).join('\n');

    res.json({ injection, tasks, learnings });
  } catch (error: any) {
    console.error('Agent bootstrap failed:', error);
    res.status(500).json({ error: 'bootstrap_failed', detail: error.message });
  }
});

router.post('/learn/error', async (req: AuthedRequest, res) => {
  const command = String(req.body?.command || '').trim();
  const error = String(req.body?.error || '').trim();
  const solution = String(req.body?.solution_tried || req.body?.solution || '').trim();
  if (!command || !error) {
    return res.status(400).json({ error: 'missing_command_or_error' });
  }

  const content = `Error en: ${command}\nSolucion: ${solution || 'sin resolver'}\nDetalle: ${error}`;
  const result = await storeOperationalFact({
    content,
    type: 'error-pattern',
    tags: ['learned', 'error', `agent:${normalizeAgent(req.body?.agent_id || req.device?.deviceName)}`],
  });
  res.status(201).json(result);
});

router.post('/learn/success', async (req: AuthedRequest, res) => {
  const command = String(req.body?.command || '').trim();
  const resultText = String(req.body?.result || '').trim();
  if (!command || !resultText) {
    return res.status(400).json({ error: 'missing_command_or_result' });
  }

  const result = await storeOperationalFact({
    content: `Comando exitoso: ${command}\nResultado: ${resultText}`,
    type: 'success-pattern',
    tags: ['learned', 'success', `agent:${normalizeAgent(req.body?.agent_id || req.device?.deviceName)}`],
  });
  res.status(201).json(result);
});

router.post('/suggest', async (req: AuthedRequest, res) => {
  const error = String(req.body?.error || '').toLowerCase();
  if (!error) return res.status(400).json({ error: 'missing_error' });

  try {
    const result = await neo4j.runQuery(
      `
      MATCH (f:Fact)-[:IN_SPACE]->(:Space {id: 'operacional'})
      WHERE f.type IN ['error-pattern', 'success-pattern']
        AND toLower(f.content) CONTAINS $needle
      RETURN f
      ORDER BY f.created_at DESC
      LIMIT 8
      `,
      { needle: error.slice(0, 120) }
    );
    res.json(result.records.map(record => summarizeFact(record.get('f')).content));
  } catch (queryError: any) {
    console.error('Agent suggest failed:', queryError);
    res.status(500).json({ error: 'suggest_failed', detail: queryError.message });
  }
});

export default router;
