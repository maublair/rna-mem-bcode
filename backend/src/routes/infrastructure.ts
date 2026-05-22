import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { deviceAuth, AuthedRequest } from '../middleware/deviceAuth.js';
import {
  createServer,
  createService,
  createDevice,
  createRelationship,
  getServers,
  getServices,
  getDevices,
  getRelationships,
  getInfrastructureGraph,
  ensureInfrastructureSchema,
  type InfrastructureServer,
  type InfrastructureService,
  type InfrastructureDevice,
  type InfrastructureRelationship,
} from '../services/infrastructureService.js';

const router = Router();
router.use(deviceAuth);

// Servers endpoints
router.get('/servers', async (req, res) => {
  try {
    const servers = await getServers();
    res.json(servers);
  } catch (error: any) {
    console.error('Error fetching servers:', error);
    res.status(500).json({ error: 'Internal Server Error', detail: error.message });
  }
});

router.post('/servers', async (req: AuthedRequest, res) => {
  const { name, os, osVersion, ip, sshPort, location, environment, description, metadata } = req.body;
  if (!name || !os || !environment) {
    return res.status(400).json({ error: 'missing_required_fields', required: ['name', 'os', 'environment'] });
  }

  try {
    const server: InfrastructureServer = {
      id: uuidv4(),
      name,
      os,
      osVersion,
      ip,
      sshPort,
      location,
      environment,
      description,
      metadata,
    };
    const created = await createServer(server);
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Error creating server:', error);
    res.status(500).json({ error: error.message });
  }
});

// Services endpoints
router.get('/services', async (req, res) => {
  try {
    const services = await getServices();
    res.json(services);
  } catch (error: any) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal Server Error', detail: error.message });
  }
});

router.post('/services', async (req: AuthedRequest, res) => {
  const { name, type, port, protocol, status, description, metadata } = req.body;
  if (!name || !type || !status) {
    return res.status(400).json({ error: 'missing_required_fields', required: ['name', 'type', 'status'] });
  }

  try {
    const service: InfrastructureService = {
      id: uuidv4(),
      name,
      type,
      port,
      protocol,
      status,
      description,
      metadata,
    };
    const created = await createService(service);
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: error.message });
  }
});

// Devices endpoints
router.get('/devices', async (req, res) => {
  try {
    const devices = await getDevices();
    res.json(devices);
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Internal Server Error', detail: error.message });
  }
});

router.post('/devices', async (req: AuthedRequest, res) => {
  const { name, type, os, osVersion, owner, location, description, metadata } = req.body;
  if (!name || !type || !os) {
    return res.status(400).json({ error: 'missing_required_fields', required: ['name', 'type', 'os'] });
  }

  try {
    const device: InfrastructureDevice = {
      id: uuidv4(),
      name,
      type,
      os,
      osVersion,
      owner,
      location,
      description,
      metadata,
    };
    const created = await createDevice(device);
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Error creating device:', error);
    res.status(500).json({ error: error.message });
  }
});

// Relationships endpoints
router.get('/relationships', async (req, res) => {
  try {
    const { sourceId, targetId, type } = req.query;
    const relationships = await getRelationships({
      sourceId: sourceId ? String(sourceId) : undefined,
      targetId: targetId ? String(targetId) : undefined,
      type: type ? String(type) : undefined,
    });
    res.json(relationships);
  } catch (error: any) {
    console.error('Error fetching relationships:', error);
    res.status(500).json({ error: 'Internal Server Error', detail: error.message });
  }
});

router.post('/relationships', async (req: AuthedRequest, res) => {
  const { sourceId, sourceType, targetId, targetType, type, metadata } = req.body;
  if (!sourceId || !sourceType || !targetId || !targetType || !type) {
    return res.status(400).json({
      error: 'missing_required_fields',
      required: ['sourceId', 'sourceType', 'targetId', 'targetType', 'type'],
    });
  }

  try {
    const relationship: InfrastructureRelationship = {
      id: uuidv4(),
      sourceId,
      sourceType,
      targetId,
      targetType,
      type,
      metadata,
    };
    const created = await createRelationship(relationship);
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Error creating relationship:', error);
    res.status(500).json({ error: error.message });
  }
});

// Graph endpoint - returns all infrastructure data as graph
router.get('/graph', async (req, res) => {
  try {
    const graph = await getInfrastructureGraph();
    res.json(graph);
  } catch (error: any) {
    console.error('Error fetching infrastructure graph:', error);
    res.status(500).json({ error: 'Internal Server Error', detail: error.message });
  }
});

export default router;
