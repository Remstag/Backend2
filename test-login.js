const http = require('http');

const data = JSON.stringify({ username: 'admin', password: '123456' });

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let responseData = '';
    res.on('data', (d) => responseData += d);
    res.on('end', () => {
        try {
            console.log('RESPONSE:', JSON.stringify(JSON.parse(responseData), null, 2));
        } catch {
            console.log('RAW RESPONSE:', responseData);
        }
    });
});
req.on('error', (e) => console.error('ERROR:', e.message));
req.write(data);
req.end();
