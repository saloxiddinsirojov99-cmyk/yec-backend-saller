require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const prisma = require('../lib/prisma');

const authRoutes = require('../routes/auth');
const branchRoutes = require('../routes/branches');
const userRoutes = require('../routes/users');
const productRoutes = require('../routes/products');
const orderRoutes = require('../routes/orders');
const statsRoutes = require('../routes/stats');

const app = express();

// CORS - faqat ruxsat etilgan domainlar
const allowedOrigins = [
  'https://yec-sallers.vercel.app',
  'https://yec-saller-front.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000'
];

// Agar FRONTEND_URL env bo'lsa uni ham qo'shamiz
if (process.env.FRONTEND_URL) {
  const fe = process.env.FRONTEND_URL.replace(/\/$/, '');
  if (!allowedOrigins.includes(fe)) {
    allowedOrigins.push(fe);
  }
}

// CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    // server-to-server, mobile apps, curl (origin yo'q holatlar)
    if (!origin) return callback(null, true);
    // faqat whitelistdagi domainlarga ruxsat
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // qolgan hamma narsani bloklash
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// PRE-FLIGHT (OPTIONS) requestlarni handle qilish
app.options('*', cors());

// Body parser
app.use(express.json());

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
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
    }
  }

  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    environment: process.env.VERCEL === '1' ? 'vercel' : 'local',
    database: hasDB ? 'postgresql' : 'not_configured',
    dbStatus,
    dbError,
    hasJwtSecret: !!process.env.JWT_SECRET
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'So\'ralgan resurs topilmadi.' });
});

// Global error handler
app.use((err, req, res, next) => {
  // CORS xatoliklarini 403 qilib qaytarish
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: Domain ruxsat etilmagan.' });
  }
  console.error('Express global error:', err);
  res.status(500).json({ error: 'Ichki server xatoligi yuz berdi.' });
});

// Vercel serverless uchun export
module.exports = app;