import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import spacesRoutes from './routes/spaces.js';
import factsRoutes from './routes/facts.js';
import transactionsRoutes from './routes/transactions.js';
import devicesRoutes from './routes/devices.js';
import initQdrant from './utils/initQdrant.js';

const app = express();
const port = Number(process.env.PORT) || 3005;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Initialize Qdrant collections
initQdrant().catch(console.error);

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/v1/spaces', spacesRoutes);
app.use('/v1/facts', factsRoutes);
app.use('/v1/transactions', transactionsRoutes);
app.use('/v1/devices', devicesRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'rna-api'
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`RNA API listening at http://0.0.0.0:${port}`);
});
