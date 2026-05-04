/**
 * Timezone utility functions for Bangladesh time (UTC+6)
 */

/**
 * Get current Bangladesh time as Date object
 */
export const getBangladeshTime = (): Date => {
  const now = new Date();
  // Use proper timezone conversion instead of manual offset
  return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Dhaka"}));
};

/**
 * Get current Bangladesh time as ISO string
 */
export const getBangladeshTimeISO = (): string => {
  const now = new Date();
  // Create a date in Bangladesh timezone and return as ISO
  const bdTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Dhaka"}));
  return bdTime.toISOString();
};

/**
 * Get current Bangladesh time as formatted string
 */
export const getBangladeshTimeFormatted = (): string => {
  return getBangladeshTime().toLocaleString('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

/**
 * Convert UTC time to Bangladesh time
 */
export const utcToBangladeshTime = (utcDate: Date): Date => {
  return new Date(utcDate.getTime() + (6 * 60 * 60 * 1000));
};

/**
 * Convert Bangladesh time to UTC
 */
export const bangladeshToUtcTime = (bdDate: Date): Date => {
  return new Date(bdDate.getTime() - (6 * 60 * 60 * 1000));
};
