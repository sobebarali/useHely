import { z } from "zod";

// Zod schema for runtime validation
export const getTemplateSchema = z.object({
	params: z.object({
		id: z.string().min(1, "Template ID is required"),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type GetTemplateParams = z.infer<typeof getTemplateSchema.shape.params>;

// Template medicine output
export interface TemplateMedicineOutput {
	id: string;
	name: string;
	dosage?: string;
	frequency?: string;
	duration?: string;
	route?: string;
	instructions?: string;
}

// Output type - manually defined for response structure
export interface GetTemplateOutput {
	id: string;
	name: string;
	category?: string;
	condition?: string;
	medicines: TemplateMedicineOutput[];
	createdBy?: {
		id: string;
		firstName: string;
		lastName: string;
	};
	isSystem: boolean;
	createdAt: string;
	updatedAt: string;
}
