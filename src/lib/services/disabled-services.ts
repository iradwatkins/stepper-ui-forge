// Disabled complex services for production
export const CheckInAnalyticsService = null
export const OfflineStorageService = null  
export const TeamCommunicationService = null

// Seating Service is now available
export { seatingService as SeatingService } from './SeatingService';