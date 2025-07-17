#!/usr/bin/env node
/**
 * Real-Time Database Monitor for Gmail Registration Testing
 * Monitors Supabase database during live registration attempts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

class RealTimeDBMonitor {
  constructor() {
    this.isMonitoring = false;
    this.lastAuthUserCount = 0;
    this.lastProfileCount = 0;
    this.testStartTime = new Date();
    this.detectedChanges = [];
  }

  async startMonitoring() {
    console.log('🔍 REAL-TIME DATABASE MONITOR STARTED');
    console.log('📅 Test Start Time:', this.testStartTime.toISOString());
    console.log('=' .repeat(70));
    
    this.isMonitoring = true;
    
    // Get initial counts
    await this.getBaseline();
    
    // Start polling loop
    this.pollDatabase();
    
    // Set up real-time subscriptions if possible
    this.setupRealtimeSubscriptions();
    
    console.log('👀 Monitoring active. Register with your Gmail account now!');
    console.log('📊 Press Ctrl+C to stop monitoring and export results');
  }

  async getBaseline() {
    try {
      // Count auth.users (we can't query directly, but we can count profiles as proxy)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, created_at, is_admin')
        .order('created_at', { ascending: false });

      if (profileError) {
        console.log('❌ Error getting profile baseline:', profileError.message);
      } else {
        this.lastProfileCount = profiles.length;
        console.log(`📊 BASELINE: ${profiles.length} profiles in database`);
        
        if (profiles.length > 0) {
          console.log('   Recent profiles:');
          profiles.slice(0, 3).forEach((profile, index) => {
            console.log(`   ${index + 1}. ${profile.email} (${profile.created_at})`);
          });
        }
      }
    } catch (err) {
      console.log('❌ Error getting baseline:', err.message);
    }
  }

  async pollDatabase() {
    if (!this.isMonitoring) return;

    try {
      // Check for new profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!profileError && profiles.length !== this.lastProfileCount) {
        const newProfileCount = profiles.length;
        const change = newProfileCount - this.lastProfileCount;
        
        this.logChange('PROFILE_COUNT_CHANGE', {
          oldCount: this.lastProfileCount,
          newCount: newProfileCount,
          change: change,
          timestamp: new Date().toISOString()
        });

        // If new profiles were added, show details
        if (change > 0) {
          const newProfiles = profiles.slice(0, change);
          newProfiles.forEach(profile => {
            this.logChange('NEW_PROFILE_CREATED', {
              id: profile.id,
              email: profile.email,
              fullName: profile.full_name,
              avatarUrl: profile.avatar_url,
              isAdmin: profile.is_admin,
              adminLevel: profile.admin_level,
              createdAt: profile.created_at,
              profileData: profile
            });
          });
        }

        this.lastProfileCount = newProfileCount;
      }

      // Check for database errors by testing a simple operation
      try {
        const testId = '99999999-9999-9999-9999-999999999999';
        const { error: testError } = await supabase
          .from('profiles')
          .insert({
            id: testId,
            email: 'monitor-test@test.com',
            full_name: 'Monitor Test'
          });

        if (testError) {
          if (testError.message.includes('row-level security')) {
            this.logChange('RLS_BLOCKING', {
              error: testError.message,
              timestamp: new Date().toISOString(),
              note: 'RLS policies are blocking profile creation'
            });
          } else if (testError.message.includes('foreign key')) {
            // This is expected - means RLS allows but foreign key constraint blocks
            // This is good - it means RLS is not the issue
          } else {
            this.logChange('UNEXPECTED_DB_ERROR', {
              error: testError.message,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          // Clean up test record
          await supabase.from('profiles').delete().eq('id', testId);
        }
      } catch (testErr) {
        this.logChange('DB_TEST_ERROR', {
          error: testErr.message,
          timestamp: new Date().toISOString()
        });
      }

    } catch (err) {
      this.logChange('POLLING_ERROR', {
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }

    // Continue polling every 2 seconds
    setTimeout(() => this.pollDatabase(), 2000);
  }

  setupRealtimeSubscriptions() {
    try {
      // Subscribe to profile changes
      const profileSubscription = supabase
        .channel('profile_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'profiles' 
          }, 
          (payload) => {
            this.logChange('REALTIME_PROFILE_CHANGE', {
              event: payload.eventType,
              table: payload.table,
              old: payload.old,
              new: payload.new,
              timestamp: new Date().toISOString()
            });
          }
        )
        .subscribe((status) => {
          console.log('📡 Profile subscription status:', status);
        });

    } catch (err) {
      console.log('⚠️  Real-time subscriptions not available:', err.message);
    }
  }

  logChange(type, data) {
    const timestamp = new Date().toISOString();
    const change = {
      timestamp,
      type,
      data,
      timeFromStart: Date.now() - this.testStartTime.getTime()
    };

    this.detectedChanges.push(change);

    // Console output with formatting
    console.log(`\n🔔 [${type}] ${timestamp}`);
    if (type === 'NEW_PROFILE_CREATED') {
      console.log(`   📧 Email: ${data.email}`);
      console.log(`   👤 Name: ${data.fullName || 'Not set'}`);
      console.log(`   🆔 ID: ${data.id}`);
      console.log(`   🔐 Admin: ${data.isAdmin} (Level: ${data.adminLevel})`);
      console.log(`   🕐 Created: ${data.createdAt}`);
    } else if (type === 'RLS_BLOCKING') {
      console.log(`   ❌ CRITICAL: ${data.error}`);
      console.log(`   💡 This is likely the cause of registration failures`);
    } else {
      console.log(`   📄 Data:`, JSON.stringify(data, null, 2));
    }
  }

  async stopMonitoring() {
    this.isMonitoring = false;
    console.log('\n' + '='.repeat(70));
    console.log('🛑 MONITORING STOPPED');
    console.log('📊 COMPLETE RESULTS:');
    console.log('='.repeat(70));
    
    console.log(`📅 Test Duration: ${Date.now() - this.testStartTime.getTime()}ms`);
    console.log(`🔢 Total Changes Detected: ${this.detectedChanges.length}`);
    
    if (this.detectedChanges.length === 0) {
      console.log('\n❌ NO CHANGES DETECTED');
      console.log('This suggests:');
      console.log('1. Registration failed before reaching the database');
      console.log('2. User was not created in auth.users table');
      console.log('3. Trigger function did not execute');
      console.log('\n🔍 Check browser console logs for frontend errors');
    } else {
      console.log('\n📋 DETECTED CHANGES:');
      this.detectedChanges.forEach((change, index) => {
        console.log(`\n${index + 1}. [${change.type}] +${change.timeFromStart}ms`);
        console.log(`   Time: ${change.timestamp}`);
        if (change.type === 'NEW_PROFILE_CREATED') {
          console.log(`   ✅ SUCCESS: Profile created for ${change.data.email}`);
        } else if (change.type === 'RLS_BLOCKING') {
          console.log(`   ❌ FAILURE: RLS blocking profile creation`);
        }
      });
    }

    // Export to file
    const reportData = {
      testStartTime: this.testStartTime.toISOString(),
      testDuration: Date.now() - this.testStartTime.getTime(),
      changesDetected: this.detectedChanges.length,
      changes: this.detectedChanges
    };

    try {
      const fs = await import('fs');
      const filename = `db-monitor-report-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(reportData, null, 2));
      console.log(`\n💾 Report saved to: ${filename}`);
    } catch (err) {
      console.log('⚠️  Could not save report:', err.message);
    }

    process.exit(0);
  }
}

// Start monitoring
const monitor = new RealTimeDBMonitor();

// Handle graceful shutdown
process.on('SIGINT', () => {
  monitor.stopMonitoring();
});

process.on('SIGTERM', () => {
  monitor.stopMonitoring();
});

// Start the monitoring
monitor.startMonitoring().catch(error => {
  console.error('💥 Monitor failed to start:', error);
  process.exit(1);
});