import { TransactionType } from "@hms/db";
import { z } from "zod";

// Zod schema for runtime validation
export const transactionsInventorySchema = z.object({
	query: z.object({
		page: z.coerce.number().int().positive().default(1).optional(),
		limit: z.coerce.number().int().positive().max(100).default(50).optional(),
		itemId: z.string().optional(),
		type: z
			.enum(Object.values(TransactionType) as [string, ...string[]])
			.optional(),
		startDate: z.string().optional(),
		endDate: z.string().optional(),
	}),
});

// Input type - inferred from Zod
export type TransactionsInventoryInput = z.infer<
	typeof transactionsInventorySchema.shape.query
>;

// Transaction output type
export interface TransactionItemOutput {
	id: string;
	inventoryId: string;
	medicineName: string;
	type: string;
	quantity: number;
	batchNumber: string | null;
	reference: string | null;
	reason: string | null;
	performedBy: {
		id: string;
		firstName: string;
		lastName: string;
	};
	performedAt: string;
}

// Output type - manually defined for response structure
export interface TransactionsInventoryOutput {
	data: TransactionItemOutput[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}
