/**
 * Departments API Client
 *
 * This client interfaces with the /api/departments/* endpoints on the server.
 */

import { authenticatedRequest } from "./api-client";

// Re-export ApiError for backward compatibility
export type { ApiError } from "./api-client";

// Types
export type DepartmentType =
	| "CLINICAL"
	| "DIAGNOSTIC"
	| "SUPPORT"
	| "ADMINISTRATIVE"
	| "EMERGENCY"
	| "PHARMACY";

export type DepartmentStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

// Operating hours for a single day
export interface DayOperatingHours {
	start: string; // HH:MM format
	end: string; // HH:MM format
}

// Weekly operating hours
export interface OperatingHours {
	monday?: DayOperatingHours;
	tuesday?: DayOperatingHours;
	wednesday?: DayOperatingHours;
	thursday?: DayOperatingHours;
	friday?: DayOperatingHours;
	saturday?: DayOperatingHours;
	sunday?: DayOperatingHours;
}

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

export interface DepartmentParent {
	id: string;
	name: string;
	code: string;
}

export interface DepartmentChild {
	id: string;
	name: string;
	code: string;
	type: DepartmentType;
}

export interface DepartmentDetails {
	id: string;
	name: string;
	code: string;
	type: DepartmentType;
	description?: string;
	head?: (DepartmentHead & { email?: string }) | null;
	parent?: DepartmentParent | null;
	children?: DepartmentChild[];
	location?: string;
	contactPhone?: string;
	contactEmail?: string;
	operatingHours?: OperatingHours;
	status: DepartmentStatus;
	staffCount?: number;
	createdAt: string;
	updatedAt: string;
}

// Create department input
export interface CreateDepartmentInput {
	name: string;
	code: string;
	description?: string;
	type: DepartmentType;
	headId?: string;
	parentId?: string;
	location?: string;
	contactPhone?: string;
	contactEmail?: string;
	operatingHours?: OperatingHours;
}

// Create department response
export interface CreateDepartmentResponse {
	id: string;
	name: string;
	code: string;
	type: DepartmentType;
	status: DepartmentStatus;
	createdAt: string;
}

// Update department input
export interface UpdateDepartmentInput {
	name?: string;
	description?: string;
	headId?: string | null;
	parentId?: string | null;
	location?: string;
	contactPhone?: string;
	contactEmail?: string;
	operatingHours?: OperatingHours;
}

// Update department response
export interface UpdateDepartmentResponse {
	id: string;
	name: string;
	code: string;
	description?: string;
	type: DepartmentType;
	headId?: string | null;
	parentId?: string | null;
	location?: string;
	contactPhone?: string;
	contactEmail?: string;
	status: DepartmentStatus;
	updatedAt: string;
}

// Delete department response
export interface DeleteDepartmentResponse {
	id: string;
	status: "INACTIVE";
	deactivatedAt: string;
}

// Department tree node
export interface DepartmentTreeNode {
	id: string;
	name: string;
	code: string;
	type: DepartmentType;
	children: DepartmentTreeNode[];
}

// Department tree response
export interface DepartmentTreeResponse {
	tree: DepartmentTreeNode[];
}

// Department staff item
export interface DepartmentStaffItem {
	id: string;
	name: string;
	email: string;
	role: string;
	specialization?: string;
	status: string;
	assignedAt: string;
}

// List department staff params
export interface ListDepartmentStaffParams {
	page?: number;
	limit?: number;
	role?: string;
	status?: "ACTIVE" | "INACTIVE";
}

// List department staff response
export interface ListDepartmentStaffResponse {
	data: DepartmentStaffItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// Assign staff response
export interface AssignStaffResponse {
	userId: string;
	departmentId: string;
	assignedAt: string;
}

// Remove staff response
export interface RemoveStaffResponse {
	message: string;
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

/**
 * Create a new department
 */
export async function createDepartment(
	input: CreateDepartmentInput,
): Promise<CreateDepartmentResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: CreateDepartmentResponse;
	}>("/api/departments", {
		method: "POST",
		body: JSON.stringify(input),
	});
	return response.data;
}

/**
 * Update department by ID
 */
export async function updateDepartment({
	id,
	data,
}: {
	id: string;
	data: UpdateDepartmentInput;
}): Promise<UpdateDepartmentResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: UpdateDepartmentResponse;
	}>(`/api/departments/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
	return response.data;
}

/**
 * Delete (deactivate) department by ID
 */
export async function deleteDepartment(
	id: string,
): Promise<DeleteDepartmentResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: DeleteDepartmentResponse;
	}>(`/api/departments/${id}`, {
		method: "DELETE",
	});
	return response.data;
}

/**
 * Get department hierarchy tree
 */
export async function getDepartmentTree(): Promise<DepartmentTreeResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: DepartmentTreeResponse;
	}>("/api/departments/tree");
	return response.data;
}

/**
 * Get staff in a department
 */
export async function getDepartmentStaff(
	id: string,
	params: ListDepartmentStaffParams = {},
): Promise<ListDepartmentStaffResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.role) searchParams.set("role", params.role);
	if (params.status) searchParams.set("status", params.status);

	const queryString = searchParams.toString();
	const endpoint = `/api/departments/${id}/staff${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ListDepartmentStaffResponse["data"];
		pagination: ListDepartmentStaffResponse["pagination"];
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
	};
}

/**
 * Assign staff to a department
 */
export async function assignStaffToDepartment({
	departmentId,
	userId,
}: {
	departmentId: string;
	userId: string;
}): Promise<AssignStaffResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: AssignStaffResponse;
	}>(`/api/departments/${departmentId}/staff`, {
		method: "POST",
		body: JSON.stringify({ userId }),
	});
	return response.data;
}

/**
 * Remove staff from a department
 */
export async function removeStaffFromDepartment({
	departmentId,
	userId,
}: {
	departmentId: string;
	userId: string;
}): Promise<RemoveStaffResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: RemoveStaffResponse;
	}>(`/api/departments/${departmentId}/staff/${userId}`, {
		method: "DELETE",
	});
	return response.data;
}

// Departments client object for convenience
export const departmentsClient = {
	listDepartments,
	getDepartmentById,
	createDepartment,
	updateDepartment,
	deleteDepartment,
	getDepartmentTree,
	getDepartmentStaff,
	assignStaffToDepartment,
	removeStaffFromDepartment,
};

export default departmentsClient;
