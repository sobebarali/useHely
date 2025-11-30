import { z } from "zod";

// Zod schema for runtime validation
export const deleteTemplateSchema = z.object({
	params: z.object({
		id: z.string().min(1, "Template ID is required"),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type DeleteTemplateParams = z.infer<
	typeof deleteTemplateSchema.shape.params
>;

// Output type - manually defined for response structure
export interface DeleteTemplateOutput {
	message: string;
}
