import { Router, type Response } from 'express';
import { deviceAuth, type AuthedRequest } from '../middleware/deviceAuth.js';
import { listProjectFiles, listProjects, upsertProject, upsertProjectFile } from '../services/memoryService.js';

const router = Router();
router.use(deviceAuth);

router.get('/', async (_req: AuthedRequest, res: Response) => {
  const projects = await listProjects(Number(_req.query.limit || 100));
  res.json(projects);
});

router.post('/', async (req: AuthedRequest, res: Response) => {
  const projectId = String(req.body?.project_id || req.body?.id || '').trim();
  const title = String(req.body?.title || '').trim();
  if (!projectId || !title) return res.status(400).json({ error: 'missing_project_id_or_title' });
  const project = await upsertProject({
    project_id: projectId,
    space_id: req.body?.space_id ? String(req.body.space_id) : null,
    title,
    objective: req.body?.objective ? String(req.body.objective) : null,
    status: req.body?.status ? String(req.body.status) : null,
    priority: req.body?.priority ? String(req.body.priority) : null,
    owner_agent: req.body?.owner_agent ? String(req.body.owner_agent) : req.device?.deviceId || null,
    current_session_id: req.body?.current_session_id ? String(req.body.current_session_id) : null,
    active_topics: Array.isArray(req.body?.active_topics) ? req.body.active_topics.map(String) : [],
    parallel_tracks: Array.isArray(req.body?.parallel_tracks) ? req.body.parallel_tracks.map(String) : [],
    handoff_card: req.body?.handoff_card ? String(req.body.handoff_card) : null,
    relations: Array.isArray(req.body?.relations) ? req.body.relations : [],
    artifacts: Array.isArray(req.body?.artifacts) ? req.body.artifacts : [],
    milestones: Array.isArray(req.body?.milestones) ? req.body.milestones.map(String) : [],
    risks: Array.isArray(req.body?.risks) ? req.body.risks.map(String) : [],
    decisions: Array.isArray(req.body?.decisions) ? req.body.decisions.map(String) : [],
    open_questions: Array.isArray(req.body?.open_questions) ? req.body.open_questions.map(String) : [],
    brainstorming: Array.isArray(req.body?.brainstorming) ? req.body.brainstorming.map(String) : [],
    constraints: Array.isArray(req.body?.constraints) ? req.body.constraints.map(String) : [],
    version: req.body?.version ? String(req.body.version) : null,
    metadata: req.body?.metadata || {},
  });
  res.status(201).json(project);
});

router.get('/:projectId/files', async (req: AuthedRequest, res: Response) => {
  const files = await listProjectFiles(req.params.projectId, Number(req.query.limit || 200));
  res.json(files);
});

router.post('/:projectId/files', async (req: AuthedRequest, res: Response) => {
  const filename = String(req.body?.filename || '').trim();
  const content = req.body?.content != null ? String(req.body.content) : null;
  const summary = req.body?.summary != null ? String(req.body.summary) : null;
  if (!filename) return res.status(400).json({ error: 'missing_filename' });
  const file = await upsertProjectFile({
    project_id: req.params.projectId,
    filename,
    mime_type: req.body?.mime_type ? String(req.body.mime_type) : null,
    size_bytes: req.body?.size_bytes != null ? Number(req.body.size_bytes) : null,
    content,
    summary,
    tags: Array.isArray(req.body?.tags) ? req.body.tags.map(String) : [],
    metadata: req.body?.metadata || {},
    source_agent: req.body?.source_agent ? String(req.body.source_agent) : req.device?.deviceName || null,
    source_device: req.body?.source_device ? String(req.body.source_device) : req.device?.deviceId || null,
    source_runtime: req.body?.source_runtime ? String(req.body.source_runtime) : String(req.headers['user-agent'] || 'unknown'),
    source_workspace: req.body?.source_workspace ? String(req.body.source_workspace) : 'rna-console',
  });
  res.status(201).json(file);
});

export default router;
