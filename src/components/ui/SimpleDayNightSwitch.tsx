import * as React from "react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SimpleDayNightSwitchProps = {
  defaultChecked?: boolean;
  checked?: boolean;
  onToggle?: (checked: boolean) => void;
  className?: string;
};

export const SimpleDayNightSwitch = React.forwardRef<HTMLDivElement, SimpleDayNightSwitchProps>(
  ({ className, defaultChecked = true, checked: controlledChecked, onToggle }, ref) => {
    const id = React.useId();
    const [internalChecked, setInternalChecked] = useState<boolean>(defaultChecked);
    
    // Use controlled state if provided, otherwise use internal state
    const checked = controlledChecked !== undefined ? controlledChecked : internalChecked;

    const handleToggle = (newValue: boolean) => {
      if (controlledChecked === undefined) {
        setInternalChecked(newValue);
      }
      onToggle?.(newValue);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-20 h-10 rounded-md overflow-hidden border shadow transition-all duration-500",
          checked 
            ? "bg-gradient-to-b from-sky-300 to-blue-100" 
            : "bg-gradient-to-b from-slate-800 to-slate-900",
          className
        )}
      >
        <div className="relative h-full w-full">
          {/* Sun */}
          {checked && (
            <div 
              className="absolute w-6 h-6 bg-yellow-400 rounded-full transition-all duration-500"
              style={{
                left: "25%",
                top: "50%",
                marginTop: -12,
                marginLeft: -12,
              }}
            >
              {/* Simple sun rays */}
              <div className="absolute inset-0">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute bg-yellow-300 w-0.5 h-2 opacity-80"
                    style={{
                      left: "50%",
                      top: "50%",
                      transformOrigin: "0 0",
                      transform: `rotate(${i * 45}deg) translate(-50%, -50%) translate(8px, 0)`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Moon */}
          {!checked && (
            <div 
              className="absolute w-5 h-5 transition-all duration-500"
              style={{
                left: "75%",
                top: "50%",
                marginTop: -10,
                marginLeft: -10,
              }}
            >
              <div className="relative w-full h-full">
                <div className="absolute inset-0 bg-gray-100 rounded-full" />
                <div
                  className="absolute bg-slate-800 rounded-full"
                  style={{
                    width: "90%",
                    height: "90%",
                    top: "-10%",
                    left: "-25%",
                  }}
                />
              </div>
            </div>
          )}

          {/* Simple clouds for day */}
          {checked && (
            <>
              <div className="absolute left-[60%] top-[30%] w-6 h-2 bg-white rounded-full opacity-80" />
              <div className="absolute left-[70%] top-[60%] w-4 h-1.5 bg-white rounded-full opacity-70" />
            </>
          )}

          {/* Simple stars for night */}
          {!checked && (
            <>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-80"
                  style={{
                    left: `${15 + i * 12}%`,
                    top: `${25 + (i % 3) * 15}%`,
                  }}
                />
              ))}
            </>
          )}

          <div className="absolute inset-0 flex items-center justify-center">
            <Switch
              id={id}
              checked={checked}
              onCheckedChange={handleToggle}
              className="peer data-[state=unchecked]:bg-transparent data-[state=checked]:bg-transparent absolute inset-0 h-[inherit] w-auto [&_span]:z-10 [&_span]:size-6 [&_span]:border [&_span]:shadow [&_span]:rounded-sm [&_span]:transition-transform [&_span]:duration-500 [&_span]:data-[state=checked]:translate-x-10 [&_span]:data-[state=unchecked]:translate-x-2 [&_span]:bg-white [&_span]:border-gray-300"
            />
          </div>
        </div>

        <Label htmlFor={id} className="sr-only">
          Day/Night Theme Switch
        </Label>
      </div>
    );
  }
);

SimpleDayNightSwitch.displayName = "SimpleDayNightSwitch";