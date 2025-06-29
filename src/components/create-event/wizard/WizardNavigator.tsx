import { CheckIcon, AlertCircleIcon, AlertTriangleIcon, LoaderIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { WizardStep, StepStatus } from "@/hooks/useWizardNavigation";

interface WizardNavigatorProps {
  steps: WizardStep[];
  currentStep: number;
  getStepStatus: (stepIndex: number) => StepStatus;
  onStepClick?: (stepNumber: number) => void;
  isNavigating?: boolean;
  validationErrors?: string[];
  validationWarnings?: string[];
  className?: string;
}

export const WizardNavigator = ({
  steps,
  currentStep,
  getStepStatus,
  onStepClick,
  isNavigating = false,
  validationErrors = [],
  validationWarnings = [],
  className
}: WizardNavigatorProps) => {
  return (
    <nav 
      className={cn("mb-8", className)}
      aria-label="Event creation progress"
    >
      {/* Desktop Layout */}
      <div className="hidden md:block">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const status = getStepStatus(index);
            const isClickable = onStepClick && (status === 'completed' || status === 'current') && !isNavigating;
            const hasErrors = status === 'error';
            const hasWarnings = status === 'warning';
            
            return (
              <li key={step.id} className="flex-1">
                <div className="flex items-center">
                  {/* Step Circle */}
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => isClickable && onStepClick(stepNumber)}
                      disabled={!isClickable}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 relative",
                        {
                          // Completed step
                          "bg-primary border-primary text-primary-foreground hover:bg-primary/90": 
                            status === 'completed',
                          // Current step
                          "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20": 
                            status === 'current' && !hasErrors && !hasWarnings,
                          // Error state
                          "bg-destructive border-destructive text-destructive-foreground ring-4 ring-destructive/20": 
                            hasErrors,
                          // Warning state
                          "bg-yellow-500 border-yellow-500 text-white ring-4 ring-yellow-500/20": 
                            hasWarnings,
                          // Pending step
                          "bg-muted border-muted-foreground/30 text-muted-foreground": 
                            status === 'pending',
                          // Clickable states
                          "cursor-pointer hover:scale-105": isClickable,
                          "cursor-not-allowed": !isClickable && status === 'pending',
                          // Navigating state
                          "opacity-60": isNavigating
                        }
                      )}
                      aria-label={`${step.title}: ${status}`}
                      aria-current={status === 'current' ? 'step' : undefined}
                    >
                      {isNavigating && status === 'current' ? (
                        <LoaderIcon className="h-4 w-4 animate-spin" />
                      ) : status === 'completed' ? (
                        <CheckIcon className="h-5 w-5" />
                      ) : hasErrors ? (
                        <AlertCircleIcon className="h-5 w-5" />
                      ) : hasWarnings ? (
                        <AlertTriangleIcon className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-medium">{stepNumber}</span>
                      )}
                    </button>
                  </div>

                  {/* Step Content */}
                  <div className="ml-4 flex-1">
                    <div className={cn(
                      "text-sm font-medium transition-colors",
                      {
                        "text-primary": status === 'completed' || (status === 'current' && !hasErrors && !hasWarnings),
                        "text-destructive": hasErrors,
                        "text-yellow-600": hasWarnings,
                        "text-muted-foreground": status === 'pending'
                      }
                    )}>
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {step.description}
                    </div>
                    {/* Show validation messages for current step */}
                    {status === 'current' && (validationErrors.length > 0 || validationWarnings.length > 0) && (
                      <div className="mt-1 space-y-1">
                        {validationErrors.map((error, idx) => (
                          <div key={idx} className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircleIcon className="h-3 w-3" />
                            {error}
                          </div>
                        ))}
                        {validationWarnings.map((warning, idx) => (
                          <div key={idx} className="text-xs text-yellow-600 flex items-center gap-1">
                            <AlertTriangleIcon className="h-3 w-3" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-4">
                      <div className={cn(
                        "h-0.5 transition-colors",
                        {
                          "bg-primary": status === 'completed',
                          "bg-destructive": hasErrors,
                          "bg-yellow-500": hasWarnings,
                          "bg-muted-foreground/30": status === 'current' || status === 'pending'
                        }
                      )} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-muted-foreground">
            Step {currentStep} of {steps.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {Math.round((currentStep / steps.length) * 100)}% complete
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>

        {/* Current Step Info */}
        <div className="flex items-center space-x-3">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2",
            {
              "bg-primary border-primary text-primary-foreground": 
                !validationErrors.length && !validationWarnings.length,
              "bg-destructive border-destructive text-destructive-foreground": 
                validationErrors.length > 0,
              "bg-yellow-500 border-yellow-500 text-white": 
                validationWarnings.length > 0 && !validationErrors.length
            }
          )}>
            {isNavigating ? (
              <LoaderIcon className="h-3 w-3 animate-spin" />
            ) : validationErrors.length > 0 ? (
              <AlertCircleIcon className="h-3 w-3" />
            ) : validationWarnings.length > 0 ? (
              <AlertTriangleIcon className="h-3 w-3" />
            ) : (
              <span className="text-xs font-medium">{currentStep}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">
              {steps[currentStep - 1]?.title}
            </div>
            <div className="text-xs text-muted-foreground">
              {steps[currentStep - 1]?.description}
            </div>
            {/* Mobile validation messages */}
            {(validationErrors.length > 0 || validationWarnings.length > 0) && (
              <div className="mt-2 space-y-1">
                {validationErrors.map((error, idx) => (
                  <div key={idx} className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircleIcon className="h-3 w-3" />
                    {error}
                  </div>
                ))}
                {validationWarnings.map((warning, idx) => (
                  <div key={idx} className="text-xs text-yellow-600 flex items-center gap-1">
                    <AlertTriangleIcon className="h-3 w-3" />
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};