import { supabase, isSupabaseReady } from './supabase'
import { Profile, ProfileInsert, ProfileUpdate } from '@/types/database'

export class ProfileService {
  static async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseReady) {
      console.warn('Supabase not configured - returning mock profile')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getProfile:', error)
      return null
    }
  }

  static async updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateProfile:', error)
      throw error
    }
  }

  static async createProfile(profile: ProfileInsert): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert(profile)
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createProfile:', error)
      throw error
    }
  }

  static async uploadAvatar(userId: string, file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/avatar.${fileExt}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        })

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      if (!data?.publicUrl) {
        throw new Error('Failed to get avatar URL')
      }

      // Update profile with avatar URL
      await this.updateProfile(userId, { avatar_url: data.publicUrl })

      return data.publicUrl
    } catch (error) {
      console.error('Error in uploadAvatar:', error)
      throw error
    }
  }

  static async updateNotificationPreferences(
    userId: string, 
    preferences: Profile['notification_preferences']
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: preferences })
        .eq('id', userId)

      if (error) {
        console.error('Error updating notification preferences:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in updateNotificationPreferences:', error)
      throw error
    }
  }

  static async updatePrivacySettings(
    userId: string, 
    settings: Profile['privacy_settings']
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ privacy_settings: settings })
        .eq('id', userId)

      if (error) {
        console.error('Error updating privacy settings:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in updatePrivacySettings:', error)
      throw error
    }
  }

  static async deleteProfile(userId: string): Promise<void> {
    try {
      // Note: This will cascade delete related data due to foreign key constraints
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) {
        console.error('Error deleting profile:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteProfile:', error)
      throw error
    }
  }
}