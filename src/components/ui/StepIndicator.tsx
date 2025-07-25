import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  completedSteps,
  className
}) => {
  const getStepStatus = (stepIndex: number) => {
    if (completedSteps.includes(stepIndex)) return 'completed';
    if (stepIndex === currentStep) return 'current';
    if (stepIndex < currentStep) return 'completed';
    return 'upcoming';
  };

  const getStepIcon = (stepIndex: number, status: string) => {
    if (status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-white" />;
    }
    return (
      <Circle className={cn(
        "w-5 h-5",
        status === 'current' ? "text-primary" : "text-muted-foreground"
      )} />
    );
  };

  const getConnectorClass = (stepIndex: number) => {
    const isCompleted = completedSteps.includes(stepIndex) || stepIndex < currentStep;
    return cn(
      "flex-1 h-0.5 transition-colors duration-300",
      isCompleted ? "bg-primary" : "bg-muted"
    );
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Progress Bar */}
      <div className="relative mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            return (
              <React.Fragment key={step.id}>
                {/* Step Circle */}
                <div className="relative flex flex-col items-center">
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 z-10",
                      status === 'completed' 
                        ? "bg-primary border-primary text-white" 
                        : status === 'current'
                        ? "bg-background border-primary text-primary shadow-lg ring-4 ring-primary/20"
                        : "bg-background border-muted text-muted-foreground"
                    )}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  
                  {/* Step Label - Desktop */}
                  <div className="hidden md:block mt-2 text-center">
                    <div className={cn(
                      "text-sm font-medium transition-colors",
                      status === 'current' ? "text-primary" : "text-muted-foreground"
                    )}>
                      {step.title}
                    </div>
                    {step.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 max-w-24">
                        {step.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className={getConnectorClass(index)} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile Step Labels */}
      <div className="md:hidden">
        <div className="text-center bg-muted/30 rounded-lg p-4">
          <div className="text-lg font-semibold text-primary">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {steps[currentStep]?.title}
          </div>
          {steps[currentStep]?.description && (
            <div className="text-xs text-muted-foreground mt-1">
              {steps[currentStep].description}
            </div>
          )}
        </div>
      </div>

      {/* Progress Percentage */}
      <div className="mt-4">
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-1">
          <span>Progress</span>
          <span>{Math.round(((completedSteps.length + (currentStep > 0 ? 1 : 0)) / steps.length) * 100)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((completedSteps.length + (currentStep > 0 ? 1 : 0)) / steps.length) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;