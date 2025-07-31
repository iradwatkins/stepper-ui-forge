import { EventWithStats } from '@/types/database';

// Generate a low-quality image placeholder (LQIP) data URL
export function generateBlurDataUrl(width: number = 10, height: number = 10): string {
  // Simple gray placeholder - in production, this would be generated from the actual image
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);
  }
  return canvas.toDataURL('image/jpeg', 0.1);
}

// Preload critical images for better performance
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
}

// Preload critical images on the events page
export async function preloadCriticalEventImages(events: EventWithStats[], count: number = 4) {
  const imageUrls: string[] = [];
  
  for (let i = 0; i < Math.min(count, events.length); i++) {
    const event = events[i];
    if (event.images) {
      // Try to get the medium size image which is likely to be used
      const images = event.images as any;
      if (images.banner?.medium) {
        imageUrls.push(images.banner.medium);
      } else if (images.postcard?.medium) {
        imageUrls.push(images.postcard.medium);
      } else if (images.banner?.url) {
        imageUrls.push(images.banner.url);
      }
    }
  }
  
  // Preload all critical images in parallel
  await Promise.allSettled(imageUrls.map(url => preloadImage(url)));
}

// Generate srcset for responsive images
export function generateSrcSet(
  baseUrl: string,
  sizes: number[] = [320, 640, 960, 1280, 1920]
): string {
  // In a real implementation, this would generate URLs with size parameters
  // For now, we'll return the base URL
  return sizes.map(size => `${baseUrl} ${size}w`).join(', ');
}

// Get optimal image sizes based on viewport
export function getOptimalImageSizes(): string {
  return `
    (max-width: 640px) 100vw,
    (max-width: 768px) 50vw,
    (max-width: 1024px) 33vw,
    25vw
  `.trim();
}

// Performance monitoring for image loading
export function measureImageLoadTime(imageName: string): {
  start: () => void;
  end: () => void;
} {
  let startTime: number;
  
  return {
    start: () => {
      startTime = performance.now();
    },
    end: () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Image "${imageName}" loaded in ${loadTime.toFixed(2)}ms`);
      }
      
      // In production, you might send this to an analytics service
      if (window.gtag) {
        window.gtag('event', 'timing_complete', {
          name: 'image_load',
          value: Math.round(loadTime),
          event_label: imageName,
        });
      }
    }
  };
}