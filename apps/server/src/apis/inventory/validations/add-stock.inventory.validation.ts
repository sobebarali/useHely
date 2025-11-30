import { z } from "zod";
import {
	AdjustmentReason,
	INVENTORY_ERRORS,
	INVOICE_NUMBER_PATTERN,
} from "../../../constants";

// Re-export for backwards compatibility
export { AdjustmentReason };

// Zod schema for runtime validation
export const addStockInventorySchema = z.object({
	params: z.object({
		id: z.string().min(1, "Inventory ID is required"),
	}),
	body: z.object({
		quantity: z.number().int().positive("Quantity must be positive"),
		batchNumber: z.string().min(1, "Batch number is required"),
		expiryDate: z.string().min(1, "Expiry date is required"),
		purchasePrice: z.number().positive().optional(),
		supplier: z.string().optional(),
		invoiceNumber: z
			.string()
			.regex(INVOICE_NUMBER_PATTERN, INVENTORY_ERRORS.INVALID_INVOICE_NUMBER)
			.optional(),
		notes: z.string().optional(),
	}),
});

// Input types - inferred from Zod
export type AddStockInventoryParams = z.infer<
	typeof addStockInventorySchema.shape.params
>;

export type AddStockInventoryBody = z.infer<
	typeof addStockInventorySchema.shape.body
>;

// Batch output type
export interface BatchOutput {
	batchNumber: string;
	quantity: number;
	expiryDate: string;
	receivedDate: string;
	supplier: string | null;
}

// Output type - manually defined for response structure
export interface AddStockInventoryOutput {
	id: string;
	previousStock: number;
	addedQuantity: number;
	currentStock: number;
	batch: BatchOutput;
	transactionId: string;
}
