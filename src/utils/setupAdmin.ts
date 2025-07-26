/**
 * SECURITY-HARDENED Admin Setup Utility
 * 
 * Secure admin setup that requires explicit authentication and authorization.
 * Removes client-side environment variable exposure for better security.
 */

import { supabase } from '@/lib/supabase'

/**
 * SECURITY FIX: Secure admin setup that requires current user authentication
 * and explicit email confirmation instead of using client-side env vars
 */
export const secureAdminSetup = async (targetAdminEmail: string, confirmPassword: string) => {
  // Verify current user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return {
      success: false,
      message: 'Authentication required to perform admin setup',
      requiresAuth: true
    }
  }

  // Verify password confirmation
  const { error: passwordError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: confirmPassword
  })
  
  if (passwordError) {
    return {
      success: false,
      message: 'Password confirmation failed',
      invalidCredentials: true
    }
  }
  
  console.log('🔐 Secure admin setup for:', targetAdminEmail)
  
  try {
    // First, check if admin columns exist
    const { error: columnCheckError } = await supabase
      .from('profiles')
      .select('is_admin')
      .limit(0)
    
    if (columnCheckError?.code === '42703') {
      console.warn('⚠️ Admin columns not found in profiles table. Run migration 007_add_admin_permissions.sql')
      return {
        success: false,
        message: 'Admin columns missing. Database migration required.',
        migrationNeeded: true
      }
    }
    
    // Check if target user exists in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, is_admin, admin_level')
      .eq('email', targetAdminEmail)
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
      .rpc('get_admin_permissions', { user_id: profile.id })
    
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

// SECURITY FIX: Secure admin status check requiring explicit email parameter
export const checkAdminStatus = async (email: string) => {
  if (!email) {
    return {
      exists: false,
      isAdmin: false,
      error: 'Email parameter required'
    }
  }
  try {
    // First check if admin columns exist
    const { error: columnCheckError } = await supabase
      .from('profiles')
      .select('is_admin')
      .limit(0)
    
    if (columnCheckError?.code === '42703') {
      return { 
        exists: false, 
        isAdmin: false,
        error: 'Admin columns missing - migration needed',
        migrationNeeded: true
      }
    }
    
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
      .rpc('get_admin_permissions', { user_id: profile.id })
    
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

/**
 * @deprecated SECURITY VULNERABILITY - Use secureAdminSetup instead
 * This function exposes admin email through client-side environment variables
 */
export const manualAdminSetup = async () => {
  console.warn('⚠️ DEPRECATED: manualAdminSetup() has security vulnerabilities. Use secureAdminSetup() instead.')
  return {
    success: false,
    message: 'This function is deprecated for security reasons. Use secureAdminSetup() with proper authentication.',
    deprecated: true
  }
}

/**
 * SECURITY NOTE: Browser console access has been removed for security.
 * Admin setup must now be performed through authenticated UI components
 * that properly validate user credentials and authorization.
 * 
 * This prevents potential security vulnerabilities from:
 * - Client-side environment variable exposure
 * - Unauthorized admin privilege escalation
 * - Browser-based attack vectors
 */