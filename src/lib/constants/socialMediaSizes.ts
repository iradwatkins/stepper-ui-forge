// Social Media Image Size Constants
// Optimal dimensions for each platform to ensure best display quality

export interface ImageSize {
  width: number
  height: number
  aspectRatio: string
  description: string
}

export interface PlatformSizes {
  [key: string]: ImageSize
}

export const SOCIAL_MEDIA_SIZES: PlatformSizes = {
  // Instagram
  INSTAGRAM_SQUARE: {
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    description: 'Instagram Square Post'
  },
  INSTAGRAM_PORTRAIT: {
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    description: 'Instagram Portrait Post'
  },
  INSTAGRAM_LANDSCAPE: {
    width: 1080,
    height: 566,
    aspectRatio: '1.91:1',
    description: 'Instagram Landscape Post'
  },
  INSTAGRAM_STORY: {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    description: 'Instagram Story/Reel'
  },
  
  // Facebook
  FACEBOOK_POST: {
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    description: 'Facebook Feed Post'
  },
  FACEBOOK_SQUARE: {
    width: 1200,
    height: 1200,
    aspectRatio: '1:1',
    description: 'Facebook Square Post'
  },
  FACEBOOK_STORY: {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    description: 'Facebook Story'
  },
  FACEBOOK_EVENT_COVER: {
    width: 1920,
    height: 1005,
    aspectRatio: '1.91:1',
    description: 'Facebook Event Cover'
  },
  
  // Twitter/X
  TWITTER_POST: {
    width: 1200,
    height: 675,
    aspectRatio: '16:9',
    description: 'Twitter/X In-Stream Photo'
  },
  TWITTER_HEADER: {
    width: 1500,
    height: 500,
    aspectRatio: '3:1',
    description: 'Twitter/X Header'
  },
  
  // LinkedIn
  LINKEDIN_POST: {
    width: 1200,
    height: 628,
    aspectRatio: '1.91:1',
    description: 'LinkedIn Feed Post'
  },
  LINKEDIN_SQUARE: {
    width: 1200,
    height: 1200,
    aspectRatio: '1:1',
    description: 'LinkedIn Square Post'
  },
  
  // WhatsApp
  WHATSAPP_STATUS: {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    description: 'WhatsApp Status'
  },
  WHATSAPP_SHARE: {
    width: 1280,
    height: 720,
    aspectRatio: '16:9',
    description: 'WhatsApp Share Preview'
  },
  
  // TikTok
  TIKTOK_VIDEO: {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    description: 'TikTok Video Cover'
  },
  
  // Pinterest
  PINTEREST_PIN: {
    width: 1000,
    height: 1500,
    aspectRatio: '2:3',
    description: 'Pinterest Pin'
  },
  
  // YouTube
  YOUTUBE_THUMBNAIL: {
    width: 1280,
    height: 720,
    aspectRatio: '16:9',
    description: 'YouTube Thumbnail'
  }
}

// Quick access by platform
export const PLATFORM_DEFAULTS = {
  instagram: 'INSTAGRAM_SQUARE',
  facebook: 'FACEBOOK_POST',
  twitter: 'TWITTER_POST',
  linkedin: 'LINKEDIN_POST',
  whatsapp: 'WHATSAPP_SHARE',
  tiktok: 'TIKTOK_VIDEO',
  pinterest: 'PINTEREST_PIN',
  youtube: 'YOUTUBE_THUMBNAIL'
} as const

// Get size for a specific platform
export function getSizeForPlatform(platform: keyof typeof PLATFORM_DEFAULTS): ImageSize {
  const sizeKey = PLATFORM_DEFAULTS[platform]
  return SOCIAL_MEDIA_SIZES[sizeKey]
}

// Get all sizes for a platform
export function getAllSizesForPlatform(platform: string): ImageSize[] {
  const upperPlatform = platform.toUpperCase()
  return Object.entries(SOCIAL_MEDIA_SIZES)
    .filter(([key]) => key.startsWith(upperPlatform))
    .map(([_, size]) => size)
}