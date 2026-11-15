import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeDatabase } from './server/db.ts';
import { buildProjectZipBuffer } from './server/lib/zipExport.ts';
import { platformRouter } from './server/routes/platform.ts';
import { productsRouter } from './server/routes/products.ts';
import { seedInitialData } from './server/seed.ts';

async function startServer() {
  initializeDatabase();
  seedInitialData();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Basic request rate limiting & security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Versioned API v1
  app.use('/api/v1', platformRouter);
  app.use('/api/v1', productsRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nodak-modular-monolith', timestamp: new Date().toISOString() });
  });

  app.get('/api/download/project.zip', (_req, res) => {
    const zipBuffer = buildProjectZipBuffer(process.cwd());
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="nodak-web.zip"');
    res.setHeader('Content-Length', String(zipBuffer.length));
    res.send(zipBuffer);
  });

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
    console.error('Unhandled request error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Se produjo un error inesperado al procesar la solicitud.',
      });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NODAK Enterprise SaaS running on http://0.0.0.0:${PORT}`);
  });
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
