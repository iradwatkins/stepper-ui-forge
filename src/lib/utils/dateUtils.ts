/**
 * Date utilities for handling event dates with proper timezone awareness
 * Prevents timezone shift issues when displaying date-only values
 */

/**
 * Formats an event date string for display, preventing timezone shift
 * @param dateString - Date string in "YYYY-MM-DD" format from database
 * @returns Formatted date string (e.g., "Jul 30, 2024")
 */
export const formatEventDate = (dateString: string): string => {
  if (!dateString) return '';
  
  // Parse as local date to prevent timezone shift
  // Adding T00:00:00 ensures it's treated as local midnight, not UTC
  const date = new Date(dateString + 'T00:00:00');
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Formats an event time string for display
 * @param timeString - Time string in "HH:MM" format
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export const formatEventTime = (timeString: string): string => {
  if (!timeString) return '';
  
  // Create a date with today's date and the event time
  const today = new Date().toISOString().split('T')[0];
  const dateTime = new Date(`${today}T${timeString}:00`);
  
  return dateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Formats an event date and time together
 * @param dateString - Date string in "YYYY-MM-DD" format
 * @param timeString - Time string in "HH:MM" format
 * @returns Formatted date and time string (e.g., "Jul 30, 2024 at 2:30 PM")
 */
export const formatEventDateTime = (dateString: string, timeString: string): string => {
  const formattedDate = formatEventDate(dateString);
  const formattedTime = formatEventTime(timeString);
  
  if (!formattedDate && !formattedTime) return '';
  if (!formattedTime) return formattedDate;
  if (!formattedDate) return formattedTime;
  
  return `${formattedDate} at ${formattedTime}`;
};

/**
 * Safely parses a date string from the database for use in components
 * @param dateString - Date string in "YYYY-MM-DD" format
 * @returns Date object representing local midnight of the specified date
 */
export const parseEventDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  // Parse as local date to prevent timezone shift
  return new Date(dateString + 'T00:00:00');
};

/**
 * Formats a date for storage in the database
 * @param date - Date object or date string
 * @returns Date string in "YYYY-MM-DD" format
 */
export const formatDateForStorage = (date: Date | string): string => {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Use local date components to avoid timezone issues
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Checks if a date is in the past (for event filtering)
 * @param dateString - Date string in "YYYY-MM-DD" format
 * @returns True if the date is before today
 */
export const isEventDateInPast = (dateString: string): boolean => {
  if (!dateString) return false;
  
  const eventDate = parseEventDate(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to midnight for accurate comparison
  
  return eventDate ? eventDate < today : false;
};

/**
 * Gets a relative date description (e.g., "Today", "Tomorrow", "Next Week")
 * @param dateString - Date string in "YYYY-MM-DD" format
 * @returns Relative date description or formatted date if not within common range
 */
export const getRelativeEventDate = (dateString: string): string => {
  if (!dateString) return '';
  
  const eventDate = parseEventDate(dateString);
  if (!eventDate) return '';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  
  if (eventDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (eventDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  } else if (eventDate < dayAfterTomorrow) {
    return eventDate.toLocaleDateString('en-US', { weekday: 'long' });
  }
  
  return formatEventDate(dateString);
};