const express = require('express');
const cors = require('cors');
const path = require('path');
const { isProduction, isVercel } = require('./utils/config');
const logger = require('./utils/logger');
const prisma = require('./lib/prisma');

const authRoutes = require('./routes/auth');
const branchRoutes = require('./routes/branches');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const statsRoutes = require('./routes/stats');

function createApp(options = {}) {
  const { serveStatic = false } = options;
  const app = express();

  const allowedOrigins = [
    (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  ];

  if (!isProduction()) {
    allowedOrigins.push('http://localhost:5173');
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://127.0.0.1:5173');
  }

  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      if (normalizedOrigin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      if (normalizedOrigin.endsWith('.onrender.com')) {
        return callback(null, true);
      }

      if (!isProduction()) {
        return callback(null, true);
      }

      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use((req, res, next) => {
    const start = Date.now();
    req.log = logger.requestLogger(req);

    res.on('finish', () => {
      const duration = Date.now() - start;
      req.log.info('Request completed', {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
    });

    next();
  });

  app.get('/api/health', async (req, res) => {
    const hasDB = !!process.env.DATABASE_URL;
    let dbStatus = 'not_configured';
    let dbError = null;

    if (hasDB) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
      } catch (err) {
        dbStatus = 'error';
        dbError = err.message;
        logger.error('Health check DB error:', { error: err.message });
      }
    }

    res.json({
      status: dbStatus === 'connected' ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      environment: isVercel() ? 'vercel' : isProduction() ? 'production' : 'development',
      nodeVersion: process.version,
      database: hasDB ? 'postgresql' : 'not_configured',
      dbStatus,
      dbError,
      hasJwtSecret: !!process.env.JWT_SECRET,
      uptime: process.uptime(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/branches', branchRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/stats', statsRoutes);

  if (serveStatic && isProduction()) {
    const distPath = path.join(__dirname, '..', 'client', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'So\'ralgan resurs topilmadi.',
    });
  });

  app.use((err, req, res, next) => {
    const reqLog = req.log || logger;
    reqLog.error('Unhandled error:', {
      error: err.message,
      stack: isProduction() ? undefined : err.stack,
    });

    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({
        success: false,
        message: 'JSON formati noto\'g\'ri.',
      });
    }

    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Bu ma\'lumot allaqachon mavjud.',
      });
    }

    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Yozuv topilmadi.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ichki server xatoligi yuz berdi.',
    });
  });

  return app;
}

module.exports = { createApp };
