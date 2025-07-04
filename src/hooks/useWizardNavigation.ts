import { useState, useCallback, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { EventFormData } from '@/types/event-form';

export type StepStatus = 'completed' | 'current' | 'pending' | 'error' | 'warning';

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  isRequired: (eventType: string) => boolean;
  canNavigateForward: (formData: EventFormData) => boolean;
  canNavigateBackward: () => boolean;
  validationSchema?: unknown; // Zod schema for step validation
  icon?: string; // Icon name for step indicator
}

export interface NavigationHistory {
  stepId: string;
  timestamp: number;
  formSnapshot?: Partial<EventFormData>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface UseWizardNavigationProps {
  form: UseFormReturn<EventFormData>;
  eventType: string;
  selectedCategories: string[];
  enableHistory?: boolean;
  onStepChange?: (stepId: string, direction: 'forward' | 'backward') => void;
  onValidationError?: (errors: string[], stepId: string) => void;
}

export const useWizardNavigation = ({ 
  form, 
  eventType, 
  selectedCategories,
  enableHistory = true,
  onStepChange,
  onValidationError
}: UseWizardNavigationProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [navigationHistory, setNavigationHistory] = useState<NavigationHistory[]>([]);
  const [isNavigating] = useState(false);
  const [lastValidationResult, setLastValidationResult] = useState<ValidationResult | null>(null);

  // Define wizard steps configuration
  const wizardSteps: WizardStep[] = useMemo(() => {
    console.log('🔄 Recalculating wizard steps for eventType:', eventType);
    
    const steps = [
      {
        id: 'event-type',
        title: 'Event Type',
        description: 'Choose your event tier',
        icon: 'Settings',
        isRequired: () => true,
        canNavigateForward: () => !!eventType,
        canNavigateBackward: () => false // First step
      },
      {
        id: 'basic-info',
        title: 'Event Details',
        description: 'Add event information',
        icon: 'FileText',
        isRequired: () => true,
        canNavigateForward: (data) => {
          // Check required fields for basic information
          const isValid = !!(
            data.title?.trim() &&
            data.description?.trim() &&
            data.organizationName?.trim() &&
            data.venueName?.trim() &&
            data.date &&
            data.time &&
            data.address?.trim() &&
            selectedCategories.length > 0
          );
          console.log("Basic info validation:", {
            title: !!data.title?.trim(),
            description: !!data.description?.trim(),
            organizationName: !!data.organizationName?.trim(),
            venueName: !!data.venueName?.trim(),
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
        icon: 'Ticket',
        isRequired: (eventType) => {
          const required = eventType !== 'simple';
          console.log(`📋 Ticketing step required for eventType "${eventType}":`, required);
          return required;
        },
        canNavigateForward: () => true, // Will be validated by TicketConfiguration component
        canNavigateBackward: () => true
      },
      {
        id: 'seating-setup',
        title: 'Seating Setup',
        description: 'Configure interactive seating',
        icon: 'LayoutGrid',
        isRequired: (eventType) => {
          const required = eventType === 'premium';
          console.log(`🪑 Seating setup step required for eventType "${eventType}":`, required);
          return required;
        },
        canNavigateForward: () => true, // Will be validated by SeatingChartWizard component
        canNavigateBackward: () => true
      },
      {
        id: 'review',
        title: 'Review & Publish',
        description: 'Review and publish event',
        icon: 'CheckCircle',
        isRequired: () => true,
        canNavigateForward: () => false, // Final step
        canNavigateBackward: () => true
      }
    ];
    
    console.log('📋 All defined steps:', steps.map(s => s.id));
    return steps;
  }, [eventType, selectedCategories]);

  // Get visible steps based on event type
  const visibleSteps = useMemo(() => {
    console.log(`👁️ Calculating visible steps for eventType: "${eventType}"`);
    
    const filtered = wizardSteps.filter(step => {
      const isRequired = step.isRequired(eventType);
      console.log(`  • Step "${step.id}": ${isRequired ? '✅ INCLUDED' : '❌ EXCLUDED'}`);
      return isRequired;
    });
    
    console.log(`📊 Final visible steps for "${eventType}":`, filtered.map(s => s.id));
    console.log(`📈 Total visible steps: ${filtered.length}`);
    
    return filtered;
  }, [wizardSteps, eventType]);

  // Get current step info
  const currentStepInfo = useMemo(() => {
    const stepInfo = visibleSteps[currentStep - 1];
    console.log(`🎯 Current step ${currentStep}: ${stepInfo?.id || 'UNDEFINED'}`);
    console.log(`📋 Available visible steps:`, visibleSteps.map((s, i) => `${i + 1}. ${s.id}`));
    return stepInfo;
  }, [visibleSteps, currentStep]);

  // Calculate progress
  const progress = useMemo(() => {
    return Math.round((currentStep / visibleSteps.length) * 100);
  }, [currentStep, visibleSteps.length]);

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

  // Enhanced validation with error tracking
  const validateCurrentStep = useCallback(() => {
    if (!currentStepInfo) {
      return { isValid: false, errors: ['Invalid step'], warnings: [] };
    }

    const formData = form.getValues();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic navigation validation
    const canNavigate = currentStepInfo.canNavigateForward(formData);
    if (!canNavigate) {
      const stepErrors = getCurrentStepErrors();
      errors.push(...stepErrors);
    }

    // Additional validation based on step
    switch (currentStepInfo.id) {
      case 'basic-info':
        if (formData.title && formData.title.length < 10) {
          warnings.push('Consider adding more detail to your event title');
        }
        if (formData.description && formData.description.length < 50) {
          warnings.push('A longer description may help attract more attendees');
        }
        break;
    }

    const result = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    setLastValidationResult(result);
    return result;
  }, [currentStepInfo, form, getCurrentStepErrors]);

  // Navigation validation - stable dependencies
  const canGoForward = useMemo(() => {
    if (!currentStepInfo) return false;
    const formData = form.getValues();
    return currentStepInfo.canNavigateForward(formData);
  }, [currentStepInfo, form, selectedCategories, eventType]);

  const canGoBackward = useMemo(() => {
    if (!currentStepInfo) return false;
    return currentStepInfo.canNavigateBackward() && currentStep > 1;
  }, [currentStepInfo, currentStep]);

  // Add to navigation history
  const addToHistory = useCallback((stepId: string, formSnapshot?: Partial<EventFormData>) => {
    if (!enableHistory) return;
    
    setNavigationHistory(prev => {
      const newEntry: NavigationHistory = {
        stepId,
        timestamp: Date.now(),
        formSnapshot: formSnapshot || form.getValues()
      };
      // Keep last 10 entries
      return [...prev.slice(-9), newEntry];
    });
  }, [enableHistory, form]);

  // Simplified navigation to prevent infinite loops
  const goToStep = useCallback((stepNumber: number, skipValidation = false) => {
    const targetStep = Math.max(1, Math.min(stepNumber, visibleSteps.length));
    const targetStepInfo = visibleSteps[targetStep - 1];
    
    if (!targetStepInfo) return false;

    // Validate current step before navigating forward
    if (targetStep > currentStep && !skipValidation && currentStepInfo) {
      const formData = form.getValues();
      const canNavigate = currentStepInfo.canNavigateForward(formData);
      if (!canNavigate) {
        const errors = getCurrentStepErrors();
        onValidationError?.(errors, currentStepInfo.id);
        return false;
      }
    }

    // Add to history
    if (enableHistory && currentStepInfo) {
      addToHistory(currentStepInfo.id, form.getValues());
    }
    
    // Direct navigation without setTimeout to prevent loops
    setCurrentStep(targetStep);
    
    const direction = targetStep > currentStep ? 'forward' : 'backward';
    onStepChange?.(targetStepInfo.id, direction);

    return true;
  }, [visibleSteps, currentStep, currentStepInfo, form, onValidationError, enableHistory, addToHistory, onStepChange, getCurrentStepErrors]);

  const nextStep = useCallback(() => {
    console.log(`🔄 NextStep called - Current: ${currentStep}, Max: ${visibleSteps.length}, CanGoForward: ${canGoForward}`);
    console.log(`📋 Visible steps when navigating next:`, visibleSteps.map(s => s.id));
    
    if (canGoForward && currentStep < visibleSteps.length) {
      const nextStepNum = currentStep + 1;
      const nextStepInfo = visibleSteps[nextStepNum - 1];
      console.log(`➡️ Navigating to step ${nextStepNum}: ${nextStepInfo?.id || 'UNDEFINED'}`);
      return goToStep(nextStepNum);
    }
    
    console.log(`🚫 Cannot navigate forward - canGoForward: ${canGoForward}, currentStep: ${currentStep}, maxSteps: ${visibleSteps.length}`);
    return false;
  }, [canGoForward, currentStep, visibleSteps.length, visibleSteps, goToStep]);

  const prevStep = useCallback(() => {
    if (canGoBackward) {
      return goToStep(currentStep - 1, true); // Skip validation when going backward
    }
    return false;
  }, [canGoBackward, currentStep, goToStep]);

  // Enhanced step status with error states
  const getStepStatus = useCallback((stepIndex: number): StepStatus => {
    const stepNumber = stepIndex + 1;
    
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) {
      // Check if current step has validation issues
      if (lastValidationResult && !lastValidationResult.isValid) {
        return 'error';
      }
      if (lastValidationResult && lastValidationResult.warnings.length > 0) {
        return 'warning';
      }
      return 'current';
    }
    return 'pending';
  }, [currentStep, lastValidationResult]);


  // Jump to specific step by ID
  const jumpToStep = useCallback((stepId: string, skipValidation = false) => {
    const stepIndex = visibleSteps.findIndex(step => step.id === stepId);
    if (stepIndex !== -1) {
      return goToStep(stepIndex + 1, skipValidation);
    }
    return false;
  }, [visibleSteps, goToStep]);

  // Get validation summary for all steps
  const getValidationSummary = useCallback(() => {
    const summary = {
      totalSteps: visibleSteps.length,
      completedSteps: currentStep - 1,
      hasErrors: lastValidationResult ? !lastValidationResult.isValid : false,
      hasWarnings: lastValidationResult ? lastValidationResult.warnings.length > 0 : false,
      currentStepErrors: lastValidationResult?.errors || [],
      currentStepWarnings: lastValidationResult?.warnings || []
    };
    return summary;
  }, [visibleSteps.length, currentStep, lastValidationResult]);

  return {
    // Current state
    currentStep,
    currentStepInfo,
    visibleSteps,
    progress,
    
    // Navigation state
    canGoForward,
    canGoBackward,
    isNavigating,
    
    // Enhanced navigation functions
    goToStep,
    nextStep,
    prevStep,
    jumpToStep,
    
    // Validation
    validateCurrentStep,
    getValidationSummary,
    lastValidationResult,
    
    // Step utilities
    getStepStatus,
    getCurrentStepErrors,
    
    // History
    navigationHistory,
    
    // Computed values
    totalSteps: visibleSteps.length,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === visibleSteps.length,
  };
};