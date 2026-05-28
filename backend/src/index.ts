import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import spacesRoutes from './routes/spaces.js';
import factsRoutes from './routes/facts.js';
import agentsRoutes from './routes/agents.js';
import collectionsRoutes from './routes/collections.js';
import syncRoutes from './routes/sync.js';
import backupsRoutes from './routes/backups.js';
import transactionsRoutes from './routes/transactions.js';
import devicesRoutes from './routes/devices.js';
import infrastructureRoutes from './routes/infrastructure.js';
import systemRoutes from './routes/system.js';
import initQdrant from './utils/initQdrant.js';
import { redisClient } from './services/embeddingService.js';

const app = express();
const port = Number(process.env.PORT) || 3005;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/v1/spaces', spacesRoutes);
app.use('/v1/facts', factsRoutes);
app.use('/v1/agents', agentsRoutes);
app.use('/v1/collections', collectionsRoutes);
app.use('/v1/sync', syncRoutes);
app.use('/v1/backups', backupsRoutes);
app.use('/v1/transactions', transactionsRoutes);
app.use('/v1/devices', devicesRoutes);
app.use('/v1/infrastructure', infrastructureRoutes);
app.use('/v1/system', systemRoutes);

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), service: 'rna-api' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`RNA API listening at http://0.0.0.0:${port}`);
});

async function bootstrap() {
  const tasks = [
    redisClient.connect().then(() => console.log('Redis connected')).catch(err => console.error('Redis bootstrap failed', err)),
    initQdrant().then(() => console.log('Qdrant initialized')).catch(err => console.error('Qdrant bootstrap failed', err)),
  ];
  await Promise.allSettled(tasks);
}

void bootstrap();
