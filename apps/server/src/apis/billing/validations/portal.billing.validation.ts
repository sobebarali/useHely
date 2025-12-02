import { z } from "zod";

// Portal validation - for customer portal link
export const portalSchema = z.object({
	query: z.object({
		sendEmail: z.coerce.boolean().default(false),
	}),
});

export type PortalInput = z.infer<typeof portalSchema.shape.query>;

// Portal response
export interface PortalOutput {
	portalUrl: string;
	expiresAt: string;
}
