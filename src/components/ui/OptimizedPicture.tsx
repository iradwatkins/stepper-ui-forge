import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ImageSource {
  avif?: string;
  webp?: string;
  jpeg?: string;
  fallback: string;
}

interface OptimizedPictureProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  sources: ImageSource;
  alt: string;
  priority?: boolean;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  showBlurPlaceholder?: boolean;
  blurDataUrl?: string;
}

export const OptimizedPicture = ({
  sources,
  alt,
  className,
  priority = false,
  onLoadStart,
  onLoadComplete,
  showBlurPlaceholder = true,
  blurDataUrl,
  loading,
  ...imgProps
}: OptimizedPictureProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const pictureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || !pictureRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (onLoadStart) onLoadStart();
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.01
      }
    );

    observer.observe(pictureRef.current);

    return () => {
      observer.disconnect();
    };
  }, [priority, onLoadStart]);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoadComplete) onLoadComplete();
  };

  // If not in view and not priority, show placeholder
  if (!isInView && !priority) {
    return (
      <div 
        ref={pictureRef} 
        className={cn("bg-muted", className)}
        style={{
          backgroundImage: showBlurPlaceholder && blurDataUrl ? `url(${blurDataUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
    );
  }

  return (
    <div ref={pictureRef} className="relative">
      {/* Blur placeholder while loading */}
      {!isLoaded && showBlurPlaceholder && (
        <div 
          className={cn(
            "absolute inset-0 animate-pulse",
            blurDataUrl ? "" : "bg-muted"
          )}
          style={{
            backgroundImage: blurDataUrl ? `url(${blurDataUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}
      
      <picture>
        {/* AVIF source - best compression */}
        {sources.avif && (
          <source
            srcSet={sources.avif}
            type="image/avif"
          />
        )}
        
        {/* WebP source - good compression, wide support */}
        {sources.webp && (
          <source
            srcSet={sources.webp}
            type="image/webp"
          />
        )}
        
        {/* JPEG/PNG fallback */}
        <img
          src={sources.fallback}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          loading={priority ? "eager" : loading || "lazy"}
          fetchPriority={priority ? "high" : undefined}
          onLoad={handleLoad}
          {...imgProps}
        />
      </picture>
    </div>
  );
};

// Helper component for responsive images with srcset
interface ResponsiveOptimizedPictureProps extends OptimizedPictureProps {
  srcSet?: {
    avif?: string;
    webp?: string;
    jpeg?: string;
  };
  sizes?: string;
}

export const ResponsiveOptimizedPicture = ({
  srcSet,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  ...props
}: ResponsiveOptimizedPictureProps) => {
  return (
    <OptimizedPicture
      {...props}
      sizes={sizes}
    />
  );
};