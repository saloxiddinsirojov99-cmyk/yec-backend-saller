/**
 * API Integration Tests
 * 
 * Tests API endpoints, database connectivity, and startup validation.
 * Run with: node --experimental-vm-modules tests/integration/api.test.js
 * 
 * These tests require a running server or direct module access.
 */

const http = require('http');

const API_BASE = process.env.TEST_API_URL || 'http://localhost:5000';
const TIMEOUT = 10000;

let passed = 0;
let failed = 0;

function test(name, fn) {
  const timeout = setTimeout(() => {
    console.log(`✗ TIMEOUT: ${name}`);
    failed++;
    if (failed + passed === totalTests) printSummary();
  }, TIMEOUT);

  fn()
    .then(() => {
      clearTimeout(timeout);
      console.log(`✓ ${name}`);
      passed++;
      if (failed + passed === totalTests) printSummary();
    })
    .catch((err) => {
      clearTimeout(timeout);
      console.log(`✗ ${name}: ${err.message}`);
      failed++;
      if (failed + passed === totalTests) printSummary();
    });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function fetchApi(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        timeout: TIMEOUT,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: data ? JSON.parse(data) : null,
            });
          } catch {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: null,
              raw: data,
            });
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

let totalTests = 0;

// ── Health Check Tests ──
totalTests++;
test('GET /api/health returns status field', async () => {
  const res = await fetchApi('/api/health');
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(['OK', 'DEGRADED'].includes(res.data.status), `Unexpected status: ${res.data.status}`);
  assert(res.data.timestamp, 'Missing timestamp');
});

totalTests++;
test('GET /api/health includes database status', async () => {
  const res = await fetchApi('/api/health');
  assert(res.data.database !== undefined, 'Missing database field');
  assert(['postgresql', 'not_configured'].includes(res.data.database), `Unexpected database: ${res.data.database}`);
});

totalTests++;
test('GET /api/health returns environment info', async () => {
  const res = await fetchApi('/api/health');
  assert(res.data.environment !== undefined, 'Missing environment');
  assert(['vercel', 'production', 'development'].includes(res.data.environment), `Unexpected environment: ${res.data.environment}`);
  assert(res.data.nodeVersion, 'Missing nodeVersion');
  assert(res.data.uptime !== undefined, 'Missing uptime');
});

// ── Authentication Tests ──
totalTests++;
test('POST /api/auth/login fails with empty body', async () => {
  const res = await fetchApi('/api/auth/login', { method: 'POST', body: {} });
  assert(res.status === 400, `Expected 400, got ${res.status}`);
  assert(res.data.success === false, 'Expected success=false');
});

totalTests++;
test('POST /api/auth/login fails with invalid credentials', async () => {
  const res = await fetchApi('/api/auth/login', {
    method: 'POST',
    body: { email: 'nonexistent@test.com', password: 'wrongpassword' },
  });
  assert(res.status === 401, `Expected 401, got ${res.status}`);
  assert(res.data.success === false, 'Expected success=false');
});

totalTests++;
test('POST /api/auth/login requires email and password', async () => {
  const res = await fetchApi('/api/auth/login', {
    method: 'POST',
    body: { email: 'test@test.com' },
  });
  assert(res.status === 400, `Expected 400, got ${res.status}`);
});

// ── CORS Tests ──
totalTests++;
test('OPTIONS /api/health handles preflight correctly', async () => {
  const res = await fetchApi('/api/health', { method: 'OPTIONS' });
  assert(res.status === 200 || res.status === 204, `Expected 200/204, got ${res.status}`);
  const headers = res.headers;
  assert(headers['access-control-allow-origin'] !== undefined || headers['access-control-allow-methods'] !== undefined,
    'Missing CORS headers');
});

// ── 404 Tests ──
totalTests++;
test('GET /api/nonexistent returns 404', async () => {
  const res = await fetchApi('/api/nonexistent');
  assert(res.status === 404, `Expected 404, got ${res.status}`);
  assert(res.data.success === false, 'Expected success=false');
});

// ── Validation Tests ──
totalTests++;
test('POST /api/auth/register fails with missing fields', async () => {
  const res = await fetchApi('/api/auth/register', {
    method: 'POST',
    body: { name: 'Test' },
  });
  assert(res.status === 400, `Expected 400, got ${res.status}`);
});

function printSummary() {
  console.log('\n═══════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═══════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  console.log(`\n🧪 Running ${totalTests} API integration tests against ${API_BASE}...\n`);
}

module.exports = { test, assert, fetchApi };