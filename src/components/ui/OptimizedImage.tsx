import { ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  priority?: boolean;
}

export function OptimizedImage({ 
  src, 
  alt, 
  className, 
  fallbackSrc = '/placeholder.svg',
  priority = false,
  ...props 
}: OptimizedImageProps) {
  // For external URLs, use them directly
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn('object-cover', className)}
        loading={priority ? 'eager' : 'lazy'}
        onError={(e) => {
          if (fallbackSrc) {
            (e.target as HTMLImageElement).src = fallbackSrc;
          }
        }}
        {...props}
      />
    );
  }

  // For local images, use optimized versions
  // Note: With vite-imagetools, you can import images with query params
  // Example: import optimizedImage from './image.jpg?w=800&format=webp'
  return (
    <picture>
      <source
        srcSet={`${src}?w=320&format=webp 320w,
                ${src}?w=640&format=webp 640w,
                ${src}?w=1280&format=webp 1280w,
                ${src}?w=1920&format=webp 1920w`}
        type="image/webp"
      />
      <img
        src={src}
        alt={alt}
        className={cn('object-cover', className)}
        loading={priority ? 'eager' : 'lazy'}
        onError={(e) => {
          if (fallbackSrc) {
            (e.target as HTMLImageElement).src = fallbackSrc;
          }
        }}
        {...props}
      />
    </picture>
  );
}