import { addDays, isPast, parseISO } from 'date-fns';

/**
 * Check if an event is more than 7 days past its date
 * @param eventDate - The event date as a string or Date object
 * @returns true if the event is more than 7 days in the past
 */
export const isEventPast7Days = (eventDate: string | Date): boolean => {
  const date = typeof eventDate === 'string' ? parseISO(eventDate) : eventDate;
  const eventPlus7Days = addDays(date, 7);
  return isPast(eventPlus7Days);
};

/**
 * Check if an event has ended (is in the past)
 * @param eventDate - The event date as a string or Date object
 * @returns true if the event date is in the past
 */
export const isEventPast = (eventDate: string | Date): boolean => {
  const date = typeof eventDate === 'string' ? parseISO(eventDate) : eventDate;
  return isPast(date);
};

/**
 * Get a user-friendly message for past events
 * @param eventDate - The event date as a string or Date object
 * @returns A message indicating the event status
 */
export const getPastEventMessage = (eventDate: string | Date): string => {
  if (isEventPast7Days(eventDate)) {
    return 'This event has ended';
  } else if (isEventPast(eventDate)) {
    return 'This event recently ended';
  }
  return '';
};

/**
 * Check if event images should be hidden (more than 7 days past)
 * @param eventDate - The event date as a string or Date object
 * @param isOrganizer - Whether the current user is the event organizer
 * @returns true if images should be hidden
 */
export const shouldHideEventImages = (eventDate: string | Date, isOrganizer: boolean = false): boolean => {
  // Never hide images for organizers
  if (isOrganizer) {
    return false;
  }
  
  return isEventPast7Days(eventDate);
};