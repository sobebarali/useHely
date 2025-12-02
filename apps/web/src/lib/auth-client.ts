/**
 * Custom Auth Client for useHely
 *
 * This client interfaces with the custom OAuth2 implementation
 * at /api/auth/* endpoints on the server.
 */

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "";

// Token storage keys
const ACCESS_TOKEN_KEY = "hms_access_token";
const REFRESH_TOKEN_KEY = "hms_refresh_token";
const TOKEN_EXPIRY_KEY = "hms_token_expiry";

// Types
export interface AuthTokens {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	refresh_expires_in: number;
}

// MFA Types
export interface MfaChallengeResponse {
	mfa_required: true;
	challenge_token: string;
	expires_in: number;
}

export interface MfaSetupResponse {
	secret: string;
	qrCodeDataUrl: string;
	backupCodes: string[];
}

export interface MfaVerifyResponse {
	enabled: boolean;
	verifiedAt: string;
}

export interface MfaDisableResponse {
	disabled: boolean;
	message: string;
}

// Union type for signIn response
export type SignInResponse = AuthTokens | MfaChallengeResponse;

// Type guard to check if response requires MFA
export function isMfaChallengeResponse(
	response: SignInResponse,
): response is MfaChallengeResponse {
	return "mfa_required" in response && response.mfa_required === true;
}

export interface AuthUser {
	id: string;
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	tenantId: string;
	department?: string;
	staffId?: string;
	roles: Array<{
		id: string;
		name: string;
		description?: string;
	}>;
	permissions: string[];
	hospital?: {
		id: string;
		name: string;
		status: string;
	};
	attributes?: {
		department?: string;
		specialization?: string;
		shift?: string;
	};
}

export interface Hospital {
	id: string;
	name: string;
	status: string;
	type: OrganizationType;
}

export type OrganizationType = "HOSPITAL" | "CLINIC" | "SOLO_PRACTICE";
export type PricingTier = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export interface HospitalDetails {
	id: string;
	tenantId: string;
	name: string;
	type?: OrganizationType;
	address: {
		street: string;
		city: string;
		state: string;
		postalCode: string;
		country: string;
	};
	contactEmail: string;
	contactPhone: string;
	licenseNumber?: string;
	status: string;
	pricingTier?: PricingTier;
	createdAt: string;
	updatedAt: string;
}

export interface RegisterHospitalInput {
	type?: OrganizationType;
	name: string;
	address: {
		street: string;
		city: string;
		state: string;
		postalCode: string;
		country: string;
	};
	contactEmail: string;
	contactPhone: string;
	licenseNumber?: string;
	adminEmail: string;
	adminPhone: string;
	pricingTier?: PricingTier;
}

export interface RegisterHospitalResponse {
	id: string;
	tenantId: string;
	name: string;
	type?: OrganizationType;
	status: string;
	adminUsername: string;
	message: string;
}

export interface VerifyHospitalResponse {
	id: string;
	status: string;
	message: string;
}

export interface UpdateHospitalInput {
	name?: string;
	address?: {
		street?: string;
		city?: string;
		state?: string;
		postalCode?: string;
		country?: string;
	};
	contactEmail?: string;
	contactPhone?: string;
}

export type HospitalStatus =
	| "PENDING"
	| "VERIFIED"
	| "ACTIVE"
	| "SUSPENDED"
	| "INACTIVE";

export interface UpdateHospitalStatusInput {
	status: HospitalStatus;
	reason?: string;
}

export interface UpdateHospitalStatusResponse {
	id: string;
	status: string;
	updatedAt: string;
}

export interface AuthError {
	code: string;
	message: string;
}

// Token management
function getStoredTokens(): {
	accessToken: string | null;
	refreshToken: string | null;
	expiry: number | null;
} {
	return {
		accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
		refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
		expiry: localStorage.getItem(TOKEN_EXPIRY_KEY)
			? Number(localStorage.getItem(TOKEN_EXPIRY_KEY))
			: null,
	};
}

function storeTokens(tokens: AuthTokens): void {
	localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
	localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
	localStorage.setItem(
		TOKEN_EXPIRY_KEY,
		String(Date.now() + tokens.expires_in * 1000),
	);
}

function clearTokens(): void {
	localStorage.removeItem(ACCESS_TOKEN_KEY);
	localStorage.removeItem(REFRESH_TOKEN_KEY);
	localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

function isTokenExpired(): boolean {
	const { expiry } = getStoredTokens();
	if (!expiry) return true;
	// Consider token expired 60 seconds before actual expiry
	return Date.now() >= expiry - 60000;
}

// API helpers
async function apiRequest<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw {
			code: data.code || "UNKNOWN_ERROR",
			message: data.message || "An error occurred",
		} as AuthError;
	}

	return data;
}

async function authenticatedRequest<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	let { accessToken } = getStoredTokens();

	// Try to refresh if token is expired
	if (isTokenExpired()) {
		const refreshed = await refreshTokens();
		if (!refreshed) {
			throw { code: "UNAUTHORIZED", message: "Session expired" } as AuthError;
		}
		accessToken = getStoredTokens().accessToken;
	}

	if (!accessToken) {
		throw { code: "UNAUTHORIZED", message: "Not authenticated" } as AuthError;
	}

	return apiRequest<T>(endpoint, {
		...options,
		headers: {
			...options.headers,
			Authorization: `Bearer ${accessToken}`,
		},
	});
}

// Auth functions
export async function signIn({
	email,
	password,
	tenantId,
}: {
	email: string;
	password: string;
	tenantId: string;
}): Promise<SignInResponse> {
	const response = await apiRequest<SignInResponse>("/api/auth/token", {
		method: "POST",
		body: JSON.stringify({
			grant_type: "password",
			username: email,
			password,
			tenant_id: tenantId,
		}),
	});

	// Only store tokens if not MFA challenge
	if (!isMfaChallengeResponse(response)) {
		storeTokens(response);
	}

	return response;
}

// Submit MFA code during login
export async function submitMfaCode({
	challengeToken,
	code,
}: {
	challengeToken: string;
	code: string;
}): Promise<AuthTokens> {
	const tokens = await apiRequest<AuthTokens>("/api/auth/token", {
		method: "POST",
		body: JSON.stringify({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code,
		}),
	});

	storeTokens(tokens);
	return tokens;
}

export async function signOut(): Promise<void> {
	const { accessToken } = getStoredTokens();

	if (accessToken) {
		try {
			await apiRequest("/api/auth/revoke", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({
					token: accessToken,
					token_type_hint: "access_token",
				}),
			});
		} catch {
			// Ignore errors during logout
		}
	}

	clearTokens();
}

export async function refreshTokens(): Promise<boolean> {
	const { refreshToken } = getStoredTokens();

	if (!refreshToken) {
		return false;
	}

	try {
		const tokens = await apiRequest<AuthTokens>("/api/auth/token", {
			method: "POST",
			body: JSON.stringify({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
			}),
		});

		storeTokens(tokens);
		return true;
	} catch {
		clearTokens();
		return false;
	}
}

export async function getSession(): Promise<AuthUser | null> {
	const { accessToken } = getStoredTokens();

	if (!accessToken) {
		return null;
	}

	try {
		const response = await authenticatedRequest<{
			success: boolean;
			data: AuthUser;
		}>("/api/auth/me");
		return response.data;
	} catch {
		return null;
	}
}

export async function getHospitalsForEmail(email: string): Promise<Hospital[]> {
	try {
		const response = await apiRequest<{ success: boolean; data: Hospital[] }>(
			`/api/auth/hospitals?email=${encodeURIComponent(email)}`,
		);
		return response.data;
	} catch {
		return [];
	}
}

export function isAuthenticated(): boolean {
	const { accessToken } = getStoredTokens();
	return !!accessToken && !isTokenExpired();
}

export function getAccessToken(): string | null {
	return getStoredTokens().accessToken;
}

// MFA Management Functions
export async function enableMfa(): Promise<MfaSetupResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: MfaSetupResponse;
	}>("/api/auth/mfa/enable", {
		method: "POST",
	});
	return response.data;
}

export async function verifyMfa({
	code,
}: {
	code: string;
}): Promise<MfaVerifyResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: MfaVerifyResponse;
	}>("/api/auth/mfa/verify", {
		method: "POST",
		body: JSON.stringify({ code }),
	});
	return response.data;
}

export async function disableMfa(): Promise<MfaDisableResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: MfaDisableResponse;
	}>("/api/auth/mfa/disable", {
		method: "POST",
	});
	return response.data;
}

// Hospital API functions
export async function registerHospital(
	data: RegisterHospitalInput,
): Promise<RegisterHospitalResponse> {
	const response = await apiRequest<{
		success: boolean;
		data: RegisterHospitalResponse;
	}>("/api/hospitals", {
		method: "POST",
		body: JSON.stringify(data),
	});
	return response.data;
}

export async function verifyHospital({
	hospitalId,
	token,
}: {
	hospitalId: string;
	token: string;
}): Promise<VerifyHospitalResponse> {
	const response = await apiRequest<{
		success: boolean;
		data: VerifyHospitalResponse;
	}>(`/api/hospitals/${hospitalId}/verify`, {
		method: "POST",
		body: JSON.stringify({ token }),
	});
	return response.data;
}

export async function getHospital(
	hospitalId: string,
): Promise<HospitalDetails> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: HospitalDetails;
	}>(`/api/hospitals/${hospitalId}`);
	return response.data;
}

export async function updateHospital({
	hospitalId,
	data,
}: {
	hospitalId: string;
	data: UpdateHospitalInput;
}): Promise<HospitalDetails> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: HospitalDetails;
	}>(`/api/hospitals/${hospitalId}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
	return response.data;
}

export async function updateHospitalStatus({
	hospitalId,
	data,
}: {
	hospitalId: string;
	data: UpdateHospitalStatusInput;
}): Promise<UpdateHospitalStatusResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: UpdateHospitalStatusResponse;
	}>(`/api/hospitals/${hospitalId}/status`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
	return response.data;
}

// Auth client object for compatibility
export const authClient = {
	signIn,
	signOut,
	refreshTokens,
	getSession,
	getHospitalsForEmail,
	isAuthenticated,
	getAccessToken,
	clearTokens,
	// MFA functions
	submitMfaCode,
	enableMfa,
	verifyMfa,
	disableMfa,
	isMfaChallengeResponse,
	// Hospital functions
	registerHospital,
	verifyHospital,
	getHospital,
	updateHospital,
	updateHospitalStatus,
};

export default authClient;
