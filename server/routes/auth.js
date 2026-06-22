const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { verifyPassword, hashPassword } = require('../utils/crypto');
const { authenticateToken } = require('../middleware/auth');
const { success, created, badRequest, unauthorized, notFound, serverError } = require('../utils/response');

function getJwtSecret() {
  return process.env.JWT_SECRET;
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch_id: user.branch_id,
      branch_name: user.branch?.name || null,
    },
    getJwtSecret(),
    { expiresIn: '30d' }
  );
}

function formatUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branch_id: user.branch_id,
    branch_name: user.branch?.name || null,
  };
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    if (!req.body) {
      return badRequest(res, 'So\'rov tanasi bo\'sh bo\'lishi mumkin emas.');
    }

    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return badRequest(res, 'Email va parol matn ko\'rinishida kiritilishi shart.');
    }

    const secret = getJwtSecret();
    if (!secret) {
      req.log?.error('JWT_SECRET is not configured');
      return serverError(res, 'Server konfiguratsiyasi xatosi: JWT kaliti sozlanmagan.');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { branch: true },
    });

    if (!user) {
      return unauthorized(res, 'Email yoki parol noto\'g\'ri.');
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return unauthorized(res, 'Email yoki parol noto\'g\'ri.');
    }

    const token = signToken(user);

    return success(res, {
      token,
      user: formatUserResponse(user),
    }, 'Tizimga muvaffaqiyatli kirildi.');
  } catch (err) {
    req.log?.error('Login error:', { error: err.message });
    return serverError(res);
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, branch_id } = req.body;

    if (!name || !email || !password || !role) {
      return badRequest(res, 'Barcha maydonlar kiritilishi shart.');
    }

    if (role !== 'admin' && role !== 'seller') {
      return badRequest(res, 'Noto\'g\'ri rol tanlandi.');
    }

    if (password.length < 6) {
      return badRequest(res, 'Parol kamida 6 belgidan iborat bo\'lishi kerak.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingUser) {
      return badRequest(res, 'Ushbu email bilan ro\'yxatdan o\'tilgan.');
    }

    const passwordHash = hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        role: role,
        branch_id: branch_id ? parseInt(branch_id) : null,
      },
      include: { branch: true },
    });

    return created(res, formatUserResponse(user), 'Muvaffaqiyatli ro\'yxatdan o\'tildi.');
  } catch (err) {
    req.log?.error('Register error:', { error: err.message });
    return serverError(res);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  return success(res, null, 'Chiqish muvaffaqiyatli amalga oshirildi.');
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { branch: true },
    });

    if (!user) {
      return notFound(res, 'Foydalanuvchi topilmadi.');
    }

    return success(res, formatUserResponse(user));
  } catch (err) {
    req.log?.error('Get me error:', { error: err.message });
    return serverError(res);
  }
});

module.exports = router;