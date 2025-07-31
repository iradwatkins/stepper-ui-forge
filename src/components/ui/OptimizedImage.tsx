import React from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  imageData?: {
    avif?: {
      thumbnail?: string;
      small?: string;
      medium?: string;
      original?: string;
    };
    webp?: {
      thumbnail?: string;
      small?: string;
      medium?: string;
      original?: string;
    };
    thumbnail?: string;
    small?: string;
    medium?: string;
    original?: string;
  };
}

/**
 * Optimized image component that provides responsive images with modern format fallbacks
 * Supports AVIF → WebP → JPEG fallback chain
 */
export function OptimizedImage({ 
  src, 
  alt, 
  sizes = '100vw',
  className,
  imageData,
  loading = 'lazy',
  ...props 
}: OptimizedImageProps) {
  // If no imageData provided, render simple img tag
  if (!imageData) {
    return (
      <img 
        src={src} 
        alt={alt} 
        className={cn('w-full h-auto', className)}
        loading={loading}
        {...props}
      />
    );
  }

  // Build srcset for each format
  const buildSrcSet = (formatData: any): string => {
    const srcsetParts: string[] = [];
    
    if (formatData.thumbnail) srcsetParts.push(`${formatData.thumbnail} 200w`);
    if (formatData.small) srcsetParts.push(`${formatData.small} 400w`);
    if (formatData.medium) srcsetParts.push(`${formatData.medium} 800w`);
    if (formatData.original) srcsetParts.push(`${formatData.original} 1200w`);
    
    return srcsetParts.join(', ');
  };

  // Build JPEG srcset
  const jpegSrcSet = buildSrcSet(imageData);
  
  return (
    <picture className={cn('block', className)}>
      {/* AVIF source */}
      {imageData.avif && (
        <source
          type="image/avif"
          srcSet={buildSrcSet(imageData.avif)}
          sizes={sizes}
        />
      )}
      
      {/* WebP source */}
      {imageData.webp && (
        <source
          type="image/webp"
          srcSet={buildSrcSet(imageData.webp)}
          sizes={sizes}
        />
      )}
      
      {/* Fallback JPEG img tag */}
      <img
        src={src}
        alt={alt}
        srcSet={jpegSrcSet}
        sizes={sizes}
        className={cn('w-full h-auto', className)}
        loading={loading}
        {...props}
      />
    </picture>
  );
}