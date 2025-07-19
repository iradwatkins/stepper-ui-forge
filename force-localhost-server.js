#!/usr/bin/env node

// Force a server to run on localhost:8080 specifically
import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function killProcessOnPort(port) {
  try {
    console.log(`🔧 Attempting to kill processes on port ${port}...`);
    
    // Try different commands based on OS
    const commands = [
      `lsof -ti:${port} | xargs kill -9`,
      `netstat -ano | findstr :${port}`,
      `taskkill /F /PID $(netstat -ano | findstr :${port} | awk '{print $5}' | head -1)`
    ];
    
    for (const command of commands) {
      try {
        const { stdout, stderr } = await execAsync(command);
        if (stdout) console.log('Process kill output:', stdout);
        if (stderr) console.log('Process kill stderr:', stderr);
        break;
      } catch (err) {
        // Try next command
        continue;
      }
    }
    
    // Wait a moment for processes to terminate
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Port cleanup complete');
  } catch (error) {
    console.log('⚠️ Could not kill processes on port (this may be normal):', error.message);
  }
}

async function startServer() {
  try {
    console.log('🔧 Starting Vite server with forced localhost:8080 binding...');
    
    const server = await createServer({
      configFile: join(__dirname, 'vite.config.ts'),
      server: {
        host: 'localhost',
        port: 8080,
        strictPort: false,  // Allow fallback to other ports if 8080 is busy
        open: true,
        cors: true,
      },
      logLevel: 'info'
    });

    const serverInfo = await server.listen();
    const actualPort = serverInfo.config.server.port;

    console.log('✅ Server started successfully!');
    console.log(`🌐 Your app is available at: http://localhost:${actualPort}`);
    
    // Test the connection
    const testConnection = async () => {
      try {
        const response = await fetch(`http://localhost:${actualPort}`);
        console.log(`✅ localhost:${actualPort} is responding with status:`, response.status);
      } catch (error) {
        console.error(`❌ localhost:${actualPort} test failed:`, error.message);
      }
    };
    
    setTimeout(testConnection, 3000);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    
    if (error.message.includes('EADDRINUSE') || error.code === 'EADDRINUSE') {
      console.log('🔧 Port 8080 is in use. Attempting to free it...');
      await killProcessOnPort(8080);
      
      console.log('🔄 Retrying server start...');
      setTimeout(() => startServer(), 3000);
    } else {
      console.error('❌ Unknown error starting server. Try running: npm run dev');
      process.exit(1);
    }
  }
}

startServer();

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});