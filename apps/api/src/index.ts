import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { authRouter } from './routes/auth';
import { configRouter } from './routes/config';
import { blogRouter } from './routes/blog';
import { pagesRouter } from './routes/pages';
import { mediaRouter } from './routes/media';
import { publishRouter } from './routes/publish';
import { adminRouter } from './routes/admin';
import templateSchemaRouter from './routes/template-schema';
import siteManagementRouter from './routes/site-management';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ?? 4000;

const allowedOrigins = [
  'http://localhost:5173',
  ...(process.env.UI_URL ? process.env.UI_URL.split(',').map(o => o.trim()) : []),
];

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/api/auth',             authRouter);
app.use('/api/config',           configRouter);
app.use('/api/blog',             blogRouter);
app.use('/api/pages',            pagesRouter);
app.use('/api/media',            mediaRouter);
app.use('/api/publish',          publishRouter);
app.use('/api/admin',            adminRouter);
app.use('/api/template-schema',  templateSchemaRouter);
app.use('/api/site',             siteManagementRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`CMS API running on http://localhost:${PORT}`);
});
