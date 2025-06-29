import { useState, useCallback, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { EventFormData } from '@/types/event-form';

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  isRequired: (eventType: string) => boolean;
  canNavigateForward: (formData: EventFormData) => boolean;
  canNavigateBackward: () => boolean;
}

interface UseWizardNavigationProps {
  form: UseFormReturn<EventFormData>;
  eventType: string;
  selectedCategories: string[];
}

export const useWizardNavigation = ({ 
  form, 
  eventType, 
  selectedCategories 
}: UseWizardNavigationProps) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Define wizard steps configuration
  const wizardSteps: WizardStep[] = useMemo(() => [
    {
      id: 'event-type',
      title: 'Event Type',
      description: 'Choose your event tier',
      isRequired: () => true,
      canNavigateForward: () => !!eventType,
      canNavigateBackward: () => false // First step
    },
    {
      id: 'basic-info',
      title: 'Event Details',
      description: 'Add event information',
      isRequired: () => true,
      canNavigateForward: (data) => {
        // Check required fields for basic information
        const isValid = !!(
          data.title?.trim() &&
          data.description?.trim() &&
          data.organizationName?.trim() &&
          data.date &&
          data.time &&
          data.address?.trim() &&
          selectedCategories.length > 0
        );
        console.log("Basic info validation:", {
          title: !!data.title?.trim(),
          description: !!data.description?.trim(),
          organizationName: !!data.organizationName?.trim(),
          date: !!data.date,
          time: !!data.time,
          address: !!data.address?.trim(),
          categories: selectedCategories.length > 0,
          canNavigate: isValid
        });
        return isValid;
      },
      canNavigateBackward: () => true
    },
    {
      id: 'ticketing',
      title: 'Ticketing',
      description: 'Configure ticket sales',
      isRequired: (eventType) => eventType !== 'simple',
      canNavigateForward: () => true, // Will be validated by TicketConfiguration component
      canNavigateBackward: () => true
    },
    {
      id: 'review',
      title: 'Review & Publish',
      description: 'Review and publish event',
      isRequired: () => true,
      canNavigateForward: () => false, // Final step
      canNavigateBackward: () => true
    }
  ], [eventType, selectedCategories]);

  // Get visible steps based on event type
  const visibleSteps = useMemo(() => {
    return wizardSteps.filter(step => step.isRequired(eventType));
  }, [wizardSteps, eventType]);

  // Get current step info
  const currentStepInfo = useMemo(() => {
    return visibleSteps[currentStep - 1];
  }, [visibleSteps, currentStep]);

  // Calculate progress
  const progress = useMemo(() => {
    return Math.round((currentStep / visibleSteps.length) * 100);
  }, [currentStep, visibleSteps.length]);

  // Navigation validation
  const canGoForward = useMemo(() => {
    if (!currentStepInfo) return false;
    const formData = form.getValues();
    return currentStepInfo.canNavigateForward(formData);
  }, [currentStepInfo, form, selectedCategories, form.watch()]);

  const canGoBackward = useMemo(() => {
    if (!currentStepInfo) return false;
    return currentStepInfo.canNavigateBackward() && currentStep > 1;
  }, [currentStepInfo, currentStep]);

  // Navigation functions
  const goToStep = useCallback((stepNumber: number) => {
    const targetStep = Math.max(1, Math.min(stepNumber, visibleSteps.length));
    setCurrentStep(targetStep);
  }, [visibleSteps.length]);

  const nextStep = useCallback(() => {
    if (canGoForward && currentStep < visibleSteps.length) {
      setCurrentStep(prev => prev + 1);
    }
  }, [canGoForward, currentStep, visibleSteps.length]);

  const prevStep = useCallback(() => {
    if (canGoBackward) {
      setCurrentStep(prev => prev - 1);
    }
  }, [canGoBackward]);

  // Get step status
  const getStepStatus = useCallback((stepIndex: number) => {
    const stepNumber = stepIndex + 1;
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'current';
    return 'pending';
  }, [currentStep]);

  // Validation errors for current step
  const getCurrentStepErrors = useCallback(() => {
    const errors = form.formState.errors;
    const stepId = currentStepInfo?.id;
    
    switch (stepId) {
      case 'event-type':
        return eventType ? [] : ['Please select an event type'];
      
      case 'basic-info': {
        const basicErrors: string[] = [];
        if (errors.title) basicErrors.push('Event title is required');
        if (errors.description) basicErrors.push('Event description is required');
        if (errors.organizationName) basicErrors.push('Organization name is required');
        if (errors.date) basicErrors.push('Event date is required');
        if (errors.time) basicErrors.push('Event time is required');
        if (errors.address) basicErrors.push('Event address is required');
        if (errors.categories || selectedCategories.length === 0) {
          basicErrors.push('At least one category must be selected');
        }
        return basicErrors;
      }
      
      default:
        return [];
    }
  }, [form.formState.errors, currentStepInfo?.id, eventType, selectedCategories]);

  return {
    // Current state
    currentStep,
    currentStepInfo,
    visibleSteps,
    progress,
    
    // Navigation state
    canGoForward,
    canGoBackward,
    
    // Navigation functions
    goToStep,
    nextStep,
    prevStep,
    
    // Step utilities
    getStepStatus,
    getCurrentStepErrors,
    
    // Computed values
    totalSteps: visibleSteps.length,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === visibleSteps.length,
  };
};