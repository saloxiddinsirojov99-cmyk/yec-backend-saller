const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { hashPassword } = require('../utils/crypto');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { success, created, badRequest, notFound, serverError } = require('../utils/response');

// All endpoints in this file are restricted to Admins
router.use(authenticateToken, requireRole(['admin']));

function formatUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branch_id: user.branch_id,
    branch_name: user.branch?.name || null,
    created_at: user.created_at,
  };
}

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        branch: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const formattedUsers = users.map(formatUserResponse);

    return success(res, formattedUsers, 'Foydalanuvchilar ro\'yxati muvaffaqiyatli yuklandi.');
  } catch (err) {
    req.log?.error('List users error:', { error: err.message });
    return serverError(res);
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, branch_id } = req.body;

    if (!name || !email || !password || !role) {
      return badRequest(res, 'Ism, email, parol va rol kiritilishi shart.');
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
      return badRequest(res, 'Ushbu email li foydalanuvchi allaqachon mavjud.');
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
      include: {
        branch: { select: { name: true } },
      },
    });

    // Try to send email notification (non-blocking)
    try {
      const { sendUserNotificationEmail } = require('../utils/email');
      sendUserNotificationEmail({
        action: 'created',
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        tempPassword: password,
      }).catch(() => {});
    } catch {
      // Email module might not be available - silently ignore
    }

    return created(res, formatUserResponse(user), 'Foydalanuvchi muvaffaqiyatli yaratildi.');
  } catch (err) {
    req.log?.error('Create user error:', { error: err.message });
    return serverError(res);
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, password, role, branch_id } = req.body;
    const { id } = req.params;

    if (!name || !email || !role) {
      return badRequest(res, 'Ism, email va rol kiritilishi shart.');
    }

    const userId = parseInt(id);

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return notFound(res, 'Foydalanuvchi topilmadi.');
    }

    // Check if email is taken by another user
    const emailConflict = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        id: { not: userId },
      },
    });

    if (emailConflict) {
      return badRequest(res, 'Ushbu email boshqa foydalanuvchiga tegishli.');
    }

    const updateData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role,
      branch_id: branch_id ? parseInt(branch_id) : null,
    };

    if (password) {
      if (password.length < 6) {
        return badRequest(res, 'Parol kamida 6 belgidan iborat bo\'lishi kerak.');
      }
      updateData.password_hash = hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        branch: { select: { name: true } },
      },
    });

    return success(res, formatUserResponse(updatedUser), 'Foydalanuvchi muvaffaqiyatli yangilandi.');
  } catch (err) {
    req.log?.error('Update user error:', { error: err.message });
    return serverError(res);
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (userId === req.user.id) {
      return badRequest(res, 'O\'zingizning profilingizni o\'chira olmaysiz.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return notFound(res, 'Foydalanuvchi topilmadi.');
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return success(res, null, 'Foydalanuvchi muvaffaqiyatli o\'chirildi.');
  } catch (err) {
    req.log?.error('Delete user error:', { error: err.message });
    return serverError(res);
  }
});

module.exports = router;