import { z } from "zod";

// Zod schema for runtime validation (used internally, not for HTTP requests)
export const provisionTenantSchema = z.object({
	tenantId: z.string().uuid(),
	hospitalName: z.string().min(1),
	adminEmail: z.string().email(),
	adminPhone: z.string().min(1),
	adminName: z.string().optional(),
});

// Input type - inferred from Zod (single source of truth)
export type ProvisionTenantInput = z.infer<typeof provisionTenantSchema>;

// Output type - manually defined for response structure
export interface ProvisionTenantOutput {
	success: boolean;
	adminCreated: boolean;
	rolesSeeded: boolean;
	departmentCreated: boolean;
	message: string;
}
