// Generic avatar service for fallback avatars and improved avatar handling

export class AvatarService {
  
  // Generate a consistent color-based avatar URL using DiceBear API
  static generateGenericAvatar(seed: string, style: 'avataaars' | 'initials' | 'personas' = 'initials'): string {
    const cleanSeed = encodeURIComponent(seed.toLowerCase().trim())
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${cleanSeed}&backgroundColor=random`
  }

  // Get avatar URL with proper fallback chain
  static getAvatarUrl(user: any, profile: any): string {
    // 1. Try profile avatar_url first
    if (profile?.avatar_url) {
      return profile.avatar_url
    }

    // 2. Try Google profile picture from user metadata
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url
    }

    // 3. Try picture from user metadata (alternative field)
    if (user?.user_metadata?.picture) {
      return user.user_metadata.picture
    }

    // 4. Try raw_user_meta_data (fallback for OAuth providers)
    if (user?.raw_user_meta_data?.avatar_url) {
      return user.raw_user_meta_data.avatar_url
    }

    // 5. Try raw_user_meta_data picture field
    if (user?.raw_user_meta_data?.picture) {
      return user.raw_user_meta_data.picture
    }

    // 6. Check localStorage fallback (for uploaded avatars)
    const localAvatar = this.getFallbackAvatar(user?.id)
    if (localAvatar) {
      return localAvatar
    }

    // 7. Generate fallback based on name or email
    const seed = user?.user_metadata?.full_name || 
                 user?.user_metadata?.name ||
                 user?.raw_user_meta_data?.full_name ||
                 user?.raw_user_meta_data?.name ||
                 profile?.full_name || 
                 user?.email || 
                 'default'
    
    return this.generateGenericAvatar(seed)
  }

  // Get user initials for fallback
  static getInitials(user: any, profile: any): string {
    const fullName = user?.user_metadata?.full_name || 
                     user?.user_metadata?.name ||
                     user?.raw_user_meta_data?.full_name ||
                     user?.raw_user_meta_data?.name ||
                     profile?.full_name

    if (fullName) {
      return fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    const email = user?.email || profile?.email
    return email ? email[0].toUpperCase() : 'U'
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