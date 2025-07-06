
import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';

interface OptimizedImage {
  original: string;
  medium: string;
  small: string;
  thumbnail: string;
  webp: {
    original: string;
    medium: string;
    small: string;
    thumbnail: string;
  };
  metadata: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    format: string;
    dimensions: {
      width: number;
      height: number;
    };
  };
}

interface ProcessedImages {
  banner?: OptimizedImage;
  postcard?: OptimizedImage;
}

interface ProcessingProgress {
  current: number;
  total: number;
  stage: string;
}

export const useImageUpload = () => {
  const [uploadedImages, setUploadedImages] = useState<ProcessedImages>({});
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress>({ current: 0, total: 0, stage: '' });

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  // Helper function to get image dimensions
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // Enhanced image processing with multiple sizes and WebP conversion
  const processImageWithSizes = async (file: File, imageType: 'banner' | 'postcard'): Promise<OptimizedImage> => {
    const originalSize = file.size;
    const dimensions = await getImageDimensions(file);
    
    // Size configurations for different image types
    const maxWidths = {
      banner: { original: 1200, medium: 800, small: 400, thumbnail: 200 },
      postcard: { original: 600, medium: 400, small: 300, thumbnail: 150 }
    };
    
    const config = maxWidths[imageType];
    
    setProcessingProgress(prev => ({ ...prev, stage: `Processing ${imageType} sizes` }));
    
    // Generate JPEG versions
    const jpegVersions = await Promise.all([
      // Original optimized
      imageCompression(file, {
        maxWidthOrHeight: config.original,
        initialQuality: 0.92,
        fileType: 'image/jpeg',
        useWebWorker: true
      }),
      // Medium
      imageCompression(file, {
        maxWidthOrHeight: config.medium,
        initialQuality: 0.88,
        fileType: 'image/jpeg',
        useWebWorker: true
      }),
      // Small
      imageCompression(file, {
        maxWidthOrHeight: config.small,
        initialQuality: 0.85,
        fileType: 'image/jpeg',
        useWebWorker: true
      }),
      // Thumbnail
      imageCompression(file, {
        maxWidthOrHeight: config.thumbnail,
        initialQuality: 0.8,
        fileType: 'image/jpeg',
        useWebWorker: true
      })
    ]);
    
    setProcessingProgress(prev => ({ ...prev, stage: `Converting ${imageType} to WebP` }));
    
    // Generate WebP versions (better compression)
    const webpVersions = await Promise.all([
      // Original WebP
      imageCompression(file, {
        maxWidthOrHeight: config.original,
        initialQuality: 0.92,
        fileType: 'image/webp',
        useWebWorker: true
      }),
      // Medium WebP
      imageCompression(file, {
        maxWidthOrHeight: config.medium,
        initialQuality: 0.88,
        fileType: 'image/webp',
        useWebWorker: true
      }),
      // Small WebP
      imageCompression(file, {
        maxWidthOrHeight: config.small,
        initialQuality: 0.85,
        fileType: 'image/webp',
        useWebWorker: true
      }),
      // Thumbnail WebP
      imageCompression(file, {
        maxWidthOrHeight: config.thumbnail,
        initialQuality: 0.82,
        fileType: 'image/webp',
        useWebWorker: true
      })
    ]);
    
    setProcessingProgress(prev => ({ ...prev, stage: `Finalizing ${imageType}` }));
    
    // Convert to base64
    const [jpegBase64, webpBase64] = await Promise.all([
      Promise.all(jpegVersions.map(fileToBase64)),
      Promise.all(webpVersions.map(fileToBase64))
    ]);
    
    const compressedSize = jpegVersions[0].size; // Use original optimized size
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
    
    return {
      original: jpegBase64[0],
      medium: jpegBase64[1],
      small: jpegBase64[2],
      thumbnail: jpegBase64[3],
      webp: {
        original: webpBase64[0],
        medium: webpBase64[1],
        small: webpBase64[2],
        thumbnail: webpBase64[3]
      },
      metadata: {
        originalSize,
        compressedSize,
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        format: file.type,
        dimensions
      }
    };
  };

  const handleImageUpload = useCallback(async (files: FileList, imageType: 'banner' | 'postcard' = 'banner') => {
    if (!files.length) return;

    setIsProcessingImage(true);
    setProcessingProgress({ current: 0, total: files.length, stage: 'Starting...' });
    console.log(`Processing ${imageType} upload:`, files.length, "files");

    try {
      const file = files[0]; // Process only the first file for the specified type
      
      setProcessingProgress({ current: 1, total: 1, stage: `Processing ${imageType}...` });
      
      const optimizedImage = await processImageWithSizes(file, imageType);
      
      setUploadedImages(prev => ({
        ...prev,
        [imageType]: optimizedImage
      }));
      
      console.log(`Successfully processed ${imageType}:`, {
        originalSize: `${(optimizedImage.metadata.originalSize / 1024 / 1024).toFixed(2)}MB`,
        compressedSize: `${(optimizedImage.metadata.compressedSize / 1024 / 1024).toFixed(2)}MB`,
        compressionRatio: `${optimizedImage.metadata.compressionRatio}%`,
        dimensions: optimizedImage.metadata.dimensions
      });
    } catch (error) {
      console.error(`Error in ${imageType} upload process:`, error);
    } finally {
      setIsProcessingImage(false);
      setProcessingProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  const removeImage = useCallback((imageType: 'banner' | 'postcard') => {
    setUploadedImages(prev => {
      const newImages = { ...prev };
      delete newImages[imageType];
      return newImages;
    });
    console.log(`Removed ${imageType} image`);
  }, []);

  return {
    uploadedImages,
    setUploadedImages,
    isProcessingImage,
    processingProgress,
    handleImageUpload,
    removeImage
  };
};
