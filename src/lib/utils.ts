import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string consistently to avoid hydration mismatches.
 * Uses UTC to ensure server and client render the same value.
 */
export function formatDate(
  dateString: string,
  options: { includeYear?: boolean; format?: "short" | "long" } = {}
): string {
  const { includeYear = true, format = "short" } = options;
  const date = new Date(dateString);
  
  const months = format === "short" 
    ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const month = months[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  
  if (includeYear) {
    return `${month} ${day}, ${year}`;
  }
  return `${month} ${day}`;
}

/**
 * Format today's date consistently for instance naming.
 */
export function formatTodayDate(): string {
  const date = new Date();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}
