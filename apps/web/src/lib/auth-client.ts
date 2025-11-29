/**
 * Custom Auth Client for HMS
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
}): Promise<AuthTokens> {
	const tokens = await apiRequest<AuthTokens>("/api/auth/token", {
		method: "POST",
		body: JSON.stringify({
			grant_type: "password",
			username: email,
			password,
			tenant_id: tenantId,
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
};

export default authClient;
