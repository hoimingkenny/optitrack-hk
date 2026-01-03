/**
 * Format date to YYYY-MM-DD for input fields
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Format date for display (e.g., "25 Dec 2025")
 */
export function formatDateForDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-HK', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}

/**
 * Format date to YYYYMMDD string
 */
export function formatDateToYYYYMMDD(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Format datetime for display (e.g., "25 Dec 2025, 14:30")
 */
export function formatDateTimeForDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-HK', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function getTodayString(): string {
  return formatDateForInput(new Date());
}

/**
 * Get current timestamp as ISO string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Check if date is in the future
 */
export function isFutureDate(date: string): boolean {
  return new Date(date) > new Date();
}

/**
 * Check if date is in the past
 */
export function isPastDate(date: string): boolean {
  return new Date(date) < new Date();
}

/**
 * Parse ISO date string to Date object
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Check if date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

/**
 * Get relative time string (e.g., "2 days ago", "in 5 days")
 */
export function getRelativeTimeString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}
