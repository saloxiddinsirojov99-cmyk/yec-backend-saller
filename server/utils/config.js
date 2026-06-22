/**
 * Centralized Configuration Validation
 *
 * Validates all required environment variables on startup.
 * Fails fast when configuration is invalid (unless soft mode is enabled).
 */

const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET'];
const OPTIONAL_VARS = {
  PORT: { default: 5000, type: 'number' },
  NODE_ENV: { default: 'development' },
  FRONTEND_URL: { default: 'http://localhost:5173' },
  SMTP_HOST: { default: null },
  SMTP_PORT: { default: '587' },
  SMTP_SECURE: { default: 'false' },
  SMTP_USER: { default: null },
  SMTP_PASSWORD: { default: null },
  SMTP_FROM: { default: null },
};

function validateEnv(options = {}) {
  const { exitOnError = true, soft = false } = options;
  const missing = [];
  const errors = [];

  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName] || process.env[varName].trim() === '') {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    const message =
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Set these in your .env file or deployment environment settings.';

    if (soft) {
      console.warn(`⚠️  ${message}`);
    } else {
      errors.push(message);
    }
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 16) {
    errors.push('JWT_SECRET must be at least 16 characters long for security.');
  }

  if (process.env.DATABASE_URL) {
    if (
      !process.env.DATABASE_URL.startsWith('postgresql://') &&
      !process.env.DATABASE_URL.startsWith('postgres://')
    ) {
      errors.push('DATABASE_URL must start with postgresql:// or postgres://');
    }
  }

  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('http')) {
    errors.push('FRONTEND_URL must start with http:// or https://');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach((err) => console.error(`   - ${err}`));

    if (exitOnError) {
      process.exit(1);
    }

    return false;
  }

  for (const [key, config] of Object.entries(OPTIONAL_VARS)) {
    if (!process.env[key] || process.env[key].trim() === '') {
      process.env[key] = String(config.default);
    }
  }

  if (!soft) {
    console.log('✅ Configuration validated successfully');
  }

  return true;
}

function getEnv(name) {
  return process.env[name] || OPTIONAL_VARS[name]?.default || null;
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function isVercel() {
  return process.env.VERCEL === '1';
}

module.exports = {
  validateEnv,
  getEnv,
  isProduction,
  isVercel,
  REQUIRED_VARS,
};
