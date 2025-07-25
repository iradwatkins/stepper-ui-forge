import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FormStepProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

export const FormStep: React.FC<FormStepProps> = ({
  title,
  description,
  children,
  className,
  icon,
  isActive = true
}) => {
  return (
    <div className={cn(
      "transition-all duration-300",
      isActive ? "opacity-100" : "opacity-50 pointer-events-none",
      className
    )}>
      <Card className="border-2 shadow-sm">
        <CardHeader className="pb-4 px-4 sm:px-6">
          <div className="flex items-start sm:items-center gap-3">
            {icon && (
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 text-primary flex-shrink-0 mt-1 sm:mt-0">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg sm:text-xl leading-tight">{title}</CardTitle>
              {description && (
                <CardDescription className="mt-1 text-sm leading-relaxed">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 sm:px-6 pb-6">
          {children}
        </CardContent>
      </Card>
    </div>
  );
};

export default FormStep;