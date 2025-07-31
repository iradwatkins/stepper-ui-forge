import { useEffect, useRef } from 'react';

interface ImagePerformanceMetrics {
  format: string;
  size: number;
  loadTime: number;
  dimensions: { width: number; height: number };
  wasCached: boolean;
}

/**
 * Hook to monitor image loading performance and format usage
 */
export function useImagePerformance(imageRef: React.RefObject<HTMLImageElement>) {
  const startTime = useRef<number>(0);
  
  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;
    
    const handleLoadStart = () => {
      startTime.current = performance.now();
    };
    
    const handleLoad = () => {
      if (!startTime.current) return;
      
      const loadTime = performance.now() - startTime.current;
      const wasCached = loadTime < 10; // If load time is very short, it was likely cached
      
      // Get actual loaded format from the currentSrc
      let format = 'unknown';
      const src = img.currentSrc || img.src;
      
      if (src.includes('.avif') || src.includes('format=avif')) {
        format = 'avif';
      } else if (src.includes('.webp') || src.includes('format=webp')) {
        format = 'webp';
      } else if (src.includes('.jpg') || src.includes('.jpeg') || src.includes('format=jpg')) {
        format = 'jpeg';
      } else if (src.includes('.png') || src.includes('format=png')) {
        format = 'png';
      }
      
      const metrics: ImagePerformanceMetrics = {
        format,
        size: 0, // Size would need to be fetched via network API
        loadTime,
        dimensions: {
          width: img.naturalWidth,
          height: img.naturalHeight
        },
        wasCached
      };
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Image Performance:', {
          src: src.substring(0, 50) + '...',
          ...metrics
        });
      }
      
      // Send to analytics service if available
      if (window.gtag) {
        window.gtag('event', 'image_load', {
          event_category: 'performance',
          event_label: format,
          value: Math.round(loadTime),
          custom_dimensions: {
            image_format: format,
            was_cached: wasCached,
            width: img.naturalWidth,
            height: img.naturalHeight
          }
        });
      }
    };
    
    // Attach listeners
    img.addEventListener('loadstart', handleLoadStart);
    img.addEventListener('load', handleLoad);
    
    // If image is already loaded
    if (img.complete && img.naturalWidth > 0) {
      handleLoad();
    }
    
    return () => {
      img.removeEventListener('loadstart', handleLoadStart);
      img.removeEventListener('load', handleLoad);
    };
  }, [imageRef]);
}

/**
 * Global performance monitoring for all images
 */
export function initializeImagePerformanceMonitoring() {
  if (typeof window === 'undefined') return;
  
  // Use PerformanceObserver to monitor all image loads
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource' && 
            entry.name.match(/\.(jpg|jpeg|png|webp|avif|gif)(\?|$)/i)) {
          
          const format = entry.name.match(/\.(\w+)(\?|$)/)?.[1] || 'unknown';
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Image Resource Timing:', {
              url: entry.name,
              format,
              duration: entry.duration,
              transferSize: (entry as any).transferSize || 0,
              encodedBodySize: (entry as any).encodedBodySize || 0,
              decodedBodySize: (entry as any).decodedBodySize || 0,
            });
          }
        }
      }
    });
    
    observer.observe({ type: 'resource', buffered: true });
  }
}