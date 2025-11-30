import { z } from "zod";

// Grant types supported
export const GrantType = {
	PASSWORD: "password",
	AUTHORIZATION_CODE: "authorization_code",
	REFRESH_TOKEN: "refresh_token",
	MFA: "mfa",
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

// MFA grant schema (for second step of MFA authentication)
const mfaGrantSchema = z.object({
	grant_type: z.literal(GrantType.MFA),
	challenge_token: z.string().min(1, "Challenge token is required"),
	code: z
		.string()
		.length(6, "TOTP code must be exactly 6 digits")
		.regex(/^\d{6}$/, "TOTP code must contain only digits"),
});

// Combined token request schema using discriminated union
export const tokenSchema = z.object({
	body: z.discriminatedUnion("grant_type", [
		passwordGrantSchema,
		authCodeGrantSchema,
		refreshTokenGrantSchema,
		mfaGrantSchema,
	]),
});

// Input types - inferred from Zod
export type TokenInput = z.infer<typeof tokenSchema.shape.body>;
export type PasswordGrantInput = z.infer<typeof passwordGrantSchema>;
export type AuthCodeGrantInput = z.infer<typeof authCodeGrantSchema>;
export type RefreshTokenGrantInput = z.infer<typeof refreshTokenGrantSchema>;
export type MfaGrantInput = z.infer<typeof mfaGrantSchema>;

// Output type - manually defined for response structure
export interface TokenOutput {
	access_token: string;
	token_type: "Bearer";
	expires_in: number;
	refresh_token: string;
	refresh_expires_in: number;
}

// MFA Challenge output - returned when MFA is required during password grant
export interface MfaChallengeOutput {
	mfa_required: true;
	challenge_token: string;
	expires_in: number; // Seconds until challenge expires (typically 5 minutes)
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
