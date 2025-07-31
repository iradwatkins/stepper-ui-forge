import { useEffect } from 'react';
import { EventWithStats } from '@/types/database';

interface EventPageHeadProps {
  events: EventWithStats[];
  featuredEvent?: EventWithStats | null;
}

export function EventPageHead({ events, featuredEvent }: EventPageHeadProps) {
  useEffect(() => {
    // Clean up any existing preload links first
    const existingPreloads = document.querySelectorAll('link[rel="preload"][as="image"]');
    existingPreloads.forEach(link => link.remove());

    const preloadLinks: string[] = [];
    
    // Preload featured event image if available (highest priority)
    if (featuredEvent?.images) {
      const images = featuredEvent.images as any;
      if (images.banner?.avif?.original) {
        preloadLinks.push(images.banner.avif.original);
      } else if (images.banner?.webp?.original) {
        preloadLinks.push(images.banner.webp.original);
      } else if (images.banner?.original) {
        preloadLinks.push(images.banner.original);
      }
    }
    
    // Preload first 3 event images (medium size for cards)
    const firstThreeEvents = events.slice(0, 3);
    firstThreeEvents.forEach(event => {
      if (event.images) {
        const images = event.images as any;
        if (images.banner?.avif?.medium) {
          preloadLinks.push(images.banner.avif.medium);
        } else if (images.banner?.webp?.medium) {
          preloadLinks.push(images.banner.webp.medium);
        } else if (images.banner?.medium) {
          preloadLinks.push(images.banner.medium);
        }
      }
    });
    
    // Add preload links to head
    preloadLinks.forEach((url, index) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      
      // Determine image type for proper preloading
      if (url.includes('.avif')) {
        link.type = 'image/avif';
      } else if (url.includes('.webp')) {
        link.type = 'image/webp';
      }
      
      // Set fetchpriority for first image (featured)
      if (index === 0) {
        link.setAttribute('fetchpriority', 'high');
      }
      
      document.head.appendChild(link);
    });
    
    // Cleanup function
    return () => {
      const preloads = document.querySelectorAll('link[rel="preload"][as="image"]');
      preloads.forEach(link => link.remove());
    };
  }, [events, featuredEvent]);
  
  return null;
}