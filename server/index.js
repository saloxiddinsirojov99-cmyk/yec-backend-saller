const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

const { validateEnv, isProduction } = require('./utils/config');
const logger = require('./utils/logger');
const prisma = require('./lib/prisma');
const { disconnect } = require('./lib/prisma');
const { createApp } = require('./app');

validateEnv({ exitOnError: true });

const app = createApp({ serveStatic: true });
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (process.env.DATABASE_URL) {
      logger.info('Testing database connection...');
      await prisma.$queryRaw`SELECT 1`;
      logger.info('Database connection OK');
    }

    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`, {
        environment: isProduction() ? 'production' : 'development',
        nodeVersion: process.version,
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', { error: error.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);

  try {
    await disconnect();
    logger.info('All connections closed.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', { error: error.message });
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', { error: error.message, stack: error.stack });
  shutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', { reason: reason?.message || reason });
});

module.exports = app;

if (require.main === module) {
  startServer();
}
