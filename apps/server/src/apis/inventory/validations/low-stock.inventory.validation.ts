import { z } from "zod";

// Zod schema for runtime validation
export const lowStockInventorySchema = z.object({
	query: z.object({
		limit: z.coerce.number().int().positive().max(100).default(50).optional(),
		category: z.string().optional(),
	}),
});

// Input type - inferred from Zod
export type LowStockInventoryInput = z.infer<
	typeof lowStockInventorySchema.shape.query
>;

// Low stock item output type
export interface LowStockItemOutput {
	id: string;
	name: string;
	currentStock: number;
	reorderLevel: number;
	deficit: number;
	lastDispensed: string | null;
}

// Output type - manually defined for response structure
export interface LowStockInventoryOutput {
	items: LowStockItemOutput[];
	count: number;
}
