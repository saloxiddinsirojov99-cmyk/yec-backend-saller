const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const { success, serverError } = require('../utils/response');

// GET /api/stats/dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchId = req.user.branch_id;

    if (isAdmin) {
      // ── ADMIN: Overall data ──
      const todayStr = new Date().toISOString().split('T')[0];
      const sixDaysAgo = new Date();
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
      const twentyNineDaysAgo = new Date();
      twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);

      const sixDaysAgoStr = sixDaysAgo.toISOString().split('T')[0];
      const twentyNineDaysAgoStr = twentyNineDaysAgo.toISOString().split('T')[0];

      const nonCancelledWhere = {
        status: { not: 'cancelled' },
      };

      // Run queries in parallel for performance
      const [dailyCount, weeklyCount, monthlyCount, totalSalesAgg, branches, orderItems] = await Promise.all([
        prisma.order.count({
          where: { ...nonCancelledWhere, order_date: todayStr },
        }),
        prisma.order.count({
          where: { ...nonCancelledWhere, order_date: { gte: sixDaysAgoStr } },
        }),
        prisma.order.count({
          where: { ...nonCancelledWhere, order_date: { gte: twentyNineDaysAgoStr } },
        }),
        prisma.order.aggregate({
          _sum: { total_amount: true },
          where: nonCancelledWhere,
        }),
        prisma.branch.findMany({
          include: {
            orders: {
              where: { status: { not: 'cancelled' } },
              select: { total_amount: true },
            },
          },
        }),
        prisma.orderItem.findMany({
          where: {
            order: { status: { not: 'cancelled' } },
          },
          select: {
            product_name: true,
            quantity: true,
            price: true,
          },
        }),
      ]);

      const totalSales = totalSalesAgg._sum.total_amount || 0;

      // Branch sales aggregation
      const branchSales = branches.map(b => ({
        id: b.id,
        branch_name: b.name,
        sales_sum: b.orders.reduce((sum, o) => sum + o.total_amount, 0),
        order_count: b.orders.length,
      }));

      // Top products aggregation
      const productGroups = {};
      orderItems.forEach(item => {
        if (!productGroups[item.product_name]) {
          productGroups[item.product_name] = { product_name: item.product_name, total_qty: 0, revenue: 0 };
        }
        productGroups[item.product_name].total_qty += item.quantity;
        productGroups[item.product_name].revenue += item.quantity * item.price;
      });

      const topProducts = Object.values(productGroups)
        .sort((a, b) => b.total_qty - a.total_qty)
        .slice(0, 5);

      // Unpaid orders
      const unpaidOrdersRaw = await prisma.order.findMany({
        where: { status: { not: 'cancelled' } },
        include: { branch: { select: { name: true } } },
      });

      const unpaidOrders = unpaidOrdersRaw
        .filter(o => o.paid_amount < o.total_amount)
        .map(o => ({
          id: o.id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          customer_phone: o.customer_phone,
          total_amount: o.total_amount,
          paid_amount: o.paid_amount,
          debt_amount: o.total_amount - o.paid_amount,
          order_date: o.order_date,
          branch_name: o.branch?.name || null,
        }))
        .sort((a, b) => b.debt_amount - a.debt_amount);

      return success(res, {
        role: 'admin',
        counts: {
          daily: dailyCount,
          weekly: weeklyCount,
          monthly: monthlyCount,
        },
        total_sales: totalSales,
        branch_sales: branchSales,
        top_products: topProducts,
        unpaid_orders: unpaidOrders,
      });
    } else {
      // ── SELLER: Today-only, own branch ──
      const todayStr = new Date().toISOString().split('T')[0];
      const sellerWhere = {
        order_date: todayStr,
        status: { not: 'cancelled' },
      };

      if (branchId) {
        sellerWhere.branch_id = parseInt(branchId);
      }

      // Run queries in parallel
      const [todayCount, todaySalesAgg, todayOrdersList] = await Promise.all([
        prisma.order.count({ where: sellerWhere }),
        prisma.order.aggregate({
          _sum: { total_amount: true },
          where: sellerWhere,
        }),
        prisma.order.findMany({ where: sellerWhere }),
      ]);

      const todaySales = todaySalesAgg._sum.total_amount || 0;

      const todayDebt = todayOrdersList
        .filter(o => o.paid_amount < o.total_amount)
        .reduce((sum, o) => sum + (o.total_amount - o.paid_amount), 0);

      const todayUnpaidOrders = todayOrdersList
        .filter(o => o.paid_amount < o.total_amount)
        .map(o => ({
          id: o.id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          customer_phone: o.customer_phone,
          total_amount: o.total_amount,
          paid_amount: o.paid_amount,
          debt_amount: o.total_amount - o.paid_amount,
          order_date: o.order_date,
        }))
        .sort((a, b) => b.debt_amount - a.debt_amount);

      return success(res, {
        role: 'seller',
        today: {
          orders_count: todayCount,
          sales_amount: todaySales,
          debt_amount: todayDebt,
        },
        today_unpaid_orders: todayUnpaidOrders,
      });
    }
  } catch (err) {
    req.log?.error('Dashboard stats error:', { error: err.message });
    return serverError(res);
  }
});

module.exports = router;