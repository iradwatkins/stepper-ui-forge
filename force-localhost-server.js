#!/usr/bin/env node

// Force a server to run on localhost:8080 specifically
import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  try {
    console.log('🔧 Starting Vite server with forced localhost:8080 binding...');
    
    const server = await createServer({
      configFile: join(__dirname, 'vite.config.ts'),
      server: {
        host: 'localhost',  // Use localhost directly
        port: 8080,
        strictPort: true,
        open: true,
        cors: true,
      },
      logLevel: 'info'
    });

    await server.listen();

    console.log('✅ Server started successfully!');
    console.log('🌐 Your app is available at: http://localhost:8080');
    
    // Test the connection
    const testConnection = async () => {
      try {
        const response = await fetch('http://localhost:8080');
        console.log('✅ localhost:8080 is responding with status:', response.status);
      } catch (error) {
        console.error('❌ localhost:8080 test failed:', error.message);
      }
    };
    
    setTimeout(testConnection, 2000);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    
    if (error.message.includes('EADDRINUSE')) {
      console.log('🔧 Port 8080 is in use. Trying to kill existing processes...');
      
      // Kill any processes using port 8080
      const { exec } = await import('child_process');
      exec('lsof -ti:8080 | xargs kill -9', (err) => {
        if (!err) {
          console.log('✅ Killed existing processes. Restarting...');
          setTimeout(() => startServer(), 2000);
        }
      });
    }
  }
}

startServer();

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});