import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { isEventPast7Days, isEventPast } from '@/lib/utils/eventDateUtils';
import { OptimizedPicture } from '@/components/ui/OptimizedPicture';
import { getEventImageUrl } from '@/lib/utils/imageUtils';

interface LazyEventImageProps {
  eventDate: string;
  imageUrl?: string;
  alt: string;
  className?: string;
  isOrganizer?: boolean;
  showPlaceholder?: boolean;
  priority?: boolean; // For above-the-fold images
  event?: any; // Event object for getting optimized URLs
  size?: 'thumbnail' | 'small' | 'medium' | 'original';
}

export const LazyEventImage = ({ 
  eventDate, 
  imageUrl, 
  alt, 
  className, 
  isOrganizer = false,
  showPlaceholder = true,
  priority = false,
  event,
  size = 'medium'
}: LazyEventImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Priority images load immediately
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  
  const shouldHideImage = isEventPast7Days(eventDate) && !isOrganizer;
  const isPastEvent = isEventPast(eventDate);

  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  if (shouldHideImage) {
    return (
      <div className={cn(
        "bg-muted flex items-center justify-center relative",
        className
      )}>
        <div className="text-center p-6">
          <div className="text-4xl mb-2 text-muted-foreground">📅</div>
          <p className="text-sm font-medium text-muted-foreground">Event has ended</p>
          <p className="text-xs text-muted-foreground mt-1">
            Images are no longer available
          </p>
        </div>
      </div>
    );
  }

  if (!imageUrl || error) {
    return showPlaceholder ? (
      <div className={cn(
        "bg-muted flex items-center justify-center",
        className
      )}>
        <span className="text-sm text-muted-foreground">No image</span>
      </div>
    ) : null;
  }

  // Try to get optimized image sources if event object is provided
  const getImageSources = () => {
    if (event && event.images) {
      const banner = event.images.banner || event.images.postcard;
      if (banner && typeof banner === 'object') {
        return {
          avif: banner.avif?.[size] || banner.avif?.medium,
          webp: banner.webp?.[size] || banner.webp?.medium,
          jpeg: banner[size] || banner.medium || imageUrl,
          fallback: imageUrl || banner.url || ''
        };
      }
    }
    return {
      avif: undefined,
      webp: undefined,
      jpeg: imageUrl,
      fallback: imageUrl || ''
    };
  };

  const imageSources = getImageSources();

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      <OptimizedPicture
        sources={imageSources}
        alt={alt}
        className={cn(
          isPastEvent && !isOrganizer ? "opacity-75" : "",
          className
        )}
        priority={priority}
        showBlurPlaceholder={!priority}
        onLoadStart={() => setIsInView(true)}
        onLoadComplete={() => setIsLoaded(true)}
      />
      
      {/* Past event indicator */}
      {isPastEvent && !isOrganizer && isLoaded && (
        <div className="absolute top-2 right-2 bg-yellow-500/90 text-yellow-900 px-3 py-1 rounded-full text-xs font-medium">
          Past Event
        </div>
      )}
    </div>
  );
};