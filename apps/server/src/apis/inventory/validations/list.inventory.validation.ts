import { z } from "zod";

// Stock status enum values
export const StockStatus = {
	IN_STOCK: "IN_STOCK",
	LOW_STOCK: "LOW_STOCK",
	OUT_OF_STOCK: "OUT_OF_STOCK",
	EXPIRING: "EXPIRING",
} as const;

// Zod schema for runtime validation
export const listInventorySchema = z.object({
	query: z.object({
		page: z.coerce.number().int().positive().default(1).optional(),
		limit: z.coerce.number().int().positive().max(100).default(50).optional(),
		search: z.string().optional(),
		category: z.string().optional(),
		status: z
			.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "EXPIRING"])
			.optional(),
		expiringWithin: z.coerce.number().int().positive().optional(),
		sortBy: z.string().default("name").optional(),
		sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type ListInventoryInput = z.infer<
	typeof listInventorySchema.shape.query
>;

// Output types - manually defined for response structure
export interface InventoryItemSummary {
	id: string;
	medicineId: string;
	name: string;
	genericName: string;
	code: string;
	category: string;
	currentStock: number;
	reorderLevel: number;
	unit: string;
	status: string;
	lastRestocked: string | null;
	expiryDate: string | null;
}

export interface InventorySummary {
	totalItems: number;
	inStock: number;
	lowStock: number;
	outOfStock: number;
	expiringSoon: number;
}

export interface ListInventoryOutput {
	data: InventoryItemSummary[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	summary: InventorySummary;
}
