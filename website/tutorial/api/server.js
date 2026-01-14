const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Hello from Tutorial API',
    env: process.env.NODE_ENV || 'development'
  }));
});

server.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
