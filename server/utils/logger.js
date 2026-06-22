/**
 * Centralized Logger
 * 
 * Provides structured logging with log levels, request IDs, and environment awareness.
 * In production, logs are JSON-formatted for log aggregators.
 * In development, logs are color-coded for readability.
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LOG_COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[90m', // Gray
  RESET: '\x1b[0m',
};

const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG');

function formatTimestamp() {
  return new Date().toISOString();
}

function shouldLog(level) {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

function formatMessage(level, message, meta) {
  const timestamp = formatTimestamp();
  const pid = process.pid;

  if (process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1') {
    // JSON format for production log aggregators
    return JSON.stringify({
      timestamp,
      level,
      pid,
      message,
      ...meta,
    });
  }

  // Color-coded development format
  const color = LOG_COLORS[level] || '';
  const reset = LOG_COLORS.RESET;
  const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `${color}[${timestamp}] [${level}]${reset} ${message}${metaStr}`;
}

const logger = {
  error(message, meta = {}) {
    if (shouldLog('ERROR')) {
      console.error(formatMessage('ERROR', message, meta));
    }
  },

  warn(message, meta = {}) {
    if (shouldLog('WARN')) {
      console.warn(formatMessage('WARN', message, meta));
    }
  },

  info(message, meta = {}) {
    if (shouldLog('INFO')) {
      console.log(formatMessage('INFO', message, meta));
    }
  },

  debug(message, meta = {}) {
    if (shouldLog('DEBUG')) {
      console.log(formatMessage('DEBUG', message, meta));
    }
  },

  /**
   * Creates a request-scoped logger that attaches request ID and path
   */
  requestLogger(req) {
    const requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const baseMeta = {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip || req.connection?.remoteAddress,
    };

    return {
      error(message, meta = {}) {
        logger.error(message, { ...baseMeta, ...meta });
      },
      warn(message, meta = {}) {
        logger.warn(message, { ...baseMeta, ...meta });
      },
      info(message, meta = {}) {
        logger.info(message, { ...baseMeta, ...meta });
      },
      debug(message, meta = {}) {
        logger.debug(message, { ...baseMeta, ...meta });
      },
      getRequestId() {
        return requestId;
      },
    };
  },
};

module.exports = logger;