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
  url?: string; // Legacy support
}

interface EventImages {
  banner?: OptimizedImage;
  postcard?: OptimizedImage;
  hero?: string; // Legacy support
}

export type ImageSize = 'thumbnail' | 'small' | 'medium' | 'original';

/**
 * Get the appropriate image URL for an event based on the requested size
 * Provides intelligent fallbacks if the requested size is not available
 */
export function getEventImageUrl(
  event: EventWithStats | null | undefined,
  size: ImageSize = 'thumbnail',
  preferPostcard: boolean = false
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
    
    // New optimized format with size variations
    switch (size) {
      case 'thumbnail':
        return img.thumbnail || img.small || img.medium || img.original || img.url || null;
      case 'small':
        return img.small || img.thumbnail || img.medium || img.original || img.url || null;
      case 'medium':
        return img.medium || img.small || img.original || img.thumbnail || img.url || null;
      case 'original':
        return img.original || img.medium || img.small || img.thumbnail || img.url || null;
      default:
        return img.thumbnail || img.small || img.medium || img.original || img.url || null;
    }
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