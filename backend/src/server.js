import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`[server] Car Workshop CRM API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });

  // Handle listen errors gracefully instead of crashing with an unhandled 'error' event.
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[server] Port ${PORT} is already in use by another process.\n` +
          `         Stop that process, or set a different PORT in backend/.env (e.g. PORT=5001).`
      );
    } else {
      console.error('[server] Failed to start HTTP server:', err.message);
    }
    process.exit(1);
  });

  // Graceful shutdown.
  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down…`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start();

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});
