import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { isEventPast7Days, isEventPast } from '@/lib/utils/eventDateUtils';

interface LazyEventImageProps {
  eventDate: string;
  imageUrl?: string;
  alt: string;
  className?: string;
  isOrganizer?: boolean;
  showPlaceholder?: boolean;
  priority?: boolean; // For above-the-fold images
}

export const LazyEventImage = ({ 
  eventDate, 
  imageUrl, 
  alt, 
  className, 
  isOrganizer = false,
  showPlaceholder = true,
  priority = false
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

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {/* Blur placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {/* Load image only when in view */}
      {isInView && (
        <img
          src={imageUrl}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            isPastEvent && !isOrganizer ? "opacity-75" : "",
            className
          )}
          loading={priority ? "eager" : "lazy"}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
        />
      )}
      
      {/* Past event indicator */}
      {isPastEvent && !isOrganizer && isLoaded && (
        <div className="absolute top-2 right-2 bg-yellow-500/90 text-yellow-900 px-3 py-1 rounded-full text-xs font-medium">
          Past Event
        </div>
      )}
    </div>
  );
};