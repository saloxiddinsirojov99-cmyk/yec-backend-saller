const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { isVercel } = require('../utils/config');

/**
 * Prisma Client Singleton
 *
 * - Vercel serverless: plain PrismaClient (adapter causes compatibility issues)
 * - Render/local: optional pg adapter when @prisma/adapter-pg is available
 */

let prisma = null;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    logger.error('DATABASE_URL is not defined. Cannot create Prisma client.');
    return null;
  }

  const logConfig =
    process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['error', 'warn', 'info'];

  try {
    if (!isVercel()) {
      try {
        const { PrismaPg } = require('@prisma/adapter-pg');
        const adapter = new PrismaPg({
          connectionString,
          pool: {
            max: 10,
            min: 1,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
          },
        });

        return new PrismaClient({ adapter, log: logConfig });
      } catch (adapterError) {
        logger.warn('Prisma pg adapter unavailable, using default client', {
          error: adapterError.message,
        });
      }
    }

    return new PrismaClient({ log: logConfig });
  } catch (error) {
    logger.error('Failed to create Prisma client:', { error: error.message });
    return null;
  }
}

function getPrisma() {
  if (!prisma) {
    if (global.prisma) {
      prisma = global.prisma;
    } else {
      prisma = createPrismaClient();
      if (prisma) {
        global.prisma = prisma;
      }
    }
  }
  return prisma;
}

async function testConnection() {
  const client = getPrisma();
  if (!client) {
    return { connected: false, error: 'Prisma client not initialized' };
  }

  try {
    await client.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (error) {
    logger.error('Database connection test failed:', { error: error.message });
    return { connected: false, error: error.message };
  }
}

async function disconnect() {
  if (prisma) {
    try {
      await prisma.$disconnect();
      logger.info('Prisma client disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting Prisma:', { error: error.message });
    }
    prisma = null;
    delete global.prisma;
  }
}

const prismaClient = getPrisma();

module.exports = prismaClient;
module.exports.testConnection = testConnection;
module.exports.disconnect = disconnect;
module.exports.getPrisma = getPrisma;
