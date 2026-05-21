import { Router } from 'express';
import { deviceAuth, AuthedRequest } from '../middleware/deviceAuth.js';
import { appendBitacora, queryBitacora, queryFacts, storeFact } from '../services/memoryService.js';

const router = Router();
router.use(deviceAuth);

function normalizeAgent(agentId: unknown) {
  const value = String(agentId || 'unknown').trim().toLowerCase();
  return value || 'unknown';
}

async function storeOperationalFact(input: { content: string; type: string; tags: string[] }) {
  const fact = await storeFact({
    spaceId: 'operacional',
    content: input.content,
    type: input.type,
    tags: input.tags,
  });
  return { id: fact.id, status: 'created', fact };
}

router.post('/bootstrap', async (req: AuthedRequest, res) => {
  const agentId = normalizeAgent(req.body?.agent_id);
  const message = String(req.body?.message || '').slice(0, 500);
  const maxItems = Math.min(Number(req.body?.max_items || 12), 25);

  try {
    const [tasks, learnings] = await Promise.all([
      queryFacts({ spaceId: 'operacional', type: 'task', targetAgent: agentId, limit: maxItems }),
      queryFacts({ spaceId: 'operacional', limit: maxItems }),
    ]);
    const usefulLearnings = learnings.filter(fact => fact.type !== 'task');
    const injection = [
      `RNA bootstrap for ${agentId}.`,
      message ? `Session: ${message}` : '',
      tasks.length ? `Open tasks: ${tasks.map(task => task.content).join(' | ')}` : 'Open tasks: none found.',
      usefulLearnings.length ? `Useful learnings: ${usefulLearnings.map(item => item.content).join(' | ')}` : 'Useful learnings: none found.',
    ].filter(Boolean).join('\n');

    res.json({ injection, tasks, learnings: usefulLearnings });
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

router.post('/trace', async (req: AuthedRequest, res) => {
  const agentId = normalizeAgent(req.body?.agent_id || req.device?.deviceName);
  const command = String(req.body?.command || '').trim();
  const status = String(req.body?.status || '').trim().toUpperCase();
  if (!command || !status) {
    return res.status(400).json({ error: 'missing_command_or_status' });
  }

  try {
    const entry = await appendBitacora({
      agentId,
      deviceId: req.device?.deviceId,
      sessionId: req.body?.session_id ? String(req.body.session_id) : undefined,
      cwd: req.body?.cwd ? String(req.body.cwd) : undefined,
      command,
      status,
      resultSummary: req.body?.result_summary ? String(req.body.result_summary) : undefined,
      stdoutRef: req.body?.stdout_ref ? String(req.body.stdout_ref) : undefined,
      stderrRef: req.body?.stderr_ref ? String(req.body.stderr_ref) : undefined,
      errorMessage: req.body?.error_message ? String(req.body.error_message) : undefined,
      durationMs: req.body?.duration_ms ? Number(req.body.duration_ms) : undefined,
      metadata: req.body?.metadata || {},
    });
    res.status(201).json(entry);
  } catch (error: any) {
    console.error('Agent trace append failed:', error);
    res.status(500).json({ error: 'trace_failed', detail: error.message });
  }
});

router.get('/trace', async (req: AuthedRequest, res) => {
  try {
    const entries = await queryBitacora({
      agentId: req.query.agent_id ? normalizeAgent(req.query.agent_id) : undefined,
      limit: Number(req.query.limit || 100),
    });
    res.json(entries);
  } catch (error: any) {
    console.error('Agent trace query failed:', error);
    res.status(500).json({ error: 'trace_query_failed', detail: error.message });
  }
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
    const facts = await queryFacts({ spaceId: 'operacional', limit: 100 });
    const needle = error.slice(0, 120);
    res.json(
      facts
        .filter(fact => ['error-pattern', 'success-pattern'].includes(fact.type))
        .filter(fact => String(fact.content || '').toLowerCase().includes(needle))
        .slice(0, 8)
        .map(fact => fact.content)
    );
  } catch (queryError: any) {
    console.error('Agent suggest failed:', queryError);
    res.status(500).json({ error: 'suggest_failed', detail: queryError.message });
  }
});

export default router;
