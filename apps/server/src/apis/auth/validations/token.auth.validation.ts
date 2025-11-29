import { z } from "zod";

// Grant types supported
export const GrantType = {
	PASSWORD: "password",
	AUTHORIZATION_CODE: "authorization_code",
	REFRESH_TOKEN: "refresh_token",
} as const;

// Password grant schema
const passwordGrantSchema = z.object({
	grant_type: z.literal(GrantType.PASSWORD),
	username: z.string().min(1, "Username is required"),
	password: z.string().min(1, "Password is required"),
	tenant_id: z.string().min(1, "Tenant ID is required"),
});

// Authorization code grant schema
const authCodeGrantSchema = z.object({
	grant_type: z.literal(GrantType.AUTHORIZATION_CODE),
	code: z.string().min(1, "Authorization code is required"),
	redirect_uri: z.string().url("Valid redirect URI is required"),
	client_id: z.string().min(1, "Client ID is required"),
});

// Refresh token grant schema
const refreshTokenGrantSchema = z.object({
	grant_type: z.literal(GrantType.REFRESH_TOKEN),
	refresh_token: z.string().min(1, "Refresh token is required"),
});

// Combined token request schema using discriminated union
export const tokenSchema = z.object({
	body: z.discriminatedUnion("grant_type", [
		passwordGrantSchema,
		authCodeGrantSchema,
		refreshTokenGrantSchema,
	]),
});

// Input types - inferred from Zod
export type TokenInput = z.infer<typeof tokenSchema.shape.body>;
export type PasswordGrantInput = z.infer<typeof passwordGrantSchema>;
export type AuthCodeGrantInput = z.infer<typeof authCodeGrantSchema>;
export type RefreshTokenGrantInput = z.infer<typeof refreshTokenGrantSchema>;

// Output type - manually defined for response structure
export interface TokenOutput {
	access_token: string;
	token_type: "Bearer";
	expires_in: number;
	refresh_token: string;
	refresh_expires_in: number;
}

// Token payload structure (JWT claims)
export interface TokenPayload {
	sub: string; // User ID
	tenantId: string;
	roles: string[];
	permissions: string[];
	iat: number;
	exp: number;
}
