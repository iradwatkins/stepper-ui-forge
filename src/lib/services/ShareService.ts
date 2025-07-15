import { EventWithStats } from '@/types/database';

export interface ShareData {
  title: string;
  text: string;
  url: string;
  files?: File[];
}

export interface ShareOptions {
  includeImage?: boolean;
  customMessage?: string;
  platform?: 'facebook' | 'twitter' | 'linkedin' | 'instagram' | 'generic';
}

export class ShareService {
  private static readonly BRAND_MESSAGE = "All things Stepping. Come to stepperslife.com to buy tickets";
  
  /**
   * Generate rich share data for an event
   */
  static async generateShareData(
    event: EventWithStats, 
    currentUrl: string,
    options: ShareOptions = {}
  ): Promise<ShareData> {
    const { 
      includeImage = true, 
      customMessage = this.BRAND_MESSAGE, 
      platform = 'generic' 
    } = options;

    // Create enhanced title with branding
    const title = `${event.title} - All things Stepping`;
    
    // Generate platform-specific text
    const text = this.generateShareText(event, customMessage, platform);
    
    const shareData: ShareData = {
      title,
      text,
      url: currentUrl
    };

    // Add image if available and requested
    if (includeImage && event.images) {
      const imageFile = await this.prepareEventImage(event);
      if (imageFile) {
        shareData.files = [imageFile];
      }
    }

    return shareData;
  }

  /**
   * Generate platform-specific share text
   */
  private static generateShareText(
    event: EventWithStats, 
    customMessage: string, 
    platform: string
  ): string {
    const baseText = `${event.title}`;
    const eventDate = new Date(event.date).toLocaleDateString();
    const location = event.location;
    
    switch (platform) {
      case 'twitter':
        // Twitter has character limits, keep it concise
        return `🎉 ${baseText}\n📅 ${eventDate}\n📍 ${location}\n\n${customMessage}`;
      
      case 'facebook':
      case 'linkedin':
        // Longer format for platforms that support it
        return `Join us for ${baseText}!\n\nWhen: ${eventDate}\nWhere: ${location}\n\n${event.description ? event.description.substring(0, 200) + '...' : ''}\n\n${customMessage}`;
      
      case 'instagram':
        // Instagram-style with emojis
        return `🎵 ${baseText} 🎵\n📅 ${eventDate}\n📍 ${location}\n\n${customMessage}\n\n#stepping #stepperslife #events`;
      
      default:
        return `Check out this event: ${baseText}\n\n${customMessage}`;
    }
  }

  /**
   * Convert event image to File object for sharing
   */
  private static async prepareEventImage(event: EventWithStats): Promise<File | null> {
    try {
      // Get the best image for sharing (prefer banner or postcard)
      const imageData = this.getBestShareImage(event.images);
      if (!imageData) return null;

      // Fetch the image
      const response = await fetch(imageData.url);
      if (!response.ok) return null;

      const blob = await response.blob();
      
      // Create File object with appropriate name
      const filename = imageData.filename || `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_share.jpg`;
      return new File([blob], filename, { type: blob.type });
    } catch (error) {
      console.error('Error preparing event image for sharing:', error);
      return null;
    }
  }

  /**
   * Select the best image for social media sharing
   */
  private static getBestShareImage(images: Record<string, any>): any | null {
    // Priority order: banner, postcard, main, first available
    const priorities = ['banner', 'postcard', 'main'];
    
    for (const key of priorities) {
      if (images[key]) {
        return images[key];
      }
    }
    
    // Return first available image
    const imageKeys = Object.keys(images);
    return imageKeys.length > 0 ? images[imageKeys[0]] : null;
  }

  /**
   * Execute share using Web Share API or fallback methods
   */
  static async shareEvent(
    event: EventWithStats, 
    currentUrl: string, 
    options: ShareOptions = {}
  ): Promise<boolean> {
    try {
      const shareData = await this.generateShareData(event, currentUrl, options);
      
      // Try Web Share API first (supports files on mobile)
      if (navigator.share) {
        // Check if files are supported
        if (shareData.files && shareData.files.length > 0) {
          if (navigator.canShare && navigator.canShare({ files: shareData.files })) {
            await navigator.share(shareData);
            return true;
          }
        }
        
        // Fall back to share without files
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url: shareData.url
        });
        return true;
      }

      // Fallback to platform-specific sharing
      return this.fallbackShare(shareData, options.platform);
    } catch (error) {
      console.error('Error sharing event:', error);
      return false;
    }
  }

  /**
   * Fallback sharing methods for platforms without Web Share API
   */
  private static fallbackShare(shareData: ShareData, platform?: string): boolean {
    try {
      const encodedUrl = encodeURIComponent(shareData.url);
      const encodedText = encodeURIComponent(shareData.text);
      const encodedTitle = encodeURIComponent(shareData.title);

      let shareUrl: string;

      switch (platform) {
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
          break;
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
          break;
        case 'linkedin':
          shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedText}`;
          break;
        default:
          // Copy to clipboard as fallback
          return this.copyToClipboard(shareData);
      }

      // Open sharing window
      window.open(shareUrl, '_blank', 'width=600,height=400');
      return true;
    } catch (error) {
      console.error('Error in fallback share:', error);
      return this.copyToClipboard(shareData);
    }
  }

  /**
   * Copy share data to clipboard
   */
  private static async copyToClipboard(shareData: ShareData): Promise<boolean> {
    try {
      const textToCopy = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;
      await navigator.clipboard.writeText(textToCopy);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }

  /**
   * Generate Open Graph meta tags for an event
   */
  static generateMetaTags(event: EventWithStats, currentUrl: string) {
    const imageData = this.getBestShareImage(event.images);
    const imageUrl = imageData?.url;
    
    return {
      'og:title': `${event.title} - All things Stepping`,
      'og:description': event.description || `Join us for ${event.title}. ${this.BRAND_MESSAGE}`,
      'og:url': currentUrl,
      'og:type': 'event',
      'og:image': imageUrl,
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:site_name': 'Steppers Life',
      
      'twitter:card': 'summary_large_image',
      'twitter:title': `${event.title} - All things Stepping`,
      'twitter:description': event.description || `Join us for ${event.title}. ${this.BRAND_MESSAGE}`,
      'twitter:image': imageUrl,
      'twitter:site': '@stepperslife',
      
      'event:start_time': event.date,
      'event:location': event.location,
      'event:organizer': event.organization_name || 'Steppers Life'
    };
  }
}