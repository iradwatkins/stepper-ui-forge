import { supabase } from '@/integrations/supabase/client';
import { 
  validateFileUpload, 
  sanitizeFilename, 
  generateSecureFilename,
  ALLOWED_IMAGE_TYPES,
  FILE_SIZE_LIMITS 
} from '@/lib/utils/fileValidation';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface UploadOptions {
  bucket: 'venue-images' | 'seating-charts';
  folder?: string;
  filename?: string;
  maxSizeBytes?: number;
  allowedTypes?: string[];
  userId?: string;
}

export class ImageUploadService {
  private static instance: ImageUploadService;

  private constructor() {}

  static getInstance(): ImageUploadService {
    if (!ImageUploadService.instance) {
      ImageUploadService.instance = new ImageUploadService();
    }
    return ImageUploadService.instance;
  }

  /**
   * Upload an image file to Supabase Storage
   */
  async uploadImage(file: File, options: UploadOptions): Promise<UploadResult> {
    try {
      // Validate file using secure validation
      const validation = await validateFileUpload(file, {
        allowedTypes: options.allowedTypes || ALLOWED_IMAGE_TYPES,
        maxSize: options.maxSizeBytes || FILE_SIZE_LIMITS.image,
        maxWidth: 4000, // Reasonable max dimensions
        maxHeight: 4000
      });
      
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate file path
      const filePath = this.generateFilePath(file, options);
      
      console.log('Uploading to path:', filePath);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(options.bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Allow overwriting existing files
        });

      if (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(options.bucket)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
        path: filePath
      };

    } catch (error) {
      console.error('Image upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Upload venue floor plan image
   */
  async uploadVenueImage(
    file: File, 
    venueId: string, 
    userId?: string
  ): Promise<UploadResult> {
    const currentUser = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    return this.uploadImage(file, {
      bucket: 'venue-images',
      folder: `${currentUser}/venues/${venueId}`,
      filename: 'floor-plan',
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
      userId: currentUser
    });
  }

  /**
   * Upload seating chart image
   */
  async uploadSeatingChartImage(
    file: File,
    eventId: string,
    chartId: string,
    userId?: string
  ): Promise<UploadResult> {
    const currentUser = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    return this.uploadImage(file, {
      bucket: 'seating-charts',
      folder: `${currentUser}/events/${eventId}/charts/${chartId}`,
      filename: 'chart-image',
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
      userId: currentUser
    });
  }

  /**
   * Upload magazine image (content or featured)
   */
  async uploadMagazineImage(
    file: File,
    type: 'content' | 'featured' = 'content',
    userId?: string
  ): Promise<UploadResult> {
    const currentUser = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    return this.uploadImage(file, {
      bucket: 'venue-images',
      folder: `${currentUser}/magazine/${type}-images`,
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      userId: currentUser
    });
  }

  /**
   * Delete an image from storage
   */
  async deleteImage(bucket: string, path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Image deletion failed:', error);
      return false;
    }
  }

  /**
   * Validate file before upload
   */

  /**
   * Generate consistent and secure file path
   */
  private generateFilePath(file: File, options: UploadOptions): string {
    const userId = options.userId || 'anonymous';
    const secureFilename = generateSecureFilename(file.name, userId);
    
    if (options.folder) {
      // Sanitize folder path as well
      const sanitizedFolder = options.folder.replace(/\.{2,}/g, '_');
      return `${sanitizedFolder}/${secureFilename}`;
    }

    // Fallback path structure
    return `${userId}/${secureFilename}`;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot) : '';
  }

  /**
   * Get public URL for an existing file
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Check if file exists in storage
   */
  async fileExists(bucket: string, path: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path.substring(0, path.lastIndexOf('/')), {
          search: path.substring(path.lastIndexOf('/') + 1)
        });

      if (error) return false;
      return data && data.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Create a resized/optimized version of an image
   */
  async createOptimizedImage(
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.85
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(optimizedFile);
            } else {
              reject(new Error('Failed to optimize image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Upload with automatic optimization
   */
  async uploadOptimizedImage(
    file: File,
    options: UploadOptions,
    optimizeOptions?: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
    }
  ): Promise<UploadResult> {
    try {
      // Only optimize raster images
      if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        const optimizedFile = await this.createOptimizedImage(
          file,
          optimizeOptions?.maxWidth,
          optimizeOptions?.maxHeight,
          optimizeOptions?.quality
        );
        return this.uploadImage(optimizedFile, options);
      } else {
        // Upload SVG and other formats as-is
        return this.uploadImage(file, options);
      }
    } catch (error) {
      console.error('Failed to optimize image, uploading original:', error);
      return this.uploadImage(file, options);
    }
  }
}

export const imageUploadService = ImageUploadService.getInstance();