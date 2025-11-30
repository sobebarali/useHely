/**
 * Inventory constants
 *
 * Central location for inventory-related configuration values.
 * Prevents magic numbers scattered throughout the codebase.
 */

/**
 * Stock status enum values
 */
export const StockStatus = {
	IN_STOCK: "IN_STOCK",
	LOW_STOCK: "LOW_STOCK",
	OUT_OF_STOCK: "OUT_OF_STOCK",
	EXPIRING: "EXPIRING",
} as const;

export type StockStatusType = (typeof StockStatus)[keyof typeof StockStatus];

/**
 * Adjustment reason enum values
 */
export const AdjustmentReason = {
	DAMAGE: "DAMAGE",
	EXPIRY: "EXPIRY",
	CORRECTION: "CORRECTION",
	LOSS: "LOSS",
	RETURN: "RETURN",
	OTHER: "OTHER",
} as const;

export type AdjustmentReasonType =
	(typeof AdjustmentReason)[keyof typeof AdjustmentReason];

/**
 * Inventory default values
 */
export const INVENTORY_DEFAULTS = {
	/** Default page size for list queries */
	PAGE_LIMIT: 50,
	/** Default number of days to check for expiring items */
	EXPIRY_ALERT_DAYS: 30,
	/** Default reorder level when not specified */
	REORDER_LEVEL: 10,
	/** Maximum items to return in recent transactions */
	RECENT_TRANSACTIONS_LIMIT: 10,
} as const;

/**
 * Invoice number validation pattern
 * Allows alphanumeric characters and hyphens, 1-50 characters
 */
export const INVOICE_NUMBER_PATTERN = /^[A-Za-z0-9-]{1,50}$/;

/**
 * Inventory error messages
 */
export const INVENTORY_ERRORS = {
	NOT_FOUND: "Inventory item not found",
	MEDICINE_NOT_FOUND: "Medicine not found",
	BATCH_NOT_FOUND: "Batch not found",
	STOCK_BELOW_ZERO: "Cannot reduce stock below zero",
	EXCEEDS_MAX_STOCK: (quantity: number, max: number) =>
		`Adding ${quantity} units would exceed maximum stock level of ${max}`,
	DUPLICATE_MEDICINE_CODE: "Medicine with this code already exists",
	INVALID_INVOICE_NUMBER:
		"Invoice number must be 1-50 alphanumeric characters or hyphens",
} as const;
