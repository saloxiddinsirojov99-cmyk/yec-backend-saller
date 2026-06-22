const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { success, created, badRequest, notFound, serverError } = require('../utils/response');

// GET /api/branches
router.get('/', authenticateToken, async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
    });

    return success(res, branches, 'Filiallar ro\'yxati muvaffaqiyatli yuklandi.');
  } catch (err) {
    req.log?.error('List branches error:', { error: err.message });
    return serverError(res);
  }
});

// POST /api/branches (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, address, phone } = req.body;

    if (!name || !name.trim()) {
      return badRequest(res, 'Filial nomi kiritilishi shart.');
    }

    const branch = await prisma.branch.create({
      data: {
        name: name.trim(),
        address: address ? address.trim() : null,
        phone: phone ? phone.trim() : null,
      },
    });

    return created(res, branch, 'Filial muvaffaqiyatli yaratildi.');
  } catch (err) {
    req.log?.error('Create branch error:', { error: err.message });
    return serverError(res);
  }
});

// PUT /api/branches/:id (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    const { id } = req.params;

    if (!name || !name.trim()) {
      return badRequest(res, 'Filial nomi kiritilishi shart.');
    }

    const existing = await prisma.branch.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return notFound(res, 'Filial topilmadi.');
    }

    const branch = await prisma.branch.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
        address: address ? address.trim() : null,
        phone: phone ? phone.trim() : null,
      },
    });

    return success(res, branch, 'Filial muvaffaqiyatli yangilandi.');
  } catch (err) {
    req.log?.error('Update branch error:', { error: err.message });
    return serverError(res);
  }
});

// DELETE /api/branches/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.branch.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return notFound(res, 'Filial topilmadi.');
    }

    await prisma.branch.delete({
      where: { id: parseInt(id) },
    });

    return success(res, null, 'Filial muvaffaqiyatli o\'chirildi.');
  } catch (err) {
    req.log?.error('Delete branch error:', { error: err.message });
    return serverError(res);
  }
});

module.exports = router;