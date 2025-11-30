import { z } from "zod";

// Template medicine sub-schema
const templateMedicineSchema = z.object({
	name: z.string().min(1, "Medicine name is required"),
	dosage: z.string().optional(),
	frequency: z.string().optional(),
	duration: z.string().optional(),
	route: z.string().optional(),
	instructions: z.string().optional(),
});

// Zod schema for runtime validation
export const updateTemplateSchema = z.object({
	params: z.object({
		id: z.string().min(1, "Template ID is required"),
	}),
	body: z.object({
		name: z.string().min(1).optional(),
		category: z.string().optional(),
		condition: z.string().optional(),
		medicines: z.array(templateMedicineSchema).min(1).optional(),
	}),
});

// Input types - inferred from Zod (single source of truth)
export type UpdateTemplateParams = z.infer<
	typeof updateTemplateSchema.shape.params
>;
export type UpdateTemplateInput = z.infer<
	typeof updateTemplateSchema.shape.body
>;

// Template medicine input type
export type TemplateMedicineInput = z.infer<typeof templateMedicineSchema>;

// Output type - manually defined for response structure
export interface UpdateTemplateOutput {
	id: string;
	name: string;
	category?: string;
	condition?: string;
	medicines: {
		id: string;
		name: string;
		dosage?: string;
		frequency?: string;
		duration?: string;
		route?: string;
		instructions?: string;
	}[];
	createdBy?: {
		id: string;
		firstName: string;
		lastName: string;
	};
	updatedAt: string;
}
