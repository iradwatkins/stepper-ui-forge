import { EventWithStats } from '@/types/database';

interface OptimizedImage {
  original?: string;
  medium?: string;
  small?: string;
  thumbnail?: string;
  webp?: {
    original?: string;
    medium?: string;
    small?: string;
    thumbnail?: string;
  };
  avif?: {
    original?: string;
    medium?: string;
    small?: string;
    thumbnail?: string;
  };
  url?: string; // Legacy support
}

interface EventImages {
  banner?: OptimizedImage;
  postcard?: OptimizedImage;
  hero?: string; // Legacy support
}

export type ImageSize = 'thumbnail' | 'small' | 'medium' | 'original';
export type ImageFormat = 'avif' | 'webp' | 'jpeg';

/**
 * Check if browser supports AVIF format
 */
function supportsAvif(): boolean {
  if (typeof window === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  return canvas.toDataURL('image/avif').indexOf('image/avif') === 5;
}

/**
 * Check if browser supports WebP format
 */
function supportsWebp(): boolean {
  if (typeof window === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
}

/**
 * Get the best supported image format for the current browser
 */
export function getBestImageFormat(): ImageFormat {
  if (supportsAvif()) return 'avif';
  if (supportsWebp()) return 'webp';
  return 'jpeg';
}

/**
 * Get the appropriate image URL for an event based on the requested size
 * Provides intelligent fallbacks if the requested size is not available
 * Prioritizes modern formats (AVIF > WebP > JPEG) when available
 */
export function getEventImageUrl(
  event: EventWithStats | null | undefined,
  size: ImageSize = 'thumbnail',
  preferPostcard: boolean = false,
  format?: ImageFormat
): string | null {
  if (!event?.images) return null;
  
  const images = event.images;
  
  // Debug logging for production issues
  if (typeof window !== 'undefined' && window.location.hostname === 'stepperslife.com') {
    console.log('getEventImageUrl called with:', { eventTitle: event.title, size, images });
  }
  
  // Handle if images is a string (single URL)
  if (typeof images === 'string') {
    return images;
  }
  
  // Handle if images is an array (legacy format)
  if (Array.isArray(images) && images.length > 0) {
    return images[0];
  }
  
  // Cast to expected structure
  const typedImages = images as EventImages;
  
  // Determine which image to use (banner or postcard)
  const primaryImage = preferPostcard ? typedImages.postcard : typedImages.banner;
  const fallbackImage = preferPostcard ? typedImages.banner : typedImages.postcard;
  
  // Get the URL for the requested size with fallbacks
  const getImageBySize = (img: OptimizedImage | undefined | string): string | null => {
    if (!img) return null;
    
    // If img is already a string URL, return it
    if (typeof img === 'string') {
      return img;
    }
    
    // Check if it's an object with direct URL property (legacy format)
    if (img.url && typeof img.url === 'string') {
      return img.url;
    }
    
    // Get the best format available
    const bestFormat = getBestImageFormat();
    
    // Helper to get URL by size from a format object
    const getUrlBySize = (formatObj: any, size: ImageSize): string | null => {
      if (!formatObj) return null;
      switch (size) {
        case 'thumbnail':
          return formatObj.thumbnail || formatObj.small || formatObj.medium || formatObj.original || null;
        case 'small':
          return formatObj.small || formatObj.thumbnail || formatObj.medium || formatObj.original || null;
        case 'medium':
          return formatObj.medium || formatObj.small || formatObj.original || formatObj.thumbnail || null;
        case 'original':
          return formatObj.original || formatObj.medium || formatObj.small || formatObj.thumbnail || null;
        default:
          return formatObj.thumbnail || formatObj.small || formatObj.medium || formatObj.original || null;
      }
    };
    
    // Try to get the URL in order of best format preference
    if (bestFormat === 'avif' && img.avif) {
      const avifUrl = getUrlBySize(img.avif, size);
      if (avifUrl) return avifUrl;
    }
    
    if ((bestFormat === 'webp' || bestFormat === 'avif') && img.webp) {
      const webpUrl = getUrlBySize(img.webp, size);
      if (webpUrl) return webpUrl;
    }
    
    // Fall back to JPEG
    return getUrlBySize(img, size) || img.url || null;
  };
  
  // Try primary image first, then fallback
  const primaryUrl = getImageBySize(primaryImage);
  if (primaryUrl) return primaryUrl;
  
  const fallbackUrl = getImageBySize(fallbackImage);
  if (fallbackUrl) return fallbackUrl;
  
  // Legacy support for old hero property
  if (images.hero) return images.hero;
  
  return null;
}

/**
 * Get all available images for an event (used in galleries)
 */
export function getAllEventImages(event: EventWithStats | null | undefined): string[] {
  if (!event?.images) return [];
  
  const images = event.images as EventImages;
  const imageUrls: string[] = [];
  
  // Add banner images (prefer original quality for galleries)
  if (images.banner) {
    const bannerUrl = images.banner.original || images.banner.medium || 
                     images.banner.small || images.banner.thumbnail || images.banner.url;
    if (bannerUrl) imageUrls.push(bannerUrl);
  }
  
  // Add postcard images
  if (images.postcard) {
    const postcardUrl = images.postcard.original || images.postcard.medium || 
                       images.postcard.small || images.postcard.thumbnail || images.postcard.url;
    if (postcardUrl) imageUrls.push(postcardUrl);
  }
  
  // Legacy hero support
  if (images.hero && !imageUrls.includes(images.hero)) {
    imageUrls.push(images.hero);
  }
  
  return imageUrls;
}

/**
 * Check if an event has any images
 */
export function hasEventImages(event: EventWithStats | null | undefined): boolean {
  if (!event?.images) return false;
  
  const images = event.images as EventImages;
  return !!(images.banner || images.postcard || images.hero);
}