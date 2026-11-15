import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDb, initializeDatabase } from './server/db.ts';
import { authRouter, handleGoogleCallback, handleMicrosoftCallback } from './server/routes/auth.ts';
import { checkoutRouter } from './server/routes/checkout.ts';
import { platformRouter } from './server/routes/platform.ts';
import { productsRouter } from './server/routes/products.ts';
import { seedInitialData } from './server/seed.ts';

async function startServer() {
  initializeDatabase();
  seedInitialData();

  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // High-availability AWS ALB / Multi-AZ zero-downtime health probes
  const healthHandler = (_req: express.Request, res: express.Response) => {
    let dbHealthy = false;
    try {
      const row = getDb().prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
      dbHealthy = row?.ok === 1;
    } catch {
      dbHealthy = false;
    }

    const uptimeSec = Math.floor(process.uptime());
    res.status(dbHealthy ? 200 : 503).json({
      status: dbHealthy ? 'ok' : 'degraded',
      cloud: 'aws',
      architecture: 'Multi-AZ Active-Active',
      region: process.env.AWS_REGION || 'us-east-1',
      availabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
      database: dbHealthy ? 'connected' : 'recovering',
      uptimeSeconds: uptimeSec,
      service: 'nodak-enterprise-platform',
      timestamp: new Date().toISOString(),
    });
  };

  app.get('/api/health', healthHandler);
  app.get('/api/v1/health', healthHandler);

  // OAuth 2.0 callback routes (supporting with & without trailing slash)
  app.get(['/auth/google/callback', '/auth/google/callback/', '/api/v1/auth/google/callback', '/api/v1/auth/google/callback/'], handleGoogleCallback);
  app.get(['/auth/microsoft/callback', '/auth/microsoft/callback/', '/api/v1/auth/microsoft/callback', '/api/v1/auth/microsoft/callback/'], handleMicrosoftCallback);

  // Versioned API v1
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1', checkoutRouter);
  app.use('/api/v1', platformRouter);
  app.use('/api/v1', productsRouter);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled request error (recovered):', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Se recuperó un incidente temporal sin afectar la disponibilidad de la plataforma.',
      });
    }
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`NODAK Enterprise SaaS Platform listening on http://0.0.0.0:${PORT}`);
  });

  // AWS Application Load Balancer zero-502 timeout alignment
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}, closing HTTP connections cleanly...`);
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection (guarded):', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (guarded):', err);
});

startServer().catch((err) => {
  console.error('Failed to start NODAK server:', err);
  process.exit(1);
});
