#!/usr/bin/env node

import http from 'http';
import httpProxy from 'http-proxy';

// Create proxy server
const proxy = httpProxy.createProxyServer({
  target: 'http://localhost:3000',
  changeOrigin: true,
  ws: true // Enable WebSocket proxying for HMR
});

// Create HTTP server
const server = http.createServer((req, res) => {
  // Add CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  proxy.web(req, res, (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(500);
    res.end('Proxy Error: ' + err.message);
  });
});

// Handle WebSocket upgrades for HMR
server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(8080, '127.0.0.1', () => {
  console.log('✅ Proxy server running on http://localhost:8080');
  console.log('🔄 Proxying to http://localhost:3000');
  console.log('🌐 Your app is now available at: http://localhost:8080');
  
  // Test the connection
  setTimeout(() => {
    const testReq = http.get('http://localhost:3000', (res) => {
      console.log('✅ Target server (port 3000) is responding');
    }).on('error', (err) => {
      console.error('❌ Cannot reach target server:', err.message);
    });
  }, 1000);
});

// Handle errors
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  if (res.writeHead) {
    res.writeHead(500);
    res.end('Proxy Error: ' + err.message);
  }
});