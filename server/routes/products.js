const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { success, created, badRequest, notFound, serverError } = require('../utils/response');

// Auto-generate product code: G-0001, G-0002, ...
async function generateProductCode() {
  const last = await prisma.product.findFirst({
    where: {
      code: { not: '' },
    },
    orderBy: { id: 'desc' },
    select: { code: true },
  });

  let num = 1;
  if (last && last.code) {
    const match = last.code.match(/\d+/);
    if (match) num = parseInt(match[0]) + 1;
  }
  return 'G-' + String(num).padStart(4, '0');
}

// GET /api/products
router.get('/', authenticateToken, async (req, res) => {
  try {
    const where = {};
    if (req.user.role !== 'admin') {
      where.is_active = 1;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return success(res, products, 'Mahsulotlar ro\'yxati muvaffaqiyatli yuklandi.');
  } catch (err) {
    req.log?.error('List products error:', { error: err.message });
    return serverError(res);
  }
});

// POST /api/products (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, description, price, is_active } = req.body;

    if (!name || price === undefined || price === null) {
      return badRequest(res, 'Mahsulot nomi va narxi kiritilishi shart.');
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return badRequest(res, 'Narx noto\'g\'ri formatda kiritilgan.');
    }

    const code = await generateProductCode();

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        code,
        description: description ? description.trim() : null,
        price: parsedPrice,
        image_url: null,
        is_active: is_active !== undefined ? parseInt(is_active) : 1,
      },
    });

    return created(res, product, 'Mahsulot muvaffaqiyatli yaratildi.');
  } catch (err) {
    req.log?.error('Create product error:', { error: err.message });
    return serverError(res);
  }
});

// PUT /api/products/:id (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, description, price, is_active } = req.body;
    const { id } = req.params;

    if (!name || price === undefined || price === null) {
      return badRequest(res, 'Mahsulot nomi va narxi kiritilishi shart.');
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return badRequest(res, 'Narx noto\'g\'ri formatda kiritilgan.');
    }

    const existing = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return notFound(res, 'Mahsulot topilmadi.');
    }

    const updated = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        price: parsedPrice,
        is_active: is_active !== undefined ? parseInt(is_active) : existing.is_active,
      },
    });

    return success(res, updated, 'Mahsulot muvaffaqiyatli yangilandi.');
  } catch (err) {
    req.log?.error('Update product error:', { error: err.message });
    return serverError(res);
  }
});

// DELETE /api/products/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return notFound(res, 'Mahsulot topilmadi.');
    }

    await prisma.product.delete({
      where: { id: parseInt(id) },
    });

    return success(res, null, 'Mahsulot muvaffaqiyatli o\'chirildi.');
  } catch (err) {
    req.log?.error('Delete product error:', { error: err.message });
    return serverError(res);
  }
});

module.exports = router;