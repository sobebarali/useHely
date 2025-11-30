import { z } from "zod";

// Zod schema for runtime validation
export const getByIdInventorySchema = z.object({
	params: z.object({
		id: z.string().min(1, "Inventory ID is required"),
	}),
});

// Input type - inferred from Zod
export type GetByIdInventoryParams = z.infer<
	typeof getByIdInventorySchema.shape.params
>;

// Batch output type
export interface BatchOutput {
	batchNumber: string;
	quantity: number;
	expiryDate: string;
	receivedDate: string;
	supplier: string | null;
}

// Transaction output type
export interface TransactionOutput {
	type: string;
	quantity: number;
	reference: string | null;
	performedBy: {
		id: string;
		firstName: string;
		lastName: string;
	};
	performedAt: string;
}

// Medicine output type
export interface MedicineOutput {
	id: string;
	name: string;
	genericName: string;
	code: string;
	category: string;
	type: string;
	manufacturer: string | null;
	strength: string | null;
	unit: string;
	description: string | null;
}

// Output type - manually defined for response structure
export interface GetByIdInventoryOutput {
	id: string;
	medicine: MedicineOutput;
	currentStock: number;
	reorderLevel: number;
	maxStock: number | null;
	unit: string;
	location: string | null;
	batches: BatchOutput[];
	transactions: TransactionOutput[];
	status: string;
}
