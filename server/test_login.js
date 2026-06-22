const https = require('https');
const data = JSON.stringify({ email: 'admin@yecgilam.uz', password: 'admin123' });

const options = {
  hostname: 'yec-backend-saller.vercel.app',
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let response = '';
  res.on('data', (chunk) => { response += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', response);
  });
});

req.on('error', (e) => { console.error(e); });

req.write(data);
req.end();
