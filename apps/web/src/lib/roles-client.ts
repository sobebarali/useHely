/**
 * Roles API Client
 *
 * This client interfaces with the /api/roles/* endpoints on the server.
 */

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "";

// Token storage keys
const ACCESS_TOKEN_KEY = "hms_access_token";
const REFRESH_TOKEN_KEY = "hms_refresh_token";
const TOKEN_EXPIRY_KEY = "hms_token_expiry";

// Types
export interface RoleListItem {
	id: string;
	name: string;
	description?: string;
	permissions: string[];
	isSystem: boolean;
	isActive: boolean;
	usersCount?: number;
	createdAt: string;
}

export interface RoleDetails {
	id: string;
	name: string;
	description?: string;
	permissions: string[];
	isSystem: boolean;
	isActive: boolean;
	usersCount: number;
	tenantId: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateRoleInput {
	name: string;
	description?: string;
	permissions: string[];
}

export interface CreateRoleOutput {
	id: string;
	name: string;
	description?: string;
	permissions: string[];
	isSystem: boolean;
	isActive: boolean;
	tenantId: string;
	createdAt: string;
}

export interface UpdateRoleInput {
	name?: string;
	description?: string;
	permissions?: string[];
}

export interface UpdateRoleOutput {
	id: string;
	name: string;
	description?: string;
	permissions: string[];
	isSystem: boolean;
	isActive: boolean;
	tenantId: string;
	createdAt: string;
	updatedAt: string;
}

export interface DeleteRoleOutput {
	id: string;
	name: string;
	isActive: boolean;
	deactivatedAt: string;
}

export interface ListRolesParams {
	page?: number;
	limit?: number;
	search?: string;
	isSystem?: boolean;
	isActive?: boolean;
	sortBy?: "name" | "createdAt";
	sortOrder?: "asc" | "desc";
}

export interface ListRolesResponse {
	data: RoleListItem[];
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

// ===== Roles API Functions =====

/**
 * List roles with pagination and filters
 */
export async function listRoles(
	params: ListRolesParams = {},
): Promise<ListRolesResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.search) searchParams.set("search", params.search);
	if (params.isSystem !== undefined)
		searchParams.set("isSystem", String(params.isSystem));
	if (params.isActive !== undefined)
		searchParams.set("isActive", String(params.isActive));
	if (params.sortBy) searchParams.set("sortBy", params.sortBy);
	if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

	const queryString = searchParams.toString();
	const endpoint = `/api/roles${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ListRolesResponse["data"];
		pagination: ListRolesResponse["pagination"];
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
	};
}

/**
 * Get role by ID
 */
export async function getRoleById(id: string): Promise<RoleDetails> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: RoleDetails;
	}>(`/api/roles/${id}`);
	return response.data;
}

/**
 * Create a new custom role
 */
export async function createRole(
	input: CreateRoleInput,
): Promise<CreateRoleOutput> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: CreateRoleOutput;
	}>("/api/roles", {
		method: "POST",
		body: JSON.stringify(input),
	});
	return response.data;
}

/**
 * Update a role
 */
export async function updateRole({
	id,
	data,
}: {
	id: string;
	data: UpdateRoleInput;
}): Promise<UpdateRoleOutput> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: UpdateRoleOutput;
	}>(`/api/roles/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
	return response.data;
}

/**
 * Delete (deactivate) a role
 */
export async function deleteRole(id: string): Promise<DeleteRoleOutput> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: DeleteRoleOutput;
	}>(`/api/roles/${id}`, {
		method: "DELETE",
	});
	return response.data;
}

// Roles client object for convenience
export const rolesClient = {
	listRoles,
	getRoleById,
	createRole,
	updateRole,
	deleteRole,
};

export default rolesClient;
