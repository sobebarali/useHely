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
export const createTemplateSchema = z.object({
	body: z.object({
		name: z.string().min(1, "Template name is required"),
		category: z.string().optional(),
		condition: z.string().optional(),
		medicines: z
			.array(templateMedicineSchema)
			.min(1, "At least one medicine is required"),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type CreateTemplateInput = z.infer<
	typeof createTemplateSchema.shape.body
>;

// Template medicine input type
export type TemplateMedicineInput = z.infer<typeof templateMedicineSchema>;

// Output type - manually defined for response structure
export interface CreateTemplateOutput {
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
	createdBy: {
		id: string;
		firstName: string;
		lastName: string;
	};
	createdAt: string;
}
