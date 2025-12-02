/**
 * Prescriptions API Client for useHely
 *
 * This client interfaces with the /api/prescriptions/* endpoints on the server.
 */

import { authenticatedRequest } from "./api-client";

// Re-export ApiError for backward compatibility
export type { ApiError } from "./api-client";

// Types
export type PrescriptionStatus =
	| "PENDING"
	| "DISPENSING"
	| "DISPENSED"
	| "COMPLETED"
	| "CANCELLED";

export interface Medicine {
	id: string;
	name: string;
	dosage: string;
	frequency: string;
	duration: string;
	instructions?: string;
	route?: string;
	quantity?: number;
	dispensed: boolean;
	dispensedQuantity: number;
}

export interface MedicineInput {
	name: string;
	dosage: string;
	frequency: string;
	duration: string;
	instructions?: string;
	route?: string;
	quantity?: number;
}

export interface PatientInfo {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
}

export interface PatientDetailInfo extends PatientInfo {
	dateOfBirth: string;
	gender: string;
	phone: string;
	email?: string;
}

export interface DoctorInfo {
	id: string;
	firstName: string;
	lastName: string;
	specialization?: string;
	departmentId?: string;
}

export interface PrescriptionListItem {
	id: string;
	prescriptionId: string;
	patient: PatientInfo;
	doctor: {
		id: string;
		firstName: string;
		lastName: string;
	};
	diagnosis: string;
	medicineCount: number;
	status: PrescriptionStatus;
	createdAt: string;
}

export interface PrescriptionDetails {
	id: string;
	prescriptionId: string;
	patient: PatientDetailInfo;
	doctor: DoctorInfo;
	diagnosis: string;
	notes?: string;
	medicines: Medicine[];
	status: PrescriptionStatus;
	followUpDate?: string;
	dispensedBy?: {
		id: string;
		firstName: string;
		lastName: string;
	};
	dispensedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ListPrescriptionsParams {
	page?: number;
	limit?: number;
	patientId?: string;
	doctorId?: string;
	status?: PrescriptionStatus;
	startDate?: string;
	endDate?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface ListPrescriptionsResponse {
	data: PrescriptionListItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CreatePrescriptionInput {
	patientId: string;
	diagnosis: string;
	notes?: string;
	medicines: MedicineInput[];
	followUpDate?: string;
	templateId?: string;
}

export interface CreatePrescriptionResponse {
	id: string;
	prescriptionId: string;
	patientId: string;
	patient: PatientInfo;
	doctorId: string;
	doctor: DoctorInfo;
	diagnosis: string;
	notes?: string;
	medicines: Medicine[];
	status: PrescriptionStatus;
	createdAt: string;
}

export interface UpdatePrescriptionInput {
	diagnosis?: string;
	notes?: string;
	medicines?: MedicineInput[];
	followUpDate?: string;
}

export interface UpdatePrescriptionResponse {
	id: string;
	prescriptionId: string;
	patientId: string;
	doctorId: string;
	diagnosis: string;
	notes?: string;
	medicines: Medicine[];
	status: PrescriptionStatus;
	followUpDate?: string;
	updatedAt: string;
}

export interface CancelPrescriptionInput {
	reason?: string;
}

export interface CancelPrescriptionResponse {
	id: string;
	prescriptionId: string;
	status: PrescriptionStatus;
	cancelledAt: string;
	cancelledBy: {
		id: string;
		firstName: string;
		lastName: string;
	};
	cancellationReason?: string;
}

// Template types
export interface TemplateMedicine {
	id: string;
	name: string;
	dosage?: string;
	frequency?: string;
	duration?: string;
	route?: string;
	instructions?: string;
}

export interface TemplateListItem {
	id: string;
	name: string;
	category?: string;
	condition?: string;
	medicines: TemplateMedicine[];
	createdBy?: {
		id: string;
		firstName: string;
		lastName: string;
	};
	isSystem: boolean;
}

export interface TemplateDetails extends TemplateListItem {
	createdAt: string;
	updatedAt: string;
}

export interface ListTemplatesParams {
	category?: string;
	search?: string;
}

export interface ListTemplatesResponse {
	data: TemplateListItem[];
	count: number;
}

export interface CreateTemplateInput {
	name: string;
	category?: string;
	condition?: string;
	medicines: Omit<TemplateMedicine, "id">[];
}

export interface CreateTemplateResponse {
	id: string;
	name: string;
	category?: string;
	condition?: string;
	medicines: TemplateMedicine[];
	createdBy: {
		id: string;
		firstName: string;
		lastName: string;
	};
	createdAt: string;
}

export interface UpdateTemplateInput {
	name?: string;
	category?: string;
	condition?: string;
	medicines?: Omit<TemplateMedicine, "id">[];
}

export interface UpdateTemplateResponse {
	id: string;
	name: string;
	category?: string;
	condition?: string;
	medicines: TemplateMedicine[];
	createdBy?: {
		id: string;
		firstName: string;
		lastName: string;
	};
	updatedAt: string;
}

export interface DeleteTemplateResponse {
	message: string;
}

// ===== Prescription API Functions =====

/**
 * List prescriptions with pagination and filters
 */
export async function listPrescriptions(
	params: ListPrescriptionsParams = {},
): Promise<ListPrescriptionsResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.patientId) searchParams.set("patientId", params.patientId);
	if (params.doctorId) searchParams.set("doctorId", params.doctorId);
	if (params.status) searchParams.set("status", params.status);
	if (params.startDate) searchParams.set("startDate", params.startDate);
	if (params.endDate) searchParams.set("endDate", params.endDate);
	if (params.sortBy) searchParams.set("sortBy", params.sortBy);
	if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

	const queryString = searchParams.toString();
	const endpoint = `/api/prescriptions${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ListPrescriptionsResponse["data"];
		pagination: ListPrescriptionsResponse["pagination"];
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
	};
}

/**
 * Get prescription by ID
 */
export async function getPrescriptionById(
	id: string,
): Promise<PrescriptionDetails> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: PrescriptionDetails;
	}>(`/api/prescriptions/${id}`);
	return response.data;
}

/**
 * Create a new prescription
 */
export async function createPrescription(
	input: CreatePrescriptionInput,
): Promise<CreatePrescriptionResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: CreatePrescriptionResponse;
	}>("/api/prescriptions", {
		method: "POST",
		body: JSON.stringify(input),
	});
	return response.data;
}

/**
 * Update prescription by ID
 */
export async function updatePrescription({
	id,
	data,
}: {
	id: string;
	data: UpdatePrescriptionInput;
}): Promise<UpdatePrescriptionResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: UpdatePrescriptionResponse;
	}>(`/api/prescriptions/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
	return response.data;
}

/**
 * Cancel prescription by ID
 */
export async function cancelPrescription({
	id,
	data,
}: {
	id: string;
	data: CancelPrescriptionInput;
}): Promise<CancelPrescriptionResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: CancelPrescriptionResponse;
	}>(`/api/prescriptions/${id}/cancel`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
	return response.data;
}

// ===== Template API Functions =====

/**
 * List prescription templates
 */
export async function listTemplates(
	params: ListTemplatesParams = {},
): Promise<ListTemplatesResponse> {
	const searchParams = new URLSearchParams();

	if (params.category) searchParams.set("category", params.category);
	if (params.search) searchParams.set("search", params.search);

	const queryString = searchParams.toString();
	const endpoint = `/api/prescriptions/templates${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ListTemplatesResponse["data"];
		count: number;
	}>(endpoint);

	return {
		data: response.data,
		count: response.count,
	};
}

/**
 * Get template by ID
 */
export async function getTemplateById(id: string): Promise<TemplateDetails> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: TemplateDetails;
	}>(`/api/prescriptions/templates/${id}`);
	return response.data;
}

/**
 * Create a new prescription template
 */
export async function createTemplate(
	input: CreateTemplateInput,
): Promise<CreateTemplateResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: CreateTemplateResponse;
	}>("/api/prescriptions/templates", {
		method: "POST",
		body: JSON.stringify(input),
	});
	return response.data;
}

/**
 * Update a prescription template
 */
export async function updateTemplate({
	id,
	data,
}: {
	id: string;
	data: UpdateTemplateInput;
}): Promise<UpdateTemplateResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: UpdateTemplateResponse;
	}>(`/api/prescriptions/templates/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
	return response.data;
}

/**
 * Delete a prescription template
 */
export async function deleteTemplate(
	id: string,
): Promise<DeleteTemplateResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: DeleteTemplateResponse;
	}>(`/api/prescriptions/templates/${id}`, {
		method: "DELETE",
	});
	return response.data;
}

// Prescriptions client object for convenience
export const prescriptionsClient = {
	listPrescriptions,
	getPrescriptionById,
	createPrescription,
	updatePrescription,
	cancelPrescription,
	listTemplates,
	getTemplateById,
	createTemplate,
	updateTemplate,
	deleteTemplate,
};

export default prescriptionsClient;
