/**
 * Patients API Client for useHely
 *
 * This client interfaces with the /api/patients/* endpoints on the server.
 */

import {
	type ApiError,
	authenticatedRequest,
	getStoredTokens,
	isTokenExpired,
	refreshTokens,
} from "./api-client";

// Re-export ApiError for backward compatibility
export type { ApiError } from "./api-client";

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "";

// Types
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type PatientType = "OPD" | "IPD";
export type PatientStatus = "ACTIVE" | "DISCHARGED" | "COMPLETED" | "INACTIVE";
export type BloodGroup =
	| "A+"
	| "A-"
	| "B+"
	| "B-"
	| "AB+"
	| "AB-"
	| "O+"
	| "O-";

export interface Address {
	street: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
}

export interface EmergencyContact {
	name: string;
	relationship: string;
	phone: string;
}

export interface AssignedDoctor {
	id: string;
	firstName: string;
	lastName: string;
	specialization?: string;
}

export interface PatientListItem {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
	dateOfBirth: string;
	gender: Gender;
	phone: string;
	patientType: PatientType;
	department: string;
	status: PatientStatus;
	createdAt: string;
}

export interface PatientDetails {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
	dateOfBirth: string;
	age: number;
	gender: Gender;
	bloodGroup?: BloodGroup;
	phone: string;
	email?: string;
	address: Address;
	emergencyContact: EmergencyContact;
	patientType: PatientType;
	department?: string;
	assignedDoctor?: AssignedDoctor;
	photoUrl?: string;
	status: PatientStatus;
	createdAt: string;
	updatedAt: string;
}

export interface ListPatientsParams {
	page?: number;
	limit?: number;
	patientType?: PatientType;
	department?: string;
	assignedDoctor?: string;
	status?: PatientStatus;
	startDate?: string;
	endDate?: string;
	search?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface ListPatientsResponse {
	data: PatientListItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface RegisterPatientInput {
	firstName: string;
	lastName: string;
	dateOfBirth: string;
	gender: Gender;
	bloodGroup?: BloodGroup;
	phone: string;
	email?: string;
	address: Address;
	emergencyContact: EmergencyContact;
	patientType: PatientType;
	department?: string;
	assignedDoctor?: string;
	photo?: string;
}

export interface RegisterPatientResponse {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
	dateOfBirth: string;
	gender: Gender;
	patientType: PatientType;
	status: PatientStatus;
	createdAt: string;
}

export interface UpdatePatientInput {
	phone?: string;
	email?: string;
	address?: Partial<Address>;
	emergencyContact?: Partial<EmergencyContact>;
	department?: string;
	assignedDoctor?: string;
	patientType?: PatientType;
	photo?: string;
}

export interface UpdatePatientResponse {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
	phone: string;
	email?: string;
	patientType: PatientType;
	department?: string;
	status: PatientStatus;
	updatedAt: string;
}

export interface SearchPatientsParams {
	q: string;
	type?: "id" | "name" | "phone" | "email";
	limit?: number;
}

export interface SearchPatientResult {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
	phone: string;
	email?: string;
	patientType: PatientType;
	status: PatientStatus;
}

export interface ExportPatientsParams {
	format: "csv" | "pdf";
	patientType?: PatientType;
	department?: string;
	status?: PatientStatus;
	startDate?: string;
	endDate?: string;
	fields?: string[];
}

// ===== Patient API Functions =====

/**
 * List patients with pagination and filters
 */
export async function listPatients(
	params: ListPatientsParams = {},
): Promise<ListPatientsResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.patientType) searchParams.set("patientType", params.patientType);
	if (params.department) searchParams.set("department", params.department);
	if (params.assignedDoctor)
		searchParams.set("assignedDoctor", params.assignedDoctor);
	if (params.status) searchParams.set("status", params.status);
	if (params.startDate) searchParams.set("startDate", params.startDate);
	if (params.endDate) searchParams.set("endDate", params.endDate);
	if (params.search) searchParams.set("search", params.search);
	if (params.sortBy) searchParams.set("sortBy", params.sortBy);
	if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

	const queryString = searchParams.toString();
	const endpoint = `/api/patients${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ListPatientsResponse["data"];
		pagination: ListPatientsResponse["pagination"];
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
	};
}

/**
 * Get patient by ID
 */
export async function getPatientById(id: string): Promise<PatientDetails> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: PatientDetails;
	}>(`/api/patients/${id}`);
	return response.data;
}

/**
 * Register a new patient
 */
export async function registerPatient(
	input: RegisterPatientInput,
): Promise<RegisterPatientResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: RegisterPatientResponse;
	}>("/api/patients", {
		method: "POST",
		body: JSON.stringify(input),
	});
	return response.data;
}

/**
 * Update patient by ID
 */
export async function updatePatient({
	id,
	data,
}: {
	id: string;
	data: UpdatePatientInput;
}): Promise<UpdatePatientResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: UpdatePatientResponse;
	}>(`/api/patients/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
	return response.data;
}

/**
 * Search patients by query
 */
export async function searchPatients(
	params: SearchPatientsParams,
): Promise<SearchPatientResult[]> {
	const searchParams = new URLSearchParams();

	searchParams.set("q", params.q);
	if (params.type) searchParams.set("type", params.type);
	if (params.limit) searchParams.set("limit", String(params.limit));

	const queryString = searchParams.toString();
	const endpoint = `/api/patients/search?${queryString}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: SearchPatientResult[];
	}>(endpoint);

	return response.data;
}

/**
 * Export patients to CSV or PDF
 */
export async function exportPatients(
	params: ExportPatientsParams,
): Promise<Blob> {
	const searchParams = new URLSearchParams();

	searchParams.set("format", params.format);
	if (params.patientType) searchParams.set("patientType", params.patientType);
	if (params.department) searchParams.set("department", params.department);
	if (params.status) searchParams.set("status", params.status);
	if (params.startDate) searchParams.set("startDate", params.startDate);
	if (params.endDate) searchParams.set("endDate", params.endDate);
	if (params.fields) searchParams.set("fields", params.fields.join(","));

	const queryString = searchParams.toString();
	const endpoint = `/api/patients/export?${queryString}`;

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

	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		const data = await response.json();
		throw {
			code: data.code || "UNKNOWN_ERROR",
			message: data.message || "Failed to export patients",
		} as ApiError;
	}

	return response.blob();
}

// Patients client object for convenience
export const patientsClient = {
	listPatients,
	getPatientById,
	registerPatient,
	updatePatient,
	searchPatients,
	exportPatients,
};

export default patientsClient;
