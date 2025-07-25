import React, { useCallback, useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { imageUploadService } from '@/lib/services/ImageUploadService';
import { toast } from 'sonner';

interface SimpleImageUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  className?: string;
  placeholder?: string;
  maxSizeMB?: number;
  type?: 'content' | 'featured';
}

export default function SimpleImageUpload({
  value,
  onChange,
  className = '',
  placeholder = 'Click to upload or paste an image',
  maxSizeMB = 5,
  type = 'content'
}: SimpleImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);

      // Validate file
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return null;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`Image must be less than ${maxSizeMB}MB`);
        return null;
      }

      // Use the proper upload service
      const result = await imageUploadService.uploadMagazineImage(file, type);

      if (!result.success) {
        console.error('Upload error:', result.error);
        toast.error(result.error || 'Failed to upload image');
        return null;
      }

      return result.url || null;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (url) {
      onChange(url);
      toast.success('Image uploaded successfully!');
    }
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const url = await uploadImage(file);
          if (url) {
            onChange(url);
            toast.success('Image pasted successfully!');
          }
        }
        break;
      }
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const url = await uploadImage(file);
      if (url) {
        onChange(url);
        toast.success('Image dropped successfully!');
      }
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (value) {
    return (
      <div className={`relative group ${className}`}>
        <img
          src={value}
          alt="Uploaded"
          className="w-full h-40 object-cover rounded-lg"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onChange(null)}
          >
            <X className="w-4 h-4 mr-1" />
            Remove
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div
        onClick={() => fileInputRef.current?.click()}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium">{placeholder}</p>
            <p className="text-xs text-muted-foreground">
              Drop, paste (Ctrl+V), or click to upload
            </p>
          </div>
        )}
      </div>
    </div>
  );
}