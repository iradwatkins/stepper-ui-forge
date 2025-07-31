# Image Optimization Guide

## Overview

This application implements a comprehensive image optimization strategy that includes:

- **Modern Format Support**: AVIF → WebP → JPEG fallback chain
- **Responsive Images**: Multiple sizes (200w, 400w, 800w, 1200w)
- **Build-time Optimization**: Vite-imagetools for static images
- **Runtime Optimization**: Browser-image-compression for user uploads
- **Performance Monitoring**: Tracks format usage and load times

## Features

### 1. Multiple Image Formats

- **AVIF**: Best compression (20-50% smaller than WebP)
- **WebP**: Good compression with wide support
- **JPEG**: Universal fallback

### 2. Responsive Sizes

Each image is generated in 4 sizes:
- **Thumbnail**: 200px width
- **Small**: 400px width
- **Medium**: 800px width
- **Original**: 1200px width (max)

### 3. Build-time Optimization

```typescript
// vite.config.ts
imagetools({
  defaultDirectives: (id) => {
    if (id.includes('/src/')) {
      return new URLSearchParams({
        format: 'avif;webp;jpg',
        quality: '85',
        w: '200;400;800;1200',
        as: 'picture'
      });
    }
  }
});
```

### 4. Runtime Compression

The `useImageUpload` hook handles user uploads:

```typescript
const { uploadedImages, handleImageUpload } = useImageUpload();

// Upload and optimize
await handleImageUpload(files, 'banner');
```

## Usage

### Basic Optimized Image

```tsx
import { OptimizedImage } from '@/components/ui/OptimizedImage';

<OptimizedImage
  src="/path/to/image.jpg"
  alt="Description"
  sizes="(max-width: 640px) 100vw, 50vw"
  imageData={optimizedImageData}
/>
```

### Event Images

```tsx
import { EventImageOptimized } from '@/components/ui/EventImageOptimized';

<EventImageOptimized
  event={event}
  size="thumbnail"
  className="w-full h-48 object-cover"
/>
```

### Upload with Optimization

```tsx
const { uploadedImages, handleImageUpload, isProcessingImage } = useImageUpload();

const onDrop = useCallback((acceptedFiles: File[]) => {
  handleImageUpload(acceptedFiles, 'banner');
}, [handleImageUpload]);
```

## Performance Monitoring

The system tracks:
- Image format actually loaded
- Load time
- Cache status
- Dimensions

```typescript
import { useImagePerformance } from '@/hooks/useImagePerformance';

const imageRef = useRef<HTMLImageElement>(null);
useImagePerformance(imageRef);
```

## Browser Support

- **AVIF**: Chrome 85+, Firefox 93+, Safari 16+
- **WebP**: Chrome 23+, Firefox 65+, Safari 14.1+
- **JPEG**: Universal support

The system automatically detects browser capabilities and serves the best supported format.

## File Size Comparison

Typical compression rates for a 1200x800 photo:
- **JPEG**: 200-300 KB
- **WebP**: 150-200 KB (25-35% smaller)
- **AVIF**: 100-150 KB (50-65% smaller)

## Configuration

### Allowed Formats

Update in `fileValidation.ts`:
```typescript
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
];
```

### Quality Settings

Adjust in `useImageUpload.ts`:
```typescript
// JPEG
initialQuality: 0.92, // Original
initialQuality: 0.85, // Small

// WebP
initialQuality: 0.92, // Original
initialQuality: 0.82, // Thumbnail

// AVIF
initialQuality: 0.90, // Original
initialQuality: 0.80, // Thumbnail
```

## Best Practices

1. **Use appropriate sizes**: Don't load original size for thumbnails
2. **Set proper sizes attribute**: Help browser select the right image
3. **Lazy load below the fold**: Use `loading="lazy"`
4. **Monitor performance**: Check console logs in development
5. **Test on slow connections**: Ensure images load progressively

## Troubleshooting

### AVIF not working
- Check browser support with `supportsAvif()`
- Ensure server serves correct MIME type: `image/avif`
- Verify file has `.avif` extension

### Images loading slowly
- Check if correct size variant is being loaded
- Verify CDN/caching headers are set
- Use performance monitoring to identify issues

### Build errors with vite-imagetools
- Ensure sharp is installed: `npm install sharp`
- Check Node.js version (14.18+ required)
- Clear cache: `rm -rf node_modules/.vite`