import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import neo4j from '../services/neo4jService.js';
import qdrant from '../services/qdrantService.js';
import { getEmbedding } from '../services/embeddingService.js';
import { deviceAuth } from '../middleware/deviceAuth.js';

const router = Router();
router.use(deviceAuth);

// Bootstrap: Fetch injection context, pending tasks, and recent learnings for an agent
router.post('/bootstrap', async (req, res) => {
  const { agent_id, message, max_items = 5 } = req.body;

  if (!agent_id) {
    return res.status(400).json({ error: 'missing_agent_id' });
  }

  try {
    // Ensure operacional space exists
    await neo4j.runQuery(`
      MERGE (s:Space {id: 'operacional'})
      SET s.name = 'Operacional', s.created_at = COALESCE(s.created_at, timestamp())
      RETURN s
    `);

    // Fetch agent-specific injection context (bootstrap facts tagged for this agent)
    const injectionResult = await neo4j.runQuery(`
      MATCH (s:Space {id: 'operacional'})
      MATCH (f:Fact {type: 'bootstrap', target_agent: $agent_id})-[:IN_SPACE]->(s)
      RETURN f.content AS content
      ORDER BY f.created_at DESC
      LIMIT 1
    `, { agent_id });

    // Fetch pending tasks for this agent
    const tasksResult = await neo4j.runQuery(`
      MATCH (s:Space {id: 'operacional'})
      MATCH (f:Fact {type: 'task'})-[:IN_SPACE]->(s)
      WHERE ($agent_id IN f.target_agents OR 'all' IN f.target_agents)
      AND f.status = 'pending'
      RETURN f {.id, .content, .priority, .tags, .created_at}
      ORDER BY CASE f.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, f.created_at DESC
      LIMIT $max_items
    `, { agent_id, max_items });

    // Fetch recent learnings (error/success patterns) from this space
    const learningsResult = await neo4j.runQuery(`
      MATCH (s:Space {id: 'operacional'})
      MATCH (f:Fact {type: 'learning'})-[:IN_SPACE]->(s)
      RETURN f {.id, .content, .category, .tags, .created_at}
      ORDER BY f.created_at DESC
      LIMIT $max_items
    `, { max_items });

    const injection = injectionResult.records.length > 0
      ? injectionResult.records[0].get('content')
      : `You are agent ${agent_id}. Use /v1/agents/learn/error and /v1/agents/learn/success to report outcomes.`;

    const tasks = tasksResult.records.map(record => record.get('f'));
    const learnings = learningsResult.records.map(record => record.get('f'));

    res.json({
      status: 'ok',
      agent_id,
      injection,
      tasks: tasks.length > 0 ? tasks : [],
      learnings: learnings.length > 0 ? learnings : [],
      _at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Bootstrap error:', error);
    res.status(500).json({ error: 'bootstrap_failed', detail: error.message });
  }
});

// Learn from error: Store error pattern and optional solution attempt for future reference
router.post('/learn/error', async (req, res) => {
  const { agent_id, command, error, solution_tried } = req.body;
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  if (!command || !error) {
    return res.status(400).json({ error: 'missing_command_or_error' });
  }

  try {
    // Ensure operacional space exists
    await neo4j.runQuery(`
      MERGE (s:Space {id: 'operacional'})
      SET s.name = 'Operacional', s.created_at = COALESCE(s.created_at, timestamp())
      RETURN s
    `);

    // Create error learning fact
    const content = `Error in ${command}: ${error}${solution_tried ? `. Tried: ${solution_tried}` : ''}`;
    const tags = ['error', agent_id || 'unknown', command.split(' ')[0]];

    await neo4j.runQuery(`
      MATCH (s:Space {id: 'operacional'})
      CREATE (f:Fact {
        id: $id,
        type: 'learning',
        category: 'error',
        content: $content,
        command: $command,
        error: $error,
        solution_tried: $solution_tried,
        tags: $tags,
        agent_id: $agent_id,
        created_at: $timestamp
      })
      CREATE (f)-[:IN_SPACE]->(s)
      RETURN f
    `, { id, content, command, error, solution_tried: solution_tried || null, tags, agent_id: agent_id || null, timestamp });

    // Try to embed for vector search
    try {
      const vector = await getEmbedding(content);
      await qdrant.upsert('facts', {
        wait: true,
        points: [{
          id,
          vector,
          payload: { space_id: 'operacional', content, type: 'learning', category: 'error', tags, created_at: timestamp }
        }]
      });
    } catch (e) {
      console.error(`Embedding failed for error ${id}, continuing`, e);
    }

    res.status(201).json({ id, status: 'learning_recorded', category: 'error' });
  } catch (error: any) {
    console.error('Learn error failed:', error);
    res.status(500).json({ error: 'learn_error_failed', detail: error.message });
  }
});

// Learn from success: Store successful outcome for pattern recognition
router.post('/learn/success', async (req, res) => {
  const { agent_id, command, result } = req.body;
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  if (!command || !result) {
    return res.status(400).json({ error: 'missing_command_or_result' });
  }

  try {
    // Ensure operacional space exists
    await neo4j.runQuery(`
      MERGE (s:Space {id: 'operacional'})
      SET s.name = 'Operacional', s.created_at = COALESCE(s.created_at, timestamp())
      RETURN s
    `);

    // Create success learning fact
    const content = `Success in ${command}: ${result}`;
    const tags = ['success', agent_id || 'unknown', command.split(' ')[0]];

    await neo4j.runQuery(`
      MATCH (s:Space {id: 'operacional'})
      CREATE (f:Fact {
        id: $id,
        type: 'learning',
        category: 'success',
        content: $content,
        command: $command,
        result: $result,
        tags: $tags,
        agent_id: $agent_id,
        created_at: $timestamp
      })
      CREATE (f)-[:IN_SPACE]->(s)
      RETURN f
    `, { id, content, command, result, tags, agent_id: agent_id || null, timestamp });

    // Try to embed for vector search
    try {
      const vector = await getEmbedding(content);
      await qdrant.upsert('facts', {
        wait: true,
        points: [{
          id,
          vector,
          payload: { space_id: 'operacional', content, type: 'learning', category: 'success', tags, created_at: timestamp }
        }]
      });
    } catch (e) {
      console.error(`Embedding failed for success ${id}, continuing`, e);
    }

    res.status(201).json({ id, status: 'learning_recorded', category: 'success' });
  } catch (error: any) {
    console.error('Learn success failed:', error);
    res.status(500).json({ error: 'learn_success_failed', detail: error.message });
  }
});

// Suggest solutions: Query error patterns and suggest solutions
router.post('/suggest', async (req, res) => {
  const { error, limit = 3 } = req.body;

  if (!error) {
    return res.status(400).json({ error: 'missing_error' });
  }

  try {
    // Search for similar error patterns in operacional space
    const similarResult = await neo4j.runQuery(`
      MATCH (s:Space {id: 'operacional'})
      MATCH (f:Fact {type: 'learning', category: 'error'})-[:IN_SPACE]->(s)
      WHERE f.error CONTAINS $error_keyword OR f.content CONTAINS $error_keyword
      RETURN f {.id, .content, .error, .solution_tried, .tags, .created_at}
      ORDER BY f.created_at DESC
      LIMIT $limit
    `, { error_keyword: error.split(' ')[0], limit });

    // Also try to find solutions from success patterns with similar command
    const successResult = await neo4j.runQuery(`
      MATCH (s:Space {id: 'operacional'})
      MATCH (f:Fact {type: 'learning', category: 'success'})-[:IN_SPACE]->(s)
      RETURN f {.id, .content, .result, .tags, .created_at}
      ORDER BY f.created_at DESC
      LIMIT 2
    `, { limit });

    const errorPatterns = similarResult.records.map(record => record.get('f'));
    const successPatterns = successResult.records.map(record => record.get('f'));

    res.json({
      status: 'ok',
      error,
      errorPatterns,
      successPatterns,
      suggestion: errorPatterns.length > 0
        ? `Found ${errorPatterns.length} similar error(s). Last attempt: ${errorPatterns[0].solution_tried || 'none recorded'}`
        : 'No similar errors found. Check logs or consult documentation.',
      _at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Suggest error:', error);
    res.status(500).json({ error: 'suggest_failed', detail: error.message });
  }
});

export default router;
