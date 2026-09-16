import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { webhookCallback } from 'grammy';
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

  // Telegram Webhook Handler (Vercel yoki Serverless uchun)
  if (botInstance) {
    const botHandler = webhookCallback(botInstance, 'express');
    app.use('/api/bot', botHandler);
    app.use('/api/webhook', botHandler);
  }

  // Health check & System status endpoint
  app.get('/api/health', async (req, res) => {
    let webhookInfo = null;
    let botUsername = null;
    if (botInstance) {
      try {
        const me = await botInstance.api.getMe();
        botUsername = me.username;
        webhookInfo = await botInstance.api.getWebhookInfo();
      } catch (e) {
        webhookInfo = { error: e.message };
      }
    }
    return res.json({
      success: true,
      status: 'online',
      timestamp: new Date().toISOString(),
      bot: {
        configured: Boolean(botInstance),
        username: botUsername,
        webhook: webhookInfo
      },
      env: {
        nodeEnv: process.env.NODE_ENV,
        isVercel: Boolean(process.env.VERCEL),
        tz: config.TZ
      }
    });
  });

  // Webhookni avtomatik ulash endpointi
  app.get('/api/set-webhook', async (req, res) => {
    if (!botInstance) {
      return res.status(400).json({ success: false, error: 'Bot sozlanmagan (BOT_TOKEN yo‘q)' });
    }
    try {
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const proto = req.headers['x-forwarded-proto'] || 'https';
      const webhookUrl = `${proto}://${host}/api/bot`;
      await botInstance.api.setWebhook(webhookUrl);
      const info = await botInstance.api.getWebhookInfo();
      logger.info(`Webhook muvaffaqiyatli ulandi: ${webhookUrl}`);
      return res.json({
        success: true,
        message: 'Telegram Webhook muvaffaqiyatli ulandi!',
        webhookUrl,
        info
      });
    } catch (err) {
      logger.error('Webhook o‘rnatishda xatolik:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Webhookni o'chirish endpointi (Polling rejimiga qaytish uchun)
  app.get('/api/delete-webhook', async (req, res) => {
    if (!botInstance) {
      return res.status(400).json({ success: false, error: 'Bot sozlanmagan' });
    }
    try {
      await botInstance.api.deleteWebhook();
      return res.json({
        success: true,
        message: 'Telegram Webhook tozalandi! Endi Polling rejimida ishlash mumkin.'
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vercel Cron / Avtomatik dars jadvalini jo'natish endpointi
  app.all('/api/cron', async (req, res) => {
    if (!botInstance) {
      return res.status(400).json({ success: false, error: 'Bot sozlanmagan' });
    }
    try {
      const { scheduler } = await import('../scheduler/cron.scheduler.js');
      await scheduler.checkAndSendSchedules(botInstance);
      return res.json({
        success: true,
        message: 'Cron jadvali tekshirildi va yuborildi',
        timestamp: new Date().toISOString()
      });
    } catch (cronErr) {
      logger.error('Cron xatolik:', cronErr);
      return res.status(500).json({ success: false, error: cronErr.message });
    }
  });

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
