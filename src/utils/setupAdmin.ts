/**
 * Manual Admin Setup Utility
 * 
 * This utility can be used to manually set up iradwatkins@gmail.com as admin
 * when the automatic setup doesn't work due to database constraints.
 */

import { supabase } from '@/lib/supabase'

export const manualAdminSetup = async () => {
  const adminEmail = 'iradwatkins@gmail.com'
  
  console.log('🔐 Manual admin setup for:', adminEmail)
  
  try {
    // First, check if user exists in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, is_admin, admin_level')
      .eq('email', adminEmail)
      .single()
    
    if (profileError) {
      console.error('❌ User not found in profiles:', profileError)
      
      if (profileError.code === 'PGRST116') {
        console.log('💡 User needs to sign up first at: /account')
        return {
          success: false,
          message: 'User not found. Please sign up first.',
          needsSignup: true
        }
      }
      
      throw profileError
    }
    
    console.log('✅ Found user profile:', profile)
    
    // Check current admin status
    if (profile.is_admin && profile.admin_level >= 3) {
      console.log('✅ User is already a super admin')
      return {
        success: true,
        message: 'User is already a super admin',
        alreadyAdmin: true
      }
    }
    
    // Update to super admin
    console.log('🔄 Updating user to super admin...')
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_admin: true,
        admin_level: 3,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
    
    if (updateError) {
      console.error('❌ Failed to update profile:', updateError)
      throw updateError
    }
    
    console.log('✅ Updated profile to super admin')
    
    // Create admin permissions
    console.log('🔄 Setting up admin permissions...')
    const { error: permError } = await supabase
      .from('admin_permissions')
      .upsert({
        user_id: profile.id,
        can_manage_users: true,
        can_manage_events: true,
        can_view_analytics: true,
        can_manage_system: true,
        can_manage_billing: true,
        granted_by: profile.id,
        granted_at: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString()
      })
    
    if (permError) {
      console.error('❌ Failed to create admin permissions:', permError)
      throw permError
    }
    
    console.log('✅ Admin permissions created successfully')
    
    // Verify the setup
    const { data: verification, error: verifyError } = await supabase
      .rpc('get_admin_permissions', { user_uuid: profile.id })
    
    if (verifyError) {
      console.warn('⚠️ Could not verify admin setup:', verifyError)
    } else {
      console.log('✅ Admin setup verified:', verification)
    }
    
    return {
      success: true,
      message: 'Admin setup completed successfully',
      userId: profile.id,
      permissions: verification?.[0]
    }
    
  } catch (error) {
    console.error('❌ Manual admin setup failed:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error
    }
  }
}

// Function to check admin status
export const checkAdminStatus = async (email: string = 'iradwatkins@gmail.com') => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, is_admin, admin_level')
      .eq('email', email)
      .single()
    
    if (error) {
      return { 
        exists: false, 
        isAdmin: false,
        error: error.message 
      }
    }
    
    const { data: permissions } = await supabase
      .rpc('get_admin_permissions', { user_uuid: profile.id })
    
    return {
      exists: true,
      isAdmin: profile.is_admin,
      adminLevel: profile.admin_level,
      permissions: permissions?.[0],
      profile
    }
    
  } catch (error) {
    console.error('Error checking admin status:', error)
    return { 
      exists: false, 
      isAdmin: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Console helper functions for browser debugging
if (typeof window !== 'undefined') {
  (window as any).setupAdmin = manualAdminSetup
  (window as any).checkAdmin = checkAdminStatus
  
  console.log('🔐 Admin setup utilities loaded:')
  console.log('  - Run setupAdmin() to manually set up iradwatkins@gmail.com as admin')
  console.log('  - Run checkAdmin() to check current admin status')
}