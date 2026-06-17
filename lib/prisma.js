const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

// Prisma 7 query compiler "client" engine type uchun adapter talab qiladi
function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

// Vercel cold start'larda bitta instance qayta ishlatilsin
const prisma = global.prisma || createPrismaClient();

if (!global.prisma) {
  global.prisma = prisma;
}

module.exports = prisma;
