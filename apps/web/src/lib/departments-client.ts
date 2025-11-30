/**
 * Departments API Client
 *
 * This client interfaces with the /api/departments/* endpoints on the server.
 */

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "";

// Token storage keys
const ACCESS_TOKEN_KEY = "hms_access_token";
const REFRESH_TOKEN_KEY = "hms_refresh_token";
const TOKEN_EXPIRY_KEY = "hms_token_expiry";

// Types
export type DepartmentType =
	| "CLINICAL"
	| "DIAGNOSTIC"
	| "SUPPORT"
	| "ADMINISTRATIVE"
	| "EMERGENCY";

export type DepartmentStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface DepartmentHead {
	id: string;
	name: string;
}

export interface DepartmentListItem {
	id: string;
	name: string;
	code: string;
	type: DepartmentType;
	head?: DepartmentHead | null;
	location?: string;
	status: DepartmentStatus;
	staffCount?: number;
}

export interface DepartmentDetails {
	id: string;
	name: string;
	code: string;
	type: DepartmentType;
	description?: string;
	head?: DepartmentHead | null;
	parentId?: string;
	location?: string;
	contactPhone?: string;
	contactEmail?: string;
	operatingHours?: {
		start: string;
		end: string;
	};
	status: DepartmentStatus;
	staffCount?: number;
	createdAt: string;
	updatedAt: string;
}

export interface ListDepartmentsParams {
	page?: number;
	limit?: number;
	type?: DepartmentType;
	status?: DepartmentStatus;
	parentId?: string;
	search?: string;
	includeStaffCount?: boolean;
}

export interface ListDepartmentsResponse {
	data: DepartmentListItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface ApiError {
	code: string;
	message: string;
}

// Token management helpers
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

function isTokenExpired(): boolean {
	const { expiry } = getStoredTokens();
	if (!expiry) return true;
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
		} as ApiError;
	}

	return data;
}

async function refreshTokens(): Promise<boolean> {
	const { refreshToken } = getStoredTokens();

	if (!refreshToken) {
		return false;
	}

	try {
		const response = await apiRequest<{
			access_token: string;
			token_type: string;
			expires_in: number;
			refresh_token: string;
			refresh_expires_in: number;
		}>("/api/auth/token", {
			method: "POST",
			body: JSON.stringify({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
			}),
		});

		localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
		localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
		localStorage.setItem(
			TOKEN_EXPIRY_KEY,
			String(Date.now() + response.expires_in * 1000),
		);
		return true;
	} catch {
		localStorage.removeItem(ACCESS_TOKEN_KEY);
		localStorage.removeItem(REFRESH_TOKEN_KEY);
		localStorage.removeItem(TOKEN_EXPIRY_KEY);
		return false;
	}
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
			throw { code: "UNAUTHORIZED", message: "Session expired" } as ApiError;
		}
		accessToken = getStoredTokens().accessToken;
	}

	if (!accessToken) {
		throw { code: "UNAUTHORIZED", message: "Not authenticated" } as ApiError;
	}

	return apiRequest<T>(endpoint, {
		...options,
		headers: {
			...options.headers,
			Authorization: `Bearer ${accessToken}`,
		},
	});
}

// ===== Departments API Functions =====

/**
 * List departments with pagination and filters
 */
export async function listDepartments(
	params: ListDepartmentsParams = {},
): Promise<ListDepartmentsResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.type) searchParams.set("type", params.type);
	if (params.status) searchParams.set("status", params.status);
	if (params.parentId) searchParams.set("parentId", params.parentId);
	if (params.search) searchParams.set("search", params.search);
	if (params.includeStaffCount !== undefined)
		searchParams.set("includeStaffCount", String(params.includeStaffCount));

	const queryString = searchParams.toString();
	const endpoint = `/api/departments${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ListDepartmentsResponse["data"];
		pagination: ListDepartmentsResponse["pagination"];
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
	};
}

/**
 * Get department by ID
 */
export async function getDepartmentById(
	id: string,
): Promise<DepartmentDetails> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: DepartmentDetails;
	}>(`/api/departments/${id}`);
	return response.data;
}

// Departments client object for convenience
export const departmentsClient = {
	listDepartments,
	getDepartmentById,
};

export default departmentsClient;
