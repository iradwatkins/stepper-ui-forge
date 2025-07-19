#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(path.join(__dirname, 'dist'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const extname = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // File not found, serve index.html for SPA routing
        fs.readFile(path.join(__dirname, 'dist', 'index.html'), (error, content) => {
          if (error) {
            res.writeHead(500);
            res.end('Error loading index.html');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Try to bind to localhost specifically
const startServer = () => {
  server.listen(8080, '127.0.0.1', () => {
    console.log('✅ Server running on http://localhost:8080');
    console.log('🎯 Serving built application from /dist folder');
    console.log('🔧 Press Ctrl+C to stop');
    
    // Test connection
    setTimeout(() => {
      http.get('http://localhost:8080', (res) => {
        console.log(`✅ Connection test successful: ${res.statusCode}`);
      }).on('error', (err) => {
        console.log(`❌ Connection test failed: ${err.message}`);
      });
    }, 1000);
  });
};

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log('❌ Port 8080 is in use');
    process.exit(1);
  } else {
    console.error('❌ Server error:', e);
  }
});

startServer();