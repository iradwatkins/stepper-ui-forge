/**
 * Utility functions for video timing in magazine articles
 */

/**
 * Convert seconds to MM:SS format
 */
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Convert MM:SS format to seconds
 */
export const parseTimeToSeconds = (timeString: string): number | null => {
  const match = timeString.match(/^(\d+):([0-5]?\d)$/);
  if (!match) return null;
  
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  return minutes * 60 + seconds;
};

/**
 * Extract video ID from YouTube URL
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
};

/**
 * Build YouTube embed URL with timing parameters
 */
export const buildYouTubeEmbedUrl = (videoId: string, startTime?: number, endTime?: number): string => {
  let embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const params = new URLSearchParams();
  
  if (startTime) {
    params.append('start', startTime.toString());
  }
  if (endTime) {
    params.append('end', endTime.toString());
  }
  
  if (params.toString()) {
    embedUrl += '?' + params.toString();
  }
  
  return embedUrl;
};

/**
 * Validate time input (must be non-negative integer)
 */
export const validateTimeInput = (timeString: string): boolean => {
  const time = parseInt(timeString, 10);
  return !isNaN(time) && time >= 0;
};

/**
 * Calculate video duration from start and end times
 */
export const calculateVideoDuration = (startTime?: number, endTime?: number): number => {
  if (!endTime) return 0;
  const start = startTime || 0;
  return Math.max(0, endTime - start);
};