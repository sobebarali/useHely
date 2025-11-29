import { z } from "zod";

// Token type hints
export const TokenTypeHint = {
	ACCESS_TOKEN: "access_token",
	REFRESH_TOKEN: "refresh_token",
} as const;

// Zod schema for runtime validation
export const revokeTokenSchema = z.object({
	body: z.object({
		token: z.string().min(1, "Token is required"),
		token_type_hint: z
			.enum([TokenTypeHint.ACCESS_TOKEN, TokenTypeHint.REFRESH_TOKEN])
			.optional(),
	}),
});

// Input type - inferred from Zod
export type RevokeTokenInput = z.infer<typeof revokeTokenSchema.shape.body>;

// Output type - manually defined for response structure
export interface RevokeTokenOutput {
	revoked: boolean;
}
