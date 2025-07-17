#!/usr/bin/env node
/**
 * Live Gmail Registration Test Coordinator
 * Starts all monitoring systems for real-time Gmail registration testing
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 GMAIL REGISTRATION LIVE TEST COORDINATOR');
console.log('=' .repeat(70));

class LiveTestCoordinator {
  constructor() {
    this.processes = [];
    this.isRunning = false;
  }

  async startTest() {
    console.log('📋 STARTING COMPREHENSIVE REGISTRATION MONITORING...\n');
    
    // Step 1: Start database monitor
    console.log('1️⃣ Starting real-time database monitor...');
    const dbMonitor = spawn('node', ['real-time-db-monitor.js'], {
      stdio: 'inherit',
      cwd: __dirname
    });
    this.processes.push({ name: 'Database Monitor', process: dbMonitor });

    // Step 2: Start development server if not running
    console.log('2️⃣ Checking development server...');
    try {
      const response = await fetch('http://localhost:8081');
      console.log('   ✅ Development server already running on port 8081');
    } catch (e) {
      console.log('   🚀 Starting development server...');
      const devServer = spawn('npm', ['run', 'dev'], {
        stdio: 'inherit',
        cwd: __dirname
      });
      this.processes.push({ name: 'Dev Server', process: devServer });
      
      // Wait for server to start
      await this.waitForServer();
    }

    // Step 3: Display test instructions
    this.displayTestInstructions();

    // Step 4: Set up cleanup handlers
    this.setupCleanupHandlers();

    this.isRunning = true;
  }

  async waitForServer() {
    console.log('   ⏳ Waiting for development server to start...');
    
    for (let i = 0; i < 30; i++) { // Wait up to 30 seconds
      try {
        const response = await fetch('http://localhost:8081');
        console.log('   ✅ Development server ready!');
        return;
      } catch (e) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('   ⚠️  Development server may not be ready yet');
  }

  displayTestInstructions() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 LIVE TEST READY - FOLLOW THESE STEPS:');
    console.log('='.repeat(70));
    
    console.log('\n📱 BROWSER SETUP:');
    console.log('1. Open browser to: http://localhost:8081');
    console.log('2. Open Developer Tools (F12)');
    console.log('3. Go to Console tab');
    console.log('4. Run this command to start frontend tracing:');
    console.log('   📝 window.registrationTracer.startTracing()');
    
    console.log('\n🎯 REGISTRATION TEST:');
    console.log('1. Click "Sign In / Register" button');
    console.log('2. Click "Continue with Google"');
    console.log('3. Use your test Gmail account to sign in');
    console.log('4. Watch the console for real-time logs');
    
    console.log('\n👁️ MONITORING ACTIVE:');
    console.log('✅ Database monitor: Watching for profile creation');
    console.log('✅ Frontend tracer: Monitoring network requests & errors');
    console.log('✅ Auth context: Logging all authentication events');
    console.log('✅ URL monitor: Detecting error redirects');
    
    console.log('\n📊 AFTER REGISTRATION (SUCCESS OR FAILURE):');
    console.log('1. In browser console, run: window.authLogger.exportLogs()');
    console.log('2. In browser console, run: window.registrationTracer.exportTrace()');
    console.log('3. Press Ctrl+C here to stop monitoring and get reports');
    
    console.log('\n🔍 WHAT TO WATCH FOR:');
    console.log('❌ ERROR SIGNS:');
    console.log('   - URL contains "error_description=Database+error+saving+new+user"');
    console.log('   - Console shows "RLS_BLOCKING" in database monitor');
    console.log('   - No new profile created in database');
    console.log('   - Network errors to Supabase auth endpoints');
    
    console.log('\n✅ SUCCESS SIGNS:');
    console.log('   - NEW_PROFILE_CREATED appears in database monitor');
    console.log('   - User name appears in top-right navigation');
    console.log('   - No error URLs or console errors');
    console.log('   - Profile data populated with Google info');
    
    console.log('\n🚨 READY TO TEST! Use your Gmail account now...');
    console.log('='.repeat(70));
  }

  setupCleanupHandlers() {
    const cleanup = () => {
      console.log('\n🛑 STOPPING ALL MONITORING PROCESSES...');
      
      this.processes.forEach(({ name, process }) => {
        console.log(`   Stopping ${name}...`);
        process.kill('SIGTERM');
      });
      
      console.log('\n📊 TEST COMPLETE - Check the generated reports');
      console.log('📁 Reports saved to:');
      console.log('   - db-monitor-report-*.json (database monitoring)');
      console.log('   - Browser localStorage (frontend traces)');
      
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // Also handle when child processes exit
    this.processes.forEach(({ name, process }) => {
      process.on('exit', (code) => {
        if (this.isRunning) {
          console.log(`⚠️  ${name} exited with code ${code}`);
        }
      });
    });
  }
}

// Start the test
const coordinator = new LiveTestCoordinator();
coordinator.startTest().catch(error => {
  console.error('💥 Failed to start live test:', error);
  process.exit(1);
});