/**
 * Roles API Client
 *
 * This client interfaces with the /api/roles/* endpoints on the server.
 */

import { authenticatedRequest } from "./api-client";

// Re-export ApiError for backward compatibility
export type { ApiError } from "./api-client";

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
	return authenticatedRequest<RoleDetails>(`/api/roles/${id}`);
}

/**
 * Create a new custom role
 */
export async function createRole(
	input: CreateRoleInput,
): Promise<CreateRoleOutput> {
	return authenticatedRequest<CreateRoleOutput>("/api/roles", {
		method: "POST",
		body: JSON.stringify(input),
	});
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
	return authenticatedRequest<UpdateRoleOutput>(`/api/roles/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
}

/**
 * Delete (deactivate) a role
 */
export async function deleteRole(id: string): Promise<DeleteRoleOutput> {
	return authenticatedRequest<DeleteRoleOutput>(`/api/roles/${id}`, {
		method: "DELETE",
	});
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
