import { z } from "zod";

// Zod schema for runtime validation
export const listMedicinesInventorySchema = z.object({
	query: z.object({
		page: z.coerce.number().int().positive().default(1).optional(),
		limit: z.coerce.number().int().positive().max(100).default(50).optional(),
		search: z.string().optional(),
		category: z.string().optional(),
		type: z.string().optional(),
	}),
});

// Input type - inferred from Zod
export type ListMedicinesInventoryInput = z.infer<
	typeof listMedicinesInventorySchema.shape.query
>;

// Medicine output type
export interface MedicineItemOutput {
	id: string;
	name: string;
	genericName: string;
	code: string;
	category: string;
	type: string;
	manufacturer: string | null;
	strength: string | null;
	unit: string;
}

// Output type - manually defined for response structure
export interface ListMedicinesInventoryOutput {
	data: MedicineItemOutput[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}
