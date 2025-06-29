import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, LoaderIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardControlsProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onNext: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isLoading?: boolean;
  nextButtonText?: string;
  backButtonText?: string;
  errors?: string[];
  className?: string;
}

export const WizardControls = ({
  canGoBack,
  canGoForward,
  onBack,
  onNext,
  isFirstStep,
  isLastStep,
  isLoading = false,
  nextButtonText,
  backButtonText,
  errors = [],
  className
}: WizardControlsProps) => {
  // Default button text based on step position
  const defaultNextText = isLastStep ? "Publish Event" : "Continue";
  const defaultBackText = "Back";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Please fix the following issues:
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        {/* Back Button */}
        <div className="order-2 sm:order-1">
          {!isFirstStep && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={!canGoBack || isLoading}
              className="w-full sm:w-auto"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-2" />
              {backButtonText || defaultBackText}
            </Button>
          )}
        </div>

        {/* Next/Publish Button */}
        <div className="order-1 sm:order-2">
          <Button
            type="submit"
            onClick={onNext}
            disabled={!canGoForward || isLoading}
            className={cn(
              "w-full sm:w-auto min-w-[120px]",
              {
                "bg-green-600 hover:bg-green-700": isLastStep,
              }
            )}
          >
            {isLoading ? (
              <>
                <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                {isLastStep ? "Publishing..." : "Processing..."}
              </>
            ) : (
              <>
                {nextButtonText || defaultNextText}
                {!isLastStep && <ChevronRightIcon className="w-4 h-4 ml-2" />}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-xs text-muted-foreground text-center sm:text-left">
        {isLastStep ? (
          "Review your event details and publish when ready"
        ) : canGoForward ? (
          "All required fields are completed. You can continue to the next step."
        ) : (
          "Please complete all required fields to continue"
        )}
      </div>
    </div>
  );
};