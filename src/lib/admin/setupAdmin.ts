import { supabase } from '@/integrations/supabase/client'

/**
 * Sets up initial admin users for the platform
 * This should be run once during initial setup
 */
export const setupInitialAdmin = async () => {
  try {
    const adminEmail = 'iradwatkins@gmail.com'
    
    console.log('Setting up initial admin user:', adminEmail)
    
    // First check if admin columns exist
    const { error: columnCheckError } = await supabase
      .from('profiles')
      .select('is_admin')
      .limit(0)
    
    if (columnCheckError?.code === '42703') {
      console.warn('Admin columns not found. Migration 007_add_admin_permissions.sql needs to be run.')
      return {
        success: false,
        message: 'Admin columns missing. Database migration required.',
        migrationNeeded: true
      }
    }
    
    // First, find the user by email
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, email, is_admin, admin_level')
      .eq('email', adminEmail)
      .single()
    
    if (userError) {
      console.error('Error finding user:', userError)
      if (userError.code === 'PGRST116') {
        console.log('User not found. They need to sign up first.')
        return { 
          success: false, 
          message: 'Admin user not found. Please ensure they have signed up first.' 
        }
      }
      throw userError
    }
    
    if (userData.is_admin && userData.admin_level >= 3) {
      console.log('User is already a super admin')
      return { 
        success: true, 
        message: 'User is already a super admin',
        userId: userData.id 
      }
    }
    
    // Update user to super admin directly in the database
    // Since we can't use the promote function without an existing super admin
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_admin: true,
        admin_level: 3, // Super admin
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id)
    
    if (updateError) {
      console.error('Error updating user admin status:', updateError)
      throw updateError
    }
    
    // Create admin permissions entry
    const { error: permissionsError } = await supabase
      .from('admin_permissions')
      .upsert({
        user_id: userData.id,
        can_manage_users: true,
        can_manage_events: true,
        can_view_analytics: true,
        can_manage_system: true,
        can_manage_billing: true,
        granted_by: userData.id, // Self-granted for initial setup
        granted_at: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString()
      })
    
    if (permissionsError) {
      console.error('Error creating admin permissions:', permissionsError)
      throw permissionsError
    }
    
    console.log('Successfully set up admin user:', adminEmail)
    return { 
      success: true, 
      message: 'Admin user setup completed successfully',
      userId: userData.id 
    }
    
  } catch (error) {
    console.error('Error setting up admin user:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Check if the current user is the designated admin
 */
export const checkAdminSetup = async () => {
  try {
    const adminEmail = 'iradwatkins@gmail.com'
    
    // First check if admin columns exist
    const { error: columnCheckError } = await supabase
      .from('profiles')
      .select('is_admin')
      .limit(0)
    
    if (columnCheckError?.code === '42703') {
      // Admin columns don't exist yet
      return { hasAdmin: false, adminExists: false, migrationNeeded: true }
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, is_admin, admin_level')
      .eq('email', adminEmail)
      .single()
    
    if (error) {
      return { hasAdmin: false, adminExists: false }
    }
    
    return { 
      hasAdmin: data.is_admin && data.admin_level >= 3,
      adminExists: true,
      adminData: data
    }
  } catch (error) {
    console.error('Error checking admin setup:', error)
    return { hasAdmin: false, adminExists: false }
  }
}