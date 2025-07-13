import React, { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';

interface DateRange {
  start: Date;
  end: Date;
}

interface DatePickerWithRangeProps {
  dateRange?: DateRange;
  onDateRangeChange: (dateRange: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

export const DatePickerWithRange: React.FC<DatePickerWithRangeProps> = ({
  dateRange,
  onDateRangeChange,
  placeholder = "Select date range",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>(
    dateRange?.start ? dateRange.start.toISOString().split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState<string>(
    dateRange?.end ? dateRange.end.toISOString().split('T')[0] : ''
  );

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (value && endDate) {
      onDateRangeChange({
        start: new Date(value),
        end: new Date(endDate)
      });
    } else if (!value) {
      onDateRangeChange(undefined);
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (startDate && value) {
      onDateRangeChange({
        start: new Date(startDate),
        end: new Date(value)
      });
    } else if (!value) {
      onDateRangeChange(undefined);
    }
  };

  const clearDates = () => {
    setStartDate('');
    setEndDate('');
    onDateRangeChange(undefined);
  };

  const formatDateRange = () => {
    if (dateRange) {
      return `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`;
    }
    return placeholder;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateRange && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              min={startDate}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearDates}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};