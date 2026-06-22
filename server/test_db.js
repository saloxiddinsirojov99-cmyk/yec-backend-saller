// Database test script
// Run: node test_db.js

async function main() {
  console.log('1. Testing backend health check...');
  try {
    // Requires Node 18+ for global fetch
    const resp = await fetch('https://yec-seller.vercel.app/api/health');
    const data = await resp.json();
    console.log('   Status:', resp.status, JSON.stringify(data));
  } catch(e) {
    console.log('   ERROR:', e.message);
    console.log('   Trying alternative...');
  }
  
  console.log('\n2. Testing login endpoint...');
  try {
    const resp = await fetch('https://yec-seller.vercel.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@yecgilam.uz', password: 'admin123' })
    });
    const data = await resp.json();
    if (data.token) {
      console.log('   ✅ LOGIN SUCCESSFUL! Token received.');
      console.log('   Database is CONNECTED and WORKING!');
    } else {
      console.log('   Response:', JSON.stringify(data));
    }
  } catch(e) {
    console.log('   ERROR:', e.message);
  }
}

main();