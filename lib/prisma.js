const { PrismaClient } = require('@prisma/client');

// Vercel cold start'larda bitta instance qayta ishlatilsin
const prisma = global.prisma || new PrismaClient();

if (!global.prisma) {
  global.prisma = prisma;
}

module.exports = prisma;