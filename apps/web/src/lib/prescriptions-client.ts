/**
 * Prescriptions API Client for useHely
 *
 * This client interfaces with the /api/prescriptions/* endpoints on the server.
 */

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "";

// Token storage keys
const ACCESS_TOKEN_KEY = "hms_access_token";
const REFRESH_TOKEN_KEY = "hms_refresh_token";
const TOKEN_EXPIRY_KEY = "hms_token_expiry";

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
