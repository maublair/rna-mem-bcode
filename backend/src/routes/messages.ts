import { Router, type Request, type Response } from 'express';
import { queryFacts, storeFact } from '../services/memoryService.js';
import { deviceAuth, type AuthedRequest } from '../middleware/deviceAuth.js';

const router = Router();
router.use(deviceAuth);

function normalizeAgent(agentId: unknown) {
  return String(agentId || 'unknown').trim().toLowerCase() || 'unknown';
}

function buildOrigin(req: Request, agentId: string) {
  return {
    agent_id: agentId,
    device_id: (req as AuthedRequest).device?.deviceId || null,
    runtime: String(req.body?.source_runtime || req.body?.runtime || req.headers['user-agent'] || 'unknown'),
    workspace: String(req.body?.source_workspace || req.body?.workspace || 'rna-console'),
    ip: req.ip || req.socket.remoteAddress || null,
  };
}

async function storeMessageFact(req: AuthedRequest, input: { fromAgent: string; toAgent: string; content: string; channel: string; sourceRuntime: string; sourceWorkspace: string; metadata?: Record<string, unknown>; tags?: string[]; }) {
  const fact = await storeFact({
    spaceId: 'public/messages',
    content: input.content,
    type: 'message',
    tags: input.tags || [],
    sourceAgent: input.fromAgent,
    sourceDevice: req.device?.deviceId || undefined,
    sourceRuntime: input.sourceRuntime,
    sourceWorkspace: input.sourceWorkspace,
    metadata: {
      ...(input.metadata || {}),
      status: 'synced',
      from_agent: input.fromAgent,
      to_agent: input.toAgent,
      channel: input.channel,
      origin: buildOrigin(req, input.fromAgent),
    },
  });
  return { fact };
}

router.get('/', async (req: AuthedRequest, res: Response) => {
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

router.post('/', async (req: AuthedRequest, res: Response) => {
  const fromAgent = normalizeAgent(req.body?.from_agent || req.body?.agent_id || req.device?.deviceName);
  const toAgent = String(req.body?.to_agent || 'all').trim().toLowerCase();
  const content = String(req.body?.content || req.body?.message || '').trim();
  if (!content) return res.status(400).json({ error: 'missing_content' });
  try {
    const result = await storeMessageFact(req, {
      fromAgent,
      toAgent,
      content,
      channel: String(req.body?.channel || 'public'),
      sourceRuntime: String(req.body?.source_runtime || req.body?.runtime || req.headers['user-agent'] || 'unknown'),
      sourceWorkspace: String(req.body?.source_workspace || req.body?.workspace || 'rna-console'),
      metadata: { ...(req.body?.metadata || {}) },
      tags: Array.isArray(req.body?.tags) ? req.body.tags.map(String) : [],
    });
    res.status(201).json({ ...result, message: { from_agent: fromAgent, to_agent: toAgent, channel: String(req.body?.channel || 'public'), content } });
  } catch (error: any) {
    console.error('Message create failed:', error);
    res.status(500).json({ error: 'message_create_failed', detail: error.message });
  }
});

export default router;
