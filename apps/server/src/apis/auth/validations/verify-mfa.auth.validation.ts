import { z } from "zod";

// Zod schema for runtime validation
export const verifyMfaSchema = z.object({
	body: z.object({
		code: z
			.string()
			.length(6, "TOTP code must be exactly 6 digits")
			.regex(/^\d{6}$/, "TOTP code must contain only digits"),
	}),
});

// Input type - inferred from Zod
export type VerifyMfaInput = z.infer<typeof verifyMfaSchema.shape.body>;

// Output type - manually defined for response structure
export interface VerifyMfaOutput {
	enabled: boolean;
	verifiedAt: string; // ISO 8601 timestamp
}
