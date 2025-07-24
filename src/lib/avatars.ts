// Enhanced avatar service with comprehensive Google OAuth support and caching

interface AvatarCache {
  [userId: string]: {
    url: string
    timestamp: number
  }
}

export class AvatarService {
  private static cache: AvatarCache = {}
  private static CACHE_DURATION = 3600000 // 1 hour in milliseconds
  
  // Generate a consistent color-based avatar URL using DiceBear API
  static generateGenericAvatar(seed: string, style: 'avataaars' | 'initials' | 'personas' = 'initials'): string {
    const cleanSeed = encodeURIComponent(seed.toLowerCase().trim())
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${cleanSeed}&backgroundColor=random`
  }
  
  // Get high-resolution Google avatar URL if available
  static getHighResGoogleAvatar(url: string): string {
    if (!url || !url.includes('googleusercontent.com')) return url
    
    // Google avatar URLs can have size parameters
    // Replace =s96-c with =s400-c for higher resolution
    return url.replace(/=s\d+-c/, '=s400-c')
  }

  // Get avatar URL with proper fallback chain and caching
  static getAvatarUrl(user: any, profile: any): string {
    // Check cache first
    const userId = user?.id || profile?.id
    if (userId && this.cache[userId]) {
      const cached = this.cache[userId]
      if (Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.url
      }
    }
    
    let avatarUrl: string | null = null
    
    // 1. Try profile avatar_url first (most reliable)
    if (profile?.avatar_url) {
      avatarUrl = this.getHighResGoogleAvatar(profile.avatar_url)
    }
    
    // 2. Try all possible Google OAuth fields
    const googleFields = [
      user?.user_metadata?.avatar_url,
      user?.user_metadata?.picture,
      user?.user_metadata?.photo_url,
      user?.raw_user_meta_data?.avatar_url,
      user?.raw_user_meta_data?.picture,
      user?.raw_user_meta_data?.photo_url,
      user?.raw_app_metadata?.avatar_url,
      user?.identities?.[0]?.identity_data?.avatar_url,
      user?.identities?.[0]?.identity_data?.picture
    ]
    
    if (!avatarUrl) {
      for (const field of googleFields) {
        if (field) {
          avatarUrl = this.getHighResGoogleAvatar(field)
          break
        }
      }
    }

    // 3. Check localStorage fallback (for uploaded avatars)
    if (!avatarUrl) {
      const localAvatar = this.getFallbackAvatar(userId)
      if (localAvatar) {
        avatarUrl = localAvatar
      }
    }

    // 4. Generate fallback based on name or email
    if (!avatarUrl) {
      const nameFields = [
        user?.user_metadata?.full_name,
        user?.user_metadata?.name,
        user?.raw_user_meta_data?.full_name,
        user?.raw_user_meta_data?.name,
        profile?.full_name,
        user?.identities?.[0]?.identity_data?.full_name,
        user?.identities?.[0]?.identity_data?.name
      ]
      
      const seed = nameFields.find(name => name && name.trim()) || 
                   user?.email || 
                   profile?.email || 
                   'default'
      
      avatarUrl = this.generateGenericAvatar(seed)
    }
    
    // Cache the result
    if (userId && avatarUrl) {
      this.cache[userId] = {
        url: avatarUrl,
        timestamp: Date.now()
      }
    }
    
    return avatarUrl
  }

  // Get user initials for fallback with better name extraction
  static getInitials(user: any, profile: any): string {
    // Try all possible name fields
    const nameFields = [
      user?.user_metadata?.full_name,
      user?.user_metadata?.name,
      user?.raw_user_meta_data?.full_name,
      user?.raw_user_meta_data?.name,
      profile?.full_name,
      user?.identities?.[0]?.identity_data?.full_name,
      user?.identities?.[0]?.identity_data?.name,
      // Combine given_name and family_name if available
      (user?.user_metadata?.given_name && user?.user_metadata?.family_name) 
        ? `${user.user_metadata.given_name} ${user.user_metadata.family_name}` 
        : null,
      (user?.raw_user_meta_data?.given_name && user?.raw_user_meta_data?.family_name)
        ? `${user.raw_user_meta_data.given_name} ${user.raw_user_meta_data.family_name}`
        : null
    ]
    
    const fullName = nameFields.find(name => name && name.trim())

    if (fullName) {
      const names = fullName.trim().split(/\s+/)
      if (names.length >= 2) {
        // Use first letter of first name and last name
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      } else {
        // Use first two letters of single name
        return fullName.slice(0, 2).toUpperCase()
      }
    }

    const email = user?.email || profile?.email
    return email ? email[0].toUpperCase() : 'U'
  }
  
  // Clear avatar cache for a specific user
  static clearCache(userId?: string) {
    if (userId) {
      delete this.cache[userId]
    } else {
      this.cache = {}
    }
  }

  // Validate image file for upload
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 5MB' }
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' }
    }

    return { valid: true }
  }

  // Create a fallback avatar upload function for when Supabase storage isn't configured
  static async uploadAvatarFallback(userId: string, file: File): Promise<string> {
    // For demo purposes, we'll use a file-to-base64 conversion
    // In production, you'd want to use a proper storage service
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64String = reader.result as string
        // Store in localStorage as fallback (not recommended for production)
        localStorage.setItem(`avatar_${userId}`, base64String)
        resolve(base64String)
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  // Get stored fallback avatar
  static getFallbackAvatar(userId: string): string | null {
    return localStorage.getItem(`avatar_${userId}`)
  }
}