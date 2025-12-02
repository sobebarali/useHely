import { z } from "zod";

// Switch tenant request schema
export const switchTenantSchema = z.object({
	body: z.object({
		tenant_id: z.string().min(1, "Tenant ID is required"),
	}),
});

// Input type - inferred from Zod
export type SwitchTenantInput = z.infer<typeof switchTenantSchema.shape.body>;

// Output type - same as token output (issues new tokens)
export interface SwitchTenantOutput {
	access_token: string;
	token_type: "Bearer";
	expires_in: number;
	refresh_token: string;
	refresh_expires_in: number;
	tenant: {
		id: string;
		name: string;
	};
}
