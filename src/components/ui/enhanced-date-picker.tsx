import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EnhancedDatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  minDate?: Date;
  defaultToToday?: boolean;
}

export function EnhancedDatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  minDate,
  defaultToToday = true,
}: EnhancedDatePickerProps) {
  // Initialize with today's date if defaultToToday is true and no date is provided
  React.useEffect(() => {
    if (defaultToToday && !date) {
      onDateChange?.(new Date());
    }
  }, [defaultToToday, date, onDateChange]);

  const formatDateDisplay = (date: Date | undefined) => {
    if (!date) return placeholder;
    return format(date, "MMM dd, yyyy");
  };

  const handleQuickSelect = (daysToAdd: number) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + daysToAdd);
    onDateChange?.(newDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateDisplay(date)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <div className="text-sm font-medium mb-2">Quick Select</div>
          <div className="grid grid-cols-2 gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickSelect(0)}
              className="text-xs"
            >
              Today
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickSelect(1)}
              className="text-xs"
            >
              Tomorrow
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const today = new Date();
                const saturday = new Date();
                saturday.setDate(today.getDate() + (6 - today.getDay()));
                onDateChange?.(saturday);
              }}
              className="text-xs"
            >
              This Saturday
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickSelect(7)}
              className="text-xs"
            >
              Next Week
            </Button>
          </div>
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            return false;
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}