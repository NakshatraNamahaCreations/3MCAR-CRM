// Register global Mongoose plugins BEFORE any model compiles (via route imports).
import './config/registerPlugins.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import { sendSuccess } from './utils/apiResponse.js';
import { runWithContext } from './utils/requestContext.js';

const app = express();

// Security & parsing
// CORP relaxed so the admin frontend (different subdomain) can fetch API
// resources (e.g. PDF blobs) without being blocked by the browser.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins =
  (process.env.CLIENT_ORIGIN || '*') === '*'
    ? true
    : process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Branch-Id'],
    exposedHeaders: ['Content-Disposition'],
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Run every request inside an audit context (populated by `protect`).
app.use((req, res, next) => runWithContext(() => next()));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) =>
  sendSuccess(res, { message: 'API is healthy', data: { time: new Date().toISOString() } })
);

// All feature routes mounted under /api
app.use('/api', routes);

// 404 + error handling (must be last)
app.use(notFound);
app.use(errorHandler);

export default app;
