import { z } from "zod";

// Zod schema for runtime validation
export const listTemplatesSchema = z.object({
	query: z.object({
		category: z.string().optional(),
		search: z.string().optional(),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type ListTemplatesInput = z.infer<
	typeof listTemplatesSchema.shape.query
>;

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

// Template output type
export interface TemplateOutput {
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
}

// Output type - manually defined for response structure
export interface ListTemplatesOutput {
	data: TemplateOutput[];
	count: number;
}
