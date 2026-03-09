const http = require('http');
const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'OPTIONS',
    headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST'
    }
};
const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log('HEADERS:', JSON.stringify(res.headers, null, 2));
    res.on('data', (d) => process.stdout.write(d));
});
req.on('error', (e) => {
    console.error('ERROR:', e.message);
    process.exit(1);
});
req.end();
