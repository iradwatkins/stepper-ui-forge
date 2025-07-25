import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { imageUploadService } from '@/lib/services/ImageUploadService';
import { toast } from 'sonner';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  className?: string;
  disabled?: boolean;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  type?: 'content' | 'featured';
}

export default function ImageUpload({
  value,
  onChange,
  className = '',
  disabled = false,
  maxSizeMB = 5,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  type = 'featured'
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);

      // Validate file size and type
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`File too large. Maximum size is ${maxSizeMB}MB.`);
        return null;
      }

      if (!acceptedFormats.includes(file.type)) {
        toast.error('Please upload a valid image file (JPEG, PNG, WebP, or GIF)');
        return null;
      }

      // Use the proper upload service
      const result = await imageUploadService.uploadMagazineImage(file, type);

      if (!result.success) {
        console.error('Upload error:', result.error);
        
        // Provide specific error messages
        if (result.error?.includes('not authenticated')) {
          toast.error('Please sign in to upload images.');
        } else {
          toast.error(result.error || 'Failed to upload image. Please try again.');
        }
        
        return null;
      }

      console.log(`[ImageUpload] Upload successful: ${result.url}`);
      return result.url || null;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    console.log(`[ImageUpload] Processing file: ${file.name} (${file.size} bytes)`);
    const uploadedUrl = await uploadImage(file);
    if (uploadedUrl) {
      onChange(uploadedUrl);
      toast.success('Image uploaded successfully!');
    }
  }, [maxSizeMB, acceptedFormats, onChange]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce((acc, format) => ({ ...acc, [format]: [] }), {}),
    maxFiles: 1,
    disabled: disabled || uploading,
  });

  const removeImage = () => {
    onChange(null);
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          console.log(`[ImageUpload] Processing pasted image: ${file.name} (${file.size} bytes)`);
          const uploadedUrl = await uploadImage(file);
          if (uploadedUrl) {
            onChange(uploadedUrl);
            toast.success('Image uploaded successfully!');
          }
        }
        break;
      }
    }
  }, [onChange]);

  if (value) {
    return (
      <Card className={`relative ${className}`}>
        <CardContent className="p-0">
          <div className="relative">
            <img
              src={value}
              alt="Featured image"
              className="w-full h-48 object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={removeImage}
                disabled={disabled}
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`relative ${className}`}>
      <CardContent className="p-0">
        <div
          ref={containerRef}
          {...getRootProps()}
          onPaste={handlePaste}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive && !isDragReject ? 'border-primary bg-primary/10' : ''}
            ${isDragReject ? 'border-destructive bg-destructive/10' : ''}
            ${!isDragActive && !isDragReject ? 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5' : ''}
            ${disabled || uploading ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            {uploading ? (
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            ) : (
              <div className="relative">
                <Upload className="w-12 h-12 text-muted-foreground" />
                <ImageIcon className="w-6 h-6 absolute -bottom-1 -right-1 text-primary" />
              </div>
            )}
            
            <div>
              {uploading ? (
                <p className="font-medium">Uploading image...</p>
              ) : isDragActive ? (
                isDragReject ? (
                  <p className="font-medium text-destructive">Invalid file type</p>
                ) : (
                  <p className="font-medium text-primary">Drop image here</p>
                )
              ) : (
                <>
                  <p className="font-medium mb-1">
                    Drag and drop an image here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports JPEG, PNG, WebP, GIF up to {maxSizeMB}MB
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Tip: You can also paste images from your clipboard
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}