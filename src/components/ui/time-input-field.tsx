import * as React from "react";
import { TimePicker } from "./time-picker";

interface TimeInputFieldProps {
  value?: string; // HH:MM format (24-hour)
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TimeInputField({
  value,
  onChange,
  placeholder = "Pick a time",
  className,
}: TimeInputFieldProps) {
  return (
    <TimePicker
      time={value}
      onTimeChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  );
}