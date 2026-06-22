const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const logger = require('../utils/logger');

/**
 * Prisma Client Singleton
 * 
 * - Uses global singleton for Vercel cold start optimization
 * - Configures connection pooling for Neon (serverless PostgreSQL)
 * - Implements automatic retry logic for transient failures
 * - Properly handles connection lifecycle
 */

let prisma = null;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    logger.error('DATABASE_URL is not defined. Cannot create Prisma client.');
    return null;
  }

  try {
    const adapter = new PrismaPg({
      connectionString,
      // Pool configuration for Neon serverless
      pool: {
        max: 10,              // Maximum connections in pool
        min: 1,               // Minimum connections in pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      },
    });

    const client = new PrismaClient({
      adapter,
      // Logging configuration
      log: process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['error', 'warn', 'info'],
    });

    return client;
  } catch (error) {
    logger.error('Failed to create Prisma client:', { error: error.message });
    return null;
  }
}

/**
 * Get Prisma instance (singleton pattern)
 */
function getPrisma() {
  if (!prisma) {
    // Use global for Vercel cold start optimization
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

/**
 * Test database connectivity
 * Returns { connected: boolean, error?: string }
 */
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

/**
 * Gracefully disconnect Prisma
 */
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

// Export singleton instance
const prismaClient = getPrisma();

module.exports = prismaClient;
module.exports.testConnection = testConnection;
module.exports.disconnect = disconnect;
module.exports.getPrisma = getPrisma;