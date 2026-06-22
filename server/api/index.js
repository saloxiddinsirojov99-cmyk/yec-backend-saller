const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
}

const { validateEnv } = require('../utils/config');
const { createApp } = require('../app');

validateEnv({ exitOnError: false, soft: true });

module.exports = createApp({ serveStatic: false });
