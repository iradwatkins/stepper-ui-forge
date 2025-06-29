
import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';

export const useImageUpload = () => {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const handleImageUpload = useCallback(async (files: FileList) => {
    if (!files.length) return;

    setIsProcessingImage(true);
    console.log("Processing image upload:", files.length, "files");

    try {
      const processedImages: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/jpeg'
        };

        try {
          const compressedFile = await imageCompression(file, options);
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(compressedFile);
          });
          
          processedImages.push(base64);
          console.log(`Processed image ${i + 1}/${files.length}`);
        } catch (error) {
          console.error(`Error processing image ${i + 1}:`, error);
        }
      }

      setUploadedImages(prev => [...prev, ...processedImages]);
      console.log("Successfully uploaded", processedImages.length, "images");
    } catch (error) {
      console.error("Error in image upload process:", error);
    } finally {
      setIsProcessingImage(false);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    console.log("Removed image at index:", index);
  }, []);

  return {
    uploadedImages,
    setUploadedImages,
    isProcessingImage,
    handleImageUpload,
    removeImage
  };
};
