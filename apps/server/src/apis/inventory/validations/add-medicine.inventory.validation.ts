import { MedicineCategory, MedicineType } from "@hms/db";
import { z } from "zod";
import { INVENTORY_DEFAULTS } from "../../../constants";

// Zod schema for runtime validation
export const addMedicineInventorySchema = z.object({
	body: z.object({
		name: z.string().min(1, "Medicine name is required"),
		genericName: z.string().min(1, "Generic name is required"),
		code: z.string().optional(),
		category: z.enum(Object.values(MedicineCategory) as [string, ...string[]], {
			message: "Invalid category",
		}),
		type: z.enum(Object.values(MedicineType) as [string, ...string[]], {
			message: "Invalid type",
		}),
		manufacturer: z.string().optional(),
		strength: z.string().optional(),
		unit: z.string().min(1, "Unit is required"),
		reorderLevel: z
			.number()
			.int()
			.min(1, "Reorder level must be at least 1")
			.default(INVENTORY_DEFAULTS.REORDER_LEVEL)
			.optional(),
		maxStock: z
			.number()
			.int()
			.positive("Max stock must be positive")
			.optional(),
		description: z.string().optional(),
	}),
});

// Input type - inferred from Zod
export type AddMedicineInventoryBody = z.infer<
	typeof addMedicineInventorySchema.shape.body
>;

// Output type - manually defined for response structure
export interface AddMedicineInventoryOutput {
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
