const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/vibe/wallet/transactions',
  method: 'GET',
  headers: {
    // Need to authenticate!
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
req.on('error', e => console.error(e));
req.end();
