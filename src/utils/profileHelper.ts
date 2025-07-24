// Profile Helper - Ensures user profiles exist and handles edge cases
import { supabase } from '@/lib/supabase';

/**
 * Ensures a user profile exists in the profiles table
 * This handles edge cases where auth trigger might have failed
 */
export async function ensureUserProfile(userId: string): Promise<boolean> {
  try {
    // First check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return true; // Profile already exists
    }

    // If profile doesn't exist, get user info from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      console.error('Auth error or user mismatch:', authError);
      return false;
    }

    // Create profile with user data
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || 
                   user.user_metadata?.name || 
                   user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url,
        notification_preferences: {
          emailMarketing: true,
          emailUpdates: true,
          emailTickets: true,
          pushNotifications: true,
          smsNotifications: false
        },
        privacy_settings: {
          profileVisible: true,
          showEmail: false,
          showPhone: false,
          showEvents: true
        },
        is_admin: user.email === 'iradwatkins@gmail.com',
        admin_level: user.email === 'iradwatkins@gmail.com' ? 3 : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      // Check if it's a unique constraint error (profile was created concurrently)
      if (insertError.code === '23505') {
        return true; // Profile exists now
      }
      console.error('Failed to create profile:', insertError);
      return false;
    }

    console.log('Profile created successfully for user:', userId);
    return true;
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    return false;
  }
}

/**
 * Wrapper for operations that require a profile to exist
 * Ensures profile exists before proceeding with the operation
 */
export async function withProfileCheck<T>(
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  const profileExists = await ensureUserProfile(userId);
  
  if (!profileExists) {
    throw new Error('Failed to ensure user profile exists');
  }
  
  return operation();
}

/**
 * Hook to use in components that require profile operations
 */
export function useProfileCheck() {
  const checkAndCreateProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return ensureUserProfile(user.id);
    }
    return false;
  };

  return { checkAndCreateProfile };
}