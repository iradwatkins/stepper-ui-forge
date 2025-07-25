import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit?: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isValid: boolean;
  isSubmitting?: boolean;
  nextLabel?: string;
  submitLabel?: string;
  className?: string;
  showSaveAsDraft?: boolean;
  onSaveAsDraft?: () => void;
  isSavingDraft?: boolean;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSubmit,
  isFirstStep,
  isLastStep,
  isValid,
  isSubmitting = false,
  nextLabel = "Next",
  submitLabel = "Create Business Listing",
  className,
  showSaveAsDraft = true,
  onSaveAsDraft,
  isSavingDraft = false
}) => {
  const handleNext = () => {
    if (isLastStep && onSubmit) {
      onSubmit();
    } else {
      onNext();
    }
  };

  const getNextButtonContent = () => {
    if (isLastStep) {
      if (isSubmitting) {
        return (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating...
          </>
        );
      }
      return (
        <>
          <Save className="w-4 h-4 mr-2" />
          {submitLabel}
        </>
      );
    }
    
    return (
      <>
        {nextLabel}
        <ChevronRight className="w-4 h-4 ml-2" />
      </>
    );
  };

  return (
    <div className={cn("flex flex-col gap-4 pt-6 border-t", className)}>
      {/* Mobile-First Layout */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Left Side - Previous Button and Step Counter */}
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={isFirstStep || isSubmitting}
            className="flex items-center flex-1 sm:flex-none justify-center sm:justify-start"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          {/* Step Counter - Hidden on mobile */}
          <div className="hidden sm:block text-sm text-muted-foreground whitespace-nowrap">
            Step {currentStep + 1} of {totalSteps}
          </div>
        </div>

        {/* Right Side - Actions */}
        <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto w-full sm:w-auto">
          {/* Save as Draft Button */}
          {showSaveAsDraft && onSaveAsDraft && !isLastStep && (
            <Button
              type="button"
              variant="ghost"
              onClick={onSaveAsDraft}
              disabled={isSubmitting || isSavingDraft}
              className="flex items-center justify-center"
            >
              {isSavingDraft ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Save as Draft</span>
                  <span className="sm:hidden">Save Draft</span>
                </>
              )}
            </Button>
          )}

          {/* Next/Submit Button */}
          <Button
            type="button"
            onClick={handleNext}
            disabled={!isValid || isSubmitting || isSavingDraft}
            className={cn(
              "flex items-center min-w-[140px] justify-center",
              isLastStep && "bg-green-600 hover:bg-green-700"
            )}
          >
            {getNextButtonContent()}
          </Button>
        </div>
      </div>

      {/* Mobile Step Counter */}
      <div className="sm:hidden text-center text-sm text-muted-foreground py-2 bg-muted/20 rounded-lg">
        <span className="font-medium">Step {currentStep + 1} of {totalSteps}</span>
        {!isValid && (
          <div className="text-xs text-orange-600 mt-1">
            Please complete required fields to continue
          </div>
        )}
      </div>
    </div>
  );
};

export default StepNavigation;