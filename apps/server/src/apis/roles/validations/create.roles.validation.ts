import { z } from "zod";

// Zod schema for runtime validation
export const createRoleSchema = z.object({
	body: z.object({
		name: z
			.string()
			.min(1, "Role name is required")
			.max(50, "Role name too long"),
		description: z.string().max(255, "Description too long").optional(),
		permissions: z
			.array(z.string().regex(/^[A-Z_]+:[A-Z_]+$/, "Invalid permission format"))
			.min(1, "At least one permission is required"),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type CreateRoleInput = z.infer<typeof createRoleSchema.shape.body>;

// Output type - manually defined for response structure
export interface CreateRoleOutput {
	id: string;
	name: string;
	description?: string;
	permissions: string[];
	isSystem: boolean;
	isActive: boolean;
	tenantId: string;
	createdAt: string;
}
