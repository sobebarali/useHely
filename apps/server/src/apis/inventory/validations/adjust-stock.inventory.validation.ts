import { z } from "zod";
import { AdjustmentReason } from "../../../constants";

// Re-export for backwards compatibility
export { AdjustmentReason };

// Zod schema for runtime validation
export const adjustStockInventorySchema = z.object({
	params: z.object({
		id: z.string().min(1, "Inventory ID is required"),
	}),
	body: z.object({
		adjustment: z.number().int("Adjustment must be an integer"),
		reason: z.enum(Object.values(AdjustmentReason) as [string, ...string[]], {
			message: "Invalid adjustment reason",
		}),
		batchNumber: z.string().optional(),
		notes: z.string().optional(),
	}),
});

// Input types - inferred from Zod
export type AdjustStockInventoryParams = z.infer<
	typeof adjustStockInventorySchema.shape.params
>;

export type AdjustStockInventoryBody = z.infer<
	typeof adjustStockInventorySchema.shape.body
>;

// Output type - manually defined for response structure
export interface AdjustStockInventoryOutput {
	id: string;
	previousStock: number;
	adjustment: number;
	currentStock: number;
	reason: string;
	transactionId: string;
}
