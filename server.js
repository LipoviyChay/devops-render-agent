'use strict';
const http = require('node:http');
const port = Number(process.env.PORT) || 3000;
const html = '<h1>Hello! This is an AI-Agent deployed fully automatically by ChatGPT Computer Use</h1>';
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});
server.listen(port, '0.0.0.0', () => console.log(`Server listening on port ${port}`));
