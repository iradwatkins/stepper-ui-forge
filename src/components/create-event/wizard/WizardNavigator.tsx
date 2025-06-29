import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { WizardStep } from "@/hooks/useWizardNavigation";

interface WizardNavigatorProps {
  steps: WizardStep[];
  currentStep: number;
  getStepStatus: (stepIndex: number) => 'completed' | 'current' | 'pending';
  onStepClick?: (stepNumber: number) => void;
  className?: string;
}

export const WizardNavigator = ({
  steps,
  currentStep,
  getStepStatus,
  onStepClick,
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
            const isClickable = onStepClick && (status === 'completed' || status === 'current');
            
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
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200",
                        {
                          // Completed step
                          "bg-primary border-primary text-primary-foreground hover:bg-primary/90": 
                            status === 'completed',
                          // Current step
                          "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20": 
                            status === 'current',
                          // Pending step
                          "bg-muted border-muted-foreground/30 text-muted-foreground": 
                            status === 'pending',
                          // Clickable states
                          "cursor-pointer hover:scale-105": isClickable,
                          "cursor-not-allowed": !isClickable && status === 'pending'
                        }
                      )}
                      aria-label={`${step.title}: ${status}`}
                      aria-current={status === 'current' ? 'step' : undefined}
                    >
                      {status === 'completed' ? (
                        <CheckIcon className="h-5 w-5" />
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
                        "text-primary": status === 'completed' || status === 'current',
                        "text-muted-foreground": status === 'pending'
                      }
                    )}>
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {step.description}
                    </div>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-4">
                      <div className={cn(
                        "h-0.5 transition-colors",
                        {
                          "bg-primary": status === 'completed',
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
            "bg-primary border-primary text-primary-foreground"
          )}>
            <span className="text-xs font-medium">{currentStep}</span>
          </div>
          <div>
            <div className="text-sm font-medium">
              {steps[currentStep - 1]?.title}
            </div>
            <div className="text-xs text-muted-foreground">
              {steps[currentStep - 1]?.description}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};