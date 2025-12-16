/**
 * Test the trigger command endpoint
 */

import http from 'http';

const body = JSON.stringify({
  twitchUserId: '25019517',
  command: 'dance'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/test/trigger-command',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
  process.exit(1);
});

req.write(body);
req.end();

