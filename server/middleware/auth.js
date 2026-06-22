const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Authentication & Authorization Middleware
 * 
 * - authenticateToken: Verifies JWT from Authorization header
 * - requireRole: Restricts access to specific roles
 */

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT_SECRET is not configured. Authentication will fail.');
    return null;
  }
  return secret;
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Tizimga kirish talab qilinadi.' 
    });
  }

  const secret = getJwtSecret();
  if (!secret) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server konfiguratsiyasi xatosi: JWT kaliti sozlanmagan.' 
    });
  }

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      logger.warn('Invalid token attempt', { error: err.message });
      return res.status(403).json({ 
        success: false, 
        message: 'Yaroqsiz token.' 
      });
    }
    req.user = user;
    next();
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Tizimga kirish talab qilinadi.' 
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Ushbu amal uchun huquqingiz yetarli emas.' 
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
};