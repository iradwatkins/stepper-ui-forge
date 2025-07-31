/**
 * File upload validation utilities
 * Provides secure validation for file uploads to prevent malicious files
 */

// Allowed file types for different upload contexts
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  avatar: 2 * 1024 * 1024, // 2MB
} as const;

// File extension whitelist
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx'];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file type based on MIME type and extension
 */
export function validateFileType(
  file: File,
  allowedTypes: readonly string[]
): FileValidationResult {
  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  // Also check file extension as an extra security measure
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
  
  const allowedExtensions = allowedTypes.includes('image/jpeg') 
    ? ALLOWED_IMAGE_EXTENSIONS 
    : ALLOWED_DOCUMENT_EXTENSIONS;

  if (!allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `File extension ${fileExtension} is not allowed`,
    };
  }

  return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(
  file: File,
  maxSize: number
): FileValidationResult {
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size ${fileSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate image dimensions (requires reading the image)
 */
export async function validateImageDimensions(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<FileValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      if (img.width > maxWidth || img.height > maxHeight) {
        resolve({
          valid: false,
          error: `Image dimensions ${img.width}x${img.height} exceed maximum allowed ${maxWidth}x${maxHeight}`,
        });
      } else {
        resolve({ valid: true });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        valid: false,
        error: 'Failed to load image for validation',
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Sanitize filename to prevent directory traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path separators and special characters
  return filename
    .replace(/[\/\\]/g, '_') // Replace path separators
    .replace(/\.{2,}/g, '_') // Replace multiple dots
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Keep only safe characters
    .slice(0, 255); // Limit length
}

/**
 * Comprehensive file validation for uploads
 */
export async function validateFileUpload(
  file: File,
  options: {
    allowedTypes: readonly string[];
    maxSize: number;
    maxWidth?: number;
    maxHeight?: number;
  }
): Promise<FileValidationResult> {
  // Validate file type
  const typeValidation = validateFileType(file, options.allowedTypes);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  // Validate file size
  const sizeValidation = validateFileSize(file, options.maxSize);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  // For images, validate dimensions if specified
  if (options.maxWidth && options.maxHeight && file.type.startsWith('image/')) {
    const dimensionValidation = await validateImageDimensions(
      file,
      options.maxWidth,
      options.maxHeight
    );
    if (!dimensionValidation.valid) {
      return dimensionValidation;
    }
  }

  return { valid: true };
}

/**
 * Generate a secure filename for storage
 */
export function generateSecureFilename(originalFilename: string, userId: string): string {
  const sanitized = sanitizeFilename(originalFilename);
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = sanitized.substring(sanitized.lastIndexOf('.'));
  
  return `${userId}_${timestamp}_${randomString}${extension}`;
}