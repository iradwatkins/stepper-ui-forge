import * as React from "react";
import { EnhancedDatePicker } from "./enhanced-date-picker";

interface DateInputFieldProps {
  value?: string; // YYYY-MM-DD format
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string; // YYYY-MM-DD format
  defaultToToday?: boolean;
}

export function DateInputField({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  minDate,
  defaultToToday = true,
}: DateInputFieldProps) {
  // Convert string date to Date object
  const dateValue = value ? new Date(value + 'T00:00:00') : undefined;
  const minDateValue = minDate ? new Date(minDate + 'T00:00:00') : undefined;

  // Handle date change from DatePicker
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      // Format as YYYY-MM-DD for form compatibility
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      onChange?.(`${year}-${month}-${day}`);
    } else {
      onChange?.('');
    }
  };

  return (
    <EnhancedDatePicker
      date={dateValue}
      onDateChange={handleDateChange}
      placeholder={placeholder}
      className={className}
      minDate={minDateValue}
      defaultToToday={defaultToToday}
    />
  );
}