import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimePickerProps {
  time?: string;
  onTimeChange?: (time: string) => void;
  placeholder?: string;
  className?: string;
}

export function TimePicker({
  time,
  onTimeChange,
  placeholder = "Pick a time",
  className,
}: TimePickerProps) {
  // Parse time into hours, minutes, and AM/PM
  const parseTime = (timeString?: string) => {
    if (!timeString) return { hours: "12", minutes: "00", period: "PM" };
    
    const [hoursStr, minutesStr] = timeString.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr || "00";
    
    const period = hours >= 12 ? "PM" : "AM";
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;
    
    return {
      hours: hours.toString().padStart(2, "0"),
      minutes,
      period
    };
  };

  const { hours, minutes, period } = parseTime(time);

  const formatTimeDisplay = () => {
    if (!time) return placeholder;
    const { hours, minutes, period } = parseTime(time);
    return `${parseInt(hours, 10)}:${minutes} ${period}`;
  };

  const handleTimeChange = (newHours: string, newMinutes: string, newPeriod: string) => {
    let hour24 = parseInt(newHours, 10);
    
    if (newPeriod === "AM" && hour24 === 12) {
      hour24 = 0;
    } else if (newPeriod === "PM" && hour24 !== 12) {
      hour24 += 12;
    }
    
    const timeString = `${hour24.toString().padStart(2, "0")}:${newMinutes}`;
    onTimeChange?.(timeString);
  };

  const hours12 = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1;
    return hour.toString().padStart(2, "0");
  });

  const minuteOptions = Array.from({ length: 12 }, (_, i) => {
    const minute = i * 5;
    return minute.toString().padStart(2, "0");
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !time && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {formatTimeDisplay()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4">
        <div className="space-y-3">
          <div className="text-sm font-medium text-center mb-2">Select Time</div>
          
          <div className="flex gap-2 items-center">
            <Select
              value={hours}
              onValueChange={(value) => handleTimeChange(value, minutes, period)}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hours12.map((h) => (
                  <SelectItem key={h} value={h}>
                    {parseInt(h, 10).toString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-lg font-semibold">:</span>

            <Select
              value={minutes}
              onValueChange={(value) => handleTimeChange(hours, value, period)}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {minuteOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={period}
              onValueChange={(value) => handleTimeChange(hours, minutes, value)}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground mb-2">Quick Select</div>
            <div className="grid grid-cols-3 gap-1">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => handleTimeChange("09", "00", "AM")}
              >
                9:00 AM
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => handleTimeChange("12", "00", "PM")}
              >
                12:00 PM
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => handleTimeChange("03", "00", "PM")}
              >
                3:00 PM
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => handleTimeChange("06", "00", "PM")}
              >
                6:00 PM
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => handleTimeChange("08", "00", "PM")}
              >
                8:00 PM
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => handleTimeChange("10", "00", "PM")}
              >
                10:00 PM
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}