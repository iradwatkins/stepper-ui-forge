import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, LoaderIcon, AlertCircleIcon, AlertTriangleIcon, SaveIcon, HelpCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WizardControlsProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onNext: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isLoading?: boolean;
  isNavigating?: boolean;
  nextButtonText?: string;
  backButtonText?: string;
  errors?: string[];
  warnings?: string[];
  onSaveDraft?: () => void;
  onQuickSave?: () => void;
  isDraftSaving?: boolean;
  lastSaved?: Date;
  helpText?: string;
  showQuickActions?: boolean;
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
  isNavigating = false,
  nextButtonText,
  backButtonText,
  errors = [],
  warnings = [],
  onSaveDraft,
  onQuickSave,
  isDraftSaving = false,
  lastSaved,
  helpText,
  showQuickActions = true,
  className
}: WizardControlsProps) => {
  // Default button text based on step position
  const defaultNextText = isLastStep ? "Publish Event" : "Continue";
  const defaultBackText = "Back";

  const formatLastSaved = (date?: Date) => {
    if (!date) return null;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        {/* Validation Messages */}
        {(errors.length > 0 || warnings.length > 0) && (
          <div className="space-y-3">
            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex">
                  <AlertCircleIcon className="h-5 w-5 text-red-400 mt-0.5" />
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

            {/* Warning Messages */}
            {warnings.length > 0 && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex">
                  <AlertTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Suggestions for improvement:
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc pl-5 space-y-1">
                        {warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions Bar */}
        {showQuickActions && (onSaveDraft || onQuickSave) && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {onSaveDraft && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onSaveDraft}
                      disabled={isDraftSaving || isLoading || isNavigating}
                      className="h-8 px-2"
                    >
                      {isDraftSaving ? (
                        <LoaderIcon className="h-3 w-3 animate-spin" />
                      ) : (
                        <SaveIcon className="h-3 w-3" />
                      )}
                      <span className="ml-1 text-xs">Save Draft</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save your progress as a draft</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {helpText && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                    >
                      <HelpCircleIcon className="h-3 w-3" />
                      <span className="ml-1 text-xs">Help</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{helpText}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Auto-save Status */}
            {lastSaved && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Saved {formatLastSaved(lastSaved)}
              </div>
            )}
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
                disabled={!canGoBack || isLoading || isNavigating}
                className="w-full sm:w-auto"
              >
                {isNavigating ? (
                  <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ChevronLeftIcon className="w-4 h-4 mr-2" />
                )}
                {backButtonText || defaultBackText}
              </Button>
            )}
          </div>

          {/* Next/Publish Button */}
          <div className="order-1 sm:order-2">
            <Button
              type="submit"
              onClick={onNext}
              disabled={!canGoForward || isLoading || isNavigating}
              className={cn(
                "w-full sm:w-auto min-w-[120px]",
                {
                  "bg-green-600 hover:bg-green-700": isLastStep && canGoForward,
                  "opacity-75": isNavigating
                }
              )}
            >
              {isLoading || isNavigating ? (
                <>
                  <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                  {isLastStep ? "Publishing..." : isNavigating ? "Navigating..." : "Processing..."}
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

        {/* Enhanced Help Text */}
        <div className="text-xs text-muted-foreground text-center sm:text-left space-y-1">
          <div>
            {isLastStep ? (
              "Review your event details and publish when ready"
            ) : canGoForward ? (
              errors.length === 0 ? (
                warnings.length > 0 
                  ? "You can continue, but consider addressing the suggestions above"
                  : "All required fields are completed. You can continue to the next step."
              ) : (
                "Please fix the errors above to continue"
              )
            ) : (
              "Please complete all required fields to continue"
            )}
          </div>
          
          {/* Navigation hint */}
          {!isFirstStep && !isLastStep && (
            <div className="text-muted-foreground/70">
              Tip: You can go back to previous steps to make changes
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};