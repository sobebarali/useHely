import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Sentinel value for "All" option in Select components.
 * Radix UI Select doesn't allow empty string values, so we use this instead.
 * When processing form data, treat this value as "no filter" / include all.
 */
export const SELECT_ALL_VALUE = "all";

/**
 * Sentinel value for "None" option in Select components.
 * Use this when the selection represents "no value" / unset (e.g., "None", "Not assigned").
 */
export const SELECT_NONE_VALUE = "none";

/**
 * Helper to convert SELECT_ALL_VALUE or SELECT_NONE_VALUE back to empty string for API calls
 */
export function normalizeSelectValue(value: string): string {
	return value === SELECT_ALL_VALUE || value === SELECT_NONE_VALUE ? "" : value;
}
