import { Router } from 'express';
import { deviceAuth, AuthedRequest } from '../middleware/deviceAuth.js';
import {
  appendBitacora,
  listHandoffCards,
  listSessions,
  listTopicRelations,
  listTopics,
  queryBitacora,
  queryFacts,
  storeFact,
  upsertHandoffCard,
  upsertSession,
  upsertTopic,
  upsertTopicRelation,
} from '../services/memoryService.js';

const router = Router();
router.use(deviceAuth);

function normalizeAgent(agentId: unknown) {
  const value = String(agentId || 'unknown').trim().toLowerCase();
  return value || 'unknown';
}

function buildOrigin(req: AuthedRequest, agentId: string) {
  return {
    source_agent: agentId,
    source_device: req.device?.deviceId || null,
    source_runtime: String(req.body?.source_runtime || req.body?.runtime || req.headers['user-agent'] || 'unknown'),
    source_workspace: String(req.body?.source_workspace || req.body?.workspace || 'rna-console'),
  };
}

async function storeOperationalFact(input: {
  content: string;
  type: string;
  tags: string[];
  sourceAgent?: string;
  sourceDevice?: string | null;
  sourceRuntime?: string | null;
  sourceWorkspace?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const fact = await storeFact({
    spaceId: 'operacional',
    content: input.content,
    type: input.type,
    tags: input.tags,
    sourceAgent: input.sourceAgent,
    sourceDevice: input.sourceDevice || undefined,
    sourceRuntime: input.sourceRuntime || undefined,
    sourceWorkspace: input.sourceWorkspace || undefined,
    metadata: input.metadata || {},
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

router.get('/sessions', async (req: AuthedRequest, res) => {
  try {
    const sessions = await listSessions(Number(req.query.limit || 50), req.query.agent_id ? normalizeAgent(req.query.agent_id) : undefined);
    res.json(sessions);
  } catch (error: any) {
    console.error('Session list failed:', error);
    res.status(500).json({ error: 'session_list_failed', detail: error.message });
  }
});

router.post('/session', async (req: AuthedRequest, res) => {
  const agentId = normalizeAgent(req.body?.agent_id || req.device?.deviceName);
  const sessionId = String(req.body?.session_id || '').trim();
  const objective = String(req.body?.objective || req.body?.message || '').trim();
  if (!sessionId || !objective) {
    return res.status(400).json({ error: 'missing_session_id_or_objective' });
  }
  try {
    const session = await upsertSession({
      agent_id: agentId,
      session_id: sessionId,
      objective,
      status: String(req.body?.status || 'active'),
      summary: req.body?.summary ? String(req.body.summary) : null,
      started_at: req.body?.started_at ? String(req.body.started_at) : undefined,
      ended_at: req.body?.ended_at ? String(req.body.ended_at) : undefined,
      metadata: { ...(req.body?.metadata || {}), origin: buildOrigin(req, agentId) },
    });
    res.status(201).json(session);
  } catch (error: any) {
    console.error('Session upsert failed:', error);
    res.status(500).json({ error: 'session_upsert_failed', detail: error.message });
  }
});

router.post('/session/:sessionId/close', async (req: AuthedRequest, res) => {
  const agentId = normalizeAgent(req.body?.agent_id || req.device?.deviceName);
  const sessionId = String(req.params.sessionId || '').trim();
  if (!sessionId) return res.status(400).json({ error: 'missing_session_id' });
  try {
    const session = await upsertSession({
      agent_id: agentId,
      session_id: sessionId,
      objective: String(req.body?.objective || req.body?.message || 'closed-session').trim(),
      status: 'closed',
      summary: req.body?.summary ? String(req.body.summary) : null,
      started_at: req.body?.started_at ? String(req.body.started_at) : undefined,
      ended_at: req.body?.ended_at ? String(req.body.ended_at) : new Date().toISOString(),
      metadata: { ...(req.body?.metadata || {}), origin: buildOrigin(req, agentId) },
    });
    res.json(session);
  } catch (error: any) {
    console.error('Session close failed:', error);
    res.status(500).json({ error: 'session_close_failed', detail: error.message });
  }
});

router.get('/topics', async (req: AuthedRequest, res) => {
  try {
    res.json(await listTopics(Number(req.query.limit || 50)));
  } catch (error: any) {
    console.error('Topic list failed:', error);
    res.status(500).json({ error: 'topic_list_failed', detail: error.message });
  }
});

router.post('/topics', async (req: AuthedRequest, res) => {
  const topicId = String(req.body?.topic_id || '').trim();
  const title = String(req.body?.title || '').trim();
  if (!topicId || !title) return res.status(400).json({ error: 'missing_topic_id_or_title' });
  try {
    res.status(201).json(
      await upsertTopic({
        topic_id: topicId,
        title,
        summary: req.body?.summary ? String(req.body.summary) : null,
        tags: Array.isArray(req.body?.tags) ? req.body.tags.map(String) : [],
        session_id: req.body?.session_id ? String(req.body.session_id) : null,
        related_topics: Array.isArray(req.body?.related_topics) ? req.body.related_topics.map(String) : [],
        metadata: { ...(req.body?.metadata || {}), origin: buildOrigin(req, normalizeAgent(req.body?.agent_id || req.device?.deviceName)) },
      })
    );
  } catch (error: any) {
    console.error('Topic upsert failed:', error);
    res.status(500).json({ error: 'topic_upsert_failed', detail: error.message });
  }
});

router.get('/topics/relations', async (req: AuthedRequest, res) => {
  try {
    res.json(await listTopicRelations(Number(req.query.limit || 100)));
  } catch (error: any) {
    console.error('Topic relation list failed:', error);
    res.status(500).json({ error: 'topic_relation_list_failed', detail: error.message });
  }
});

router.post('/topics/relations', async (req: AuthedRequest, res) => {
  const sourceTopic = String(req.body?.source_topic || '').trim();
  const targetTopic = String(req.body?.target_topic || '').trim();
  const relationType = String(req.body?.relation_type || 'related').trim();
  if (!sourceTopic || !targetTopic) return res.status(400).json({ error: 'missing_relation_topics' });
  try {
    res.status(201).json(
      await upsertTopicRelation({
        source_topic: sourceTopic,
        target_topic: targetTopic,
        relation_type: relationType,
        weight: Number(req.body?.weight || 0.5),
        metadata: { ...(req.body?.metadata || {}), origin: buildOrigin(req, normalizeAgent(req.body?.agent_id || req.device?.deviceName)) },
      })
    );
  } catch (error: any) {
    console.error('Topic relation upsert failed:', error);
    res.status(500).json({ error: 'topic_relation_upsert_failed', detail: error.message });
  }
});

router.get('/handoff', async (req: AuthedRequest, res) => {
  try {
    res.json(await listHandoffCards(Number(req.query.limit || 50), req.query.agent_id ? normalizeAgent(req.query.agent_id) : undefined));
  } catch (error: any) {
    console.error('Handoff list failed:', error);
    res.status(500).json({ error: 'handoff_list_failed', detail: error.message });
  }
});

router.post('/handoff', async (req: AuthedRequest, res) => {
  const agentId = normalizeAgent(req.body?.agent_id || req.device?.deviceName);
  const summary = String(req.body?.summary || '').trim();
  if (!summary) return res.status(400).json({ error: 'missing_summary' });
  try {
    res.status(201).json(
      await upsertHandoffCard({
        agent_id: agentId,
        session_id: req.body?.session_id ? String(req.body.session_id) : null,
        topic_id: req.body?.topic_id ? String(req.body.topic_id) : null,
        summary,
        next_steps: Array.isArray(req.body?.next_steps) ? req.body.next_steps.map(String) : [],
        blockers: Array.isArray(req.body?.blockers) ? req.body.blockers.map(String) : [],
        avoid: Array.isArray(req.body?.avoid) ? req.body.avoid.map(String) : [],
        metadata: { ...(req.body?.metadata || {}), origin: buildOrigin(req, agentId) },
      })
    );
  } catch (error: any) {
    console.error('Handoff upsert failed:', error);
    res.status(500).json({ error: 'handoff_upsert_failed', detail: error.message });
  }
});


router.get('/messages', async (req: AuthedRequest, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const toAgent = req.query.to_agent ? normalizeAgent(req.query.to_agent) : undefined;
    const facts = await queryFacts({ spaceId: 'public/messages', limit });
    const messages = facts
      .filter((fact: any) => fact.type === 'message')
      .filter((fact: any) => {
        if (!toAgent) return true;
        const target = String(fact.metadata?.to_agent || fact.metadata?.toAgent || '').toLowerCase();
        return target === toAgent || target === 'all';
      })
      .map((fact: any) => ({
        id: fact.id,
        from_agent: String(fact.metadata?.from_agent || fact.source_agent || 'unknown'),
        to_agent: String(fact.metadata?.to_agent || 'all'),
        channel: String(fact.metadata?.channel || 'public'),
        content: fact.content,
        tags: Array.isArray(fact.tags) ? fact.tags : [],
        metadata: fact.metadata || {},
        source_device: fact.source_device || null,
        source_agent: fact.source_agent || null,
        source_runtime: fact.source_runtime || null,
        source_workspace: fact.source_workspace || null,
        status: String(fact.metadata?.status || 'synced'),
        created_at: fact.created_at,
        updated_at: fact.created_at,
      }));
    res.json(messages);
  } catch (error: any) {
    console.error('Message list failed:', error);
    res.status(500).json({ error: 'message_list_failed', detail: error.message });
  }
});

router.post('/messages', async (req: AuthedRequest, res) => {
  const fromAgent = normalizeAgent(req.body?.from_agent || req.body?.agent_id || req.device?.deviceName);
  const toAgent = String(req.body?.to_agent || 'all').trim().toLowerCase();
  const content = String(req.body?.content || req.body?.message || '').trim();
  if (!content) return res.status(400).json({ error: 'missing_content' });
  try {
    const result = await storeOperationalFact({
      content,
      type: 'message',
      tags: ['message', `from:${fromAgent}`, `to:${toAgent}`, `channel:${String(req.body?.channel || 'public')}`],
      sourceAgent: fromAgent,
      sourceDevice: req.device?.deviceId || null,
      sourceRuntime: String(req.body?.source_runtime || req.body?.runtime || req.headers['user-agent'] || 'unknown'),
      sourceWorkspace: String(req.body?.source_workspace || req.body?.workspace || 'rna-console'),
      metadata: {
        ...(req.body?.metadata || {}),
        status: 'synced',
        from_agent: fromAgent,
        to_agent: toAgent,
        channel: String(req.body?.channel || 'public'),
        origin: buildOrigin(req, fromAgent),
      },
    });
    const payload = {
      ...result,
      message: {
        from_agent: fromAgent,
        to_agent: toAgent,
        channel: String(req.body?.channel || 'public'),
        content,
        tags: Array.isArray(req.body?.tags) ? req.body.tags.map(String) : [],
        metadata: result.fact.metadata || {},
      },
    };
    res.status(201).json(payload);
  } catch (error: any) {
    console.error('Message create failed:', error);
    res.status(500).json({ error: 'message_create_failed', detail: error.message });
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
      metadata: { ...(req.body?.metadata || {}), origin: buildOrigin(req, agentId) },
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
