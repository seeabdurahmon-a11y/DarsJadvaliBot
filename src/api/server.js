import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { telegramAuthMiddleware } from './middlewares/telegramAuth.js';
import { publicRouter } from './routes/public.routes.js';
import { adminRouter } from './routes/admin.routes.js';

export function createWebServer(botInstance = null) {
  const app = express();

  if (botInstance) {
    app.set('telegramBot', botInstance);
  }

  // Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Telegram WebApp Authentication Middleware
  app.use(telegramAuthMiddleware);

  // Mount API routes
  app.use('/api', publicRouter);
  app.use('/api/admin', adminRouter);

  // Serve static Mini App files
  if (fs.existsSync(config.WEB_DIR)) {
    app.use(express.static(config.WEB_DIR));
  }

  // SPA fallback for non-API requests
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ success: false, error: 'Endpoint topilmadi' });
    }
    const indexPath = path.join(config.WEB_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Mini App files not found');
    }
  });

  // Global Error Handler
  app.use((err, req, res, next) => {
    logger.error('[API ERROR]', err);
    res.status(500).json({
      success: false,
      error: 'Serverda ichki xatolik yuz berdi'
    });
  });

  let serverInstance = null;

  return {
    app,
    start(port = config.PORT) {
      return new Promise((resolve, reject) => {
        serverInstance = app.listen(port, () => {
          logger.info(`🌐 Web Server va Telegram Mini App ishga tushdi: http://localhost:${port}`);
          resolve(serverInstance);
        }).on('error', (err) => {
          logger.error('Web serverni ishga tushirishda xatolik:', err);
          reject(err);
        });
      });
    },
    stop() {
      return new Promise((resolve) => {
        if (serverInstance) {
          serverInstance.close(() => {
            logger.info('Web server to‘xtatildi');
            resolve();
          });
        } else {
          resolve();
        }
      });
    }
  };
}
