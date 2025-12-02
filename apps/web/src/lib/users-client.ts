/**
 * Users API Client for useHely
 *
 * This client interfaces with the /api/users/* endpoints on the server.
 */

import { apiRequest, authenticatedRequest } from "./api-client";

// Re-export ApiError for backward compatibility
export type { ApiError } from "./api-client";

// Types
export interface UserRole {
	id: string;
	name: string;
	permissions?: string[];
}

export interface UserListItem {
	id: string;
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	department: string;
	roles: UserRole[];
	status: string;
	createdAt: string;
}

export interface UserDetails {
	id: string;
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	phone: string;
	department: string;
	specialization?: string;
	shift?: string;
	roles: UserRole[];
	status: string;
	lastLogin?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ListUsersParams {
	page?: number;
	limit?: number;
	department?: string;
	role?: string;
	status?: "ACTIVE" | "INACTIVE" | "PASSWORD_EXPIRED";
	search?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface ListUsersResponse {
	data: UserListItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CreateUserInput {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	department: string;
	roles: string[];
	specialization?: string;
	shift?: "MORNING" | "EVENING" | "NIGHT";
}

export interface CreateUserResponse {
	id: string;
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	department: string;
	roles: UserRole[];
	status: string;
	message: string;
}

export interface UpdateUserInput {
	firstName?: string;
	lastName?: string;
	phone?: string;
	department?: string;
	roles?: string[];
	specialization?: string;
	shift?: "MORNING" | "EVENING" | "NIGHT";
}

export interface UpdateUserResponse {
	id: string;
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	phone: string;
	department: string;
	specialization?: string;
	shift?: string;
	roles: UserRole[];
	status: string;
	updatedAt: string;
}

export interface DeactivateUserResponse {
	id: string;
	status: string;
	deactivatedAt: string;
}

export interface ForcePasswordChangeResponse {
	id: string;
	status: string;
	message: string;
}

export interface ChangePasswordInput {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

export interface ChangePasswordResponse {
	message: string;
}

export interface ForgotPasswordInput {
	email: string;
	tenant_id: string;
}

export interface ForgotPasswordResponse {
	message: string;
}

export interface ResetPasswordInput {
	token: string;
	newPassword: string;
	confirmPassword: string;
}

export interface ResetPasswordResponse {
	message: string;
}

// ===== Self-Service User Functions (require authentication) =====

/**
 * Change own password (authenticated user)
 */
export async function changePassword(
	input: ChangePasswordInput,
): Promise<ChangePasswordResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: ChangePasswordResponse;
	}>("/api/users/change-password", {
		method: "POST",
		body: JSON.stringify(input),
	});
	return response.data;
}

// ===== Public User Functions (no authentication required) =====

/**
 * Initiate password reset - sends reset email to user
 */
export async function forgotPassword(
	input: ForgotPasswordInput,
): Promise<ForgotPasswordResponse> {
	const response = await apiRequest<{
		success: boolean;
		data: ForgotPasswordResponse;
	}>("/api/users/forgot-password", {
		method: "POST",
		body: JSON.stringify(input),
	});
	return response.data;
}

/**
 * Complete password reset with token from email
 */
export async function resetPassword(
	input: ResetPasswordInput,
): Promise<ResetPasswordResponse> {
	const response = await apiRequest<{
		success: boolean;
		data: ResetPasswordResponse;
	}>("/api/users/reset-password", {
		method: "POST",
		body: JSON.stringify(input),
	});
	return response.data;
}

// ===== Protected User Functions (require authentication) =====

/**
 * List users with pagination and filters
 */
export async function listUsers(
	params: ListUsersParams = {},
): Promise<ListUsersResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.department) searchParams.set("department", params.department);
	if (params.role) searchParams.set("role", params.role);
	if (params.status) searchParams.set("status", params.status);
	if (params.search) searchParams.set("search", params.search);
	if (params.sortBy) searchParams.set("sortBy", params.sortBy);
	if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

	const queryString = searchParams.toString();
	const endpoint = `/api/users${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ListUsersResponse["data"];
		pagination: ListUsersResponse["pagination"];
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
	};
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<UserDetails> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: UserDetails;
	}>(`/api/users/${id}`);
	return response.data;
}

/**
 * Create a new user
 */
export async function createUser(
	input: CreateUserInput,
): Promise<CreateUserResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: CreateUserResponse;
	}>("/api/users", {
		method: "POST",
		body: JSON.stringify(input),
	});
	return response.data;
}

/**
 * Update user by ID
 */
export async function updateUser({
	id,
	data,
}: {
	id: string;
	data: UpdateUserInput;
}): Promise<UpdateUserResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: UpdateUserResponse;
	}>(`/api/users/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
	return response.data;
}

/**
 * Deactivate user by ID (soft delete)
 */
export async function deactivateUser(
	id: string,
): Promise<DeactivateUserResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: DeactivateUserResponse;
	}>(`/api/users/${id}`, {
		method: "DELETE",
	});
	return response.data;
}

/**
 * Force user to change password on next login
 */
export async function forcePasswordChange(
	id: string,
): Promise<ForcePasswordChangeResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: ForcePasswordChangeResponse;
	}>(`/api/users/${id}/force-password-change`, {
		method: "POST",
	});
	return response.data;
}

// Users client object for convenience
export const usersClient = {
	// Self-service
	changePassword,
	// Public
	forgotPassword,
	resetPassword,
	// Protected
	listUsers,
	getUserById,
	createUser,
	updateUser,
	deactivateUser,
	forcePasswordChange,
};

export default usersClient;
