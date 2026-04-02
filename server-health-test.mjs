// Minimal health check server for debugging DO deployment
import { createServer } from 'http';
const port = parseInt(process.env.PORT || '8080');
console.log(`[health-test] Starting minimal server on port ${port}...`);
console.log(`[health-test] NODE_ENV=${process.env.NODE_ENV}, node=${process.version}`);
const server = createServer((req, res) => {
  console.log(`[health-test] ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', port, pid: process.pid }));
});
server.listen(port, '0.0.0.0', () => {
  console.log(`[health-test] Server listening on 0.0.0.0:${port}`);
});
