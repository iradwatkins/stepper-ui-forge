import React from 'react';
import { OptimizedImage } from './OptimizedImage';
import { getEventImageUrl } from '@/lib/utils/imageUtils';
import { EventWithStats } from '@/types/database';

interface EventImageOptimizedProps {
  event: EventWithStats;
  size?: 'thumbnail' | 'small' | 'medium' | 'original';
  className?: string;
  preferPostcard?: boolean;
}

/**
 * Event-specific optimized image component that handles the event image data structure
 */
export function EventImageOptimized({ 
  event, 
  size = 'thumbnail',
  className,
  preferPostcard = false
}: EventImageOptimizedProps) {
  // Get the fallback URL
  const fallbackUrl = getEventImageUrl(event, size, preferPostcard);
  
  if (!fallbackUrl) {
    return (
      <div className={`bg-gray-200 ${className}`}>
        <span className="sr-only">No image available</span>
      </div>
    );
  }
  
  // Extract image data from event
  const images = event.images as any;
  const imageType = preferPostcard ? 'postcard' : 'banner';
  const imageData = images?.[imageType];
  
  // Determine responsive sizes based on use case
  const sizes = size === 'thumbnail' 
    ? '(max-width: 640px) 100vw, (max-width: 768px) 50vw, 200px'
    : size === 'small'
    ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px'
    : size === 'medium'
    ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px'
    : '100vw';
  
  return (
    <OptimizedImage
      src={fallbackUrl}
      alt={event.title}
      sizes={sizes}
      className={className}
      imageData={imageData}
    />
  );
}