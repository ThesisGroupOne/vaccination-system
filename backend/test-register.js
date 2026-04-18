const http = require('http');

const data = JSON.stringify({
    full_name: 'Test User',
    phone: '1234567890',
    email: 'test@example.com',
    password: 'password123',
    role: 'admin'
});

const options = {
    hostname: 'localhost',
    port: 9999,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    let responseBody = '';
    res.on('data', chunk => {
        responseBody += chunk;
    });
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${responseBody}`);
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
