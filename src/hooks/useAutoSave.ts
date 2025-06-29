
import { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { EventFormData } from '@/types/event-form';

interface UseAutoSaveProps {
  form: UseFormReturn<EventFormData>;
  eventType: string;
  selectedCategories: string[];
  uploadedImages: string[];
  currentStep: number;
  enabled?: boolean;
}

export const useAutoSave = ({
  form,
  eventType,
  selectedCategories,
  uploadedImages,
  currentStep,
  enabled = true
}: UseAutoSaveProps) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const saveTimer = setTimeout(() => {
      const formData = form.getValues();
      if (formData.title || formData.description) {
        localStorage.setItem('draft-event', JSON.stringify({
          ...formData,
          eventType,
          selectedCategories,
          uploadedImages,
          currentStep
        }));
        setLastSaved(new Date());
        console.log("Auto-saved draft at:", new Date());
      }
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [form.watch(), eventType, selectedCategories, uploadedImages, currentStep, enabled]);

  const clearDraft = () => {
    localStorage.removeItem('draft-event');
    setLastSaved(null);
    console.log("Cleared draft");
  };

  const loadDraft = (
    setEventType: (type: string) => void,
    setSelectedCategories: (categories: string[]) => void,
    setUploadedImages: (images: string[]) => void,
    setCurrentStep: (step: number) => void
  ) => {
    const savedDraft = localStorage.getItem('draft-event');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        form.reset(draft);
        setEventType(draft.eventType || "");
        setSelectedCategories(draft.selectedCategories || []);
        setUploadedImages(draft.uploadedImages || []);
        setCurrentStep(draft.currentStep || 1);
        console.log("Loaded draft from localStorage");
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    }
  };

  return {
    lastSaved,
    clearDraft,
    loadDraft
  };
};
