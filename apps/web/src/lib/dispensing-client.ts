/**
 * Dispensing API Client for HMS
 *
 * This client interfaces with the /api/dispensing/* endpoints on the server.
 */

import { authenticatedRequest } from "./api-client";

// Re-export ApiError for backward compatibility
export type { ApiError } from "./api-client";

// ===== Type Definitions =====

export type DispensingStatus =
	| "PENDING"
	| "DISPENSING"
	| "DISPENSED"
	| "COLLECTED"
	| "CANCELLED";

export type Priority = "URGENT" | "HIGH" | "NORMAL" | "LOW";

// Patient info
export interface DispensingPatient {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
}

// Doctor info
export interface DispensingDoctor {
	id: string;
	firstName: string;
	lastName: string;
}

// Pharmacist info
export interface DispensingPharmacist {
	id: string;
	firstName: string;
	lastName: string;
}

// Medicine in pending prescription
export interface PendingMedicine {
	id: string;
	name: string;
	dosage: string;
	quantity: number;
}

// Pending prescription item
export interface PendingPrescription {
	id: string;
	prescriptionId: string;
	patient: DispensingPatient;
	doctor: DispensingDoctor;
	medicines: PendingMedicine[];
	medicineCount: number;
	priority: Priority;
	createdAt: string;
	waitingTime: number;
}

// Summary for pending queue
export interface PendingSummary {
	totalPending: number;
	urgent: number;
	averageWaitTime: number;
}

// Medicine item during dispensing
export interface MedicineDispensingItem {
	id: string;
	name: string;
	dosage: string;
	prescribedQuantity: number;
	availableStock: number;
	status: string;
}

// Dispensed medicine status
export interface DispensedMedicineStatus {
	id: string;
	name: string;
	prescribedQuantity: number;
	dispensedQuantity: number;
	status: string;
}

// Completed medicine detail
export interface CompletedMedicineDetail {
	id: string;
	name: string;
	prescribedQuantity: number;
	dispensedQuantity: number;
	batchNumber?: string;
	expiryDate?: string;
	status: string;
	substituted: boolean;
	substituteNote?: string;
}

// History record
export interface HistoryRecord {
	id: string;
	prescriptionId: string;
	patient: DispensingPatient;
	pharmacist?: DispensingPharmacist;
	medicineCount: number;
	status: DispensingStatus;
	startedAt?: string;
	completedAt?: string;
	createdAt: string;
}

// Prescription detail in get-by-id
export interface DispensingPrescription {
	id: string;
	prescriptionId: string;
	diagnosis: string;
	notes?: string;
	createdAt: string;
}

// Medicine detail in get-by-id
export interface DispensingMedicineDetail {
	id: string;
	name: string;
	prescribedQuantity: number;
	dispensedQuantity: number;
	batchNumber?: string;
	expiryDate?: string;
	status: string;
	substituted: boolean;
	substituteNote?: string;
}

// ===== Input Types =====

export interface ListPendingParams {
	page?: number;
	limit?: number;
	priority?: Priority;
	departmentId?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface ListHistoryParams {
	page?: number;
	limit?: number;
	pharmacistId?: string;
	patientId?: string;
	startDate?: string;
	endDate?: string;
	status?: DispensingStatus;
}

export interface MedicineDispenseInput {
	medicineId: string;
	dispensedQuantity: number;
	batchNumber?: string;
	expiryDate?: string;
	substituted?: boolean;
	substituteNote?: string;
}

export interface DispenseMedicinesInput {
	medicines: MedicineDispenseInput[];
}

export interface CompleteDispensingInput {
	notes?: string;
	patientCounseled?: boolean;
}

export interface MarkUnavailableInput {
	medicineId: string;
	reason: string;
	alternativeSuggested?: string;
}

export interface ReturnToQueueInput {
	reason: string;
}

// ===== Output Types =====

export interface ListPendingResponse {
	data: PendingPrescription[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	summary: PendingSummary;
}

export interface StartDispensingResponse {
	id: string;
	prescriptionId: string;
	status: string;
	assignedTo: DispensingPharmacist;
	startedAt: string;
	medicines: MedicineDispensingItem[];
}

export interface DispenseMedicinesResponse {
	id: string;
	prescriptionId: string;
	medicines: DispensedMedicineStatus[];
	totalDispensed: number;
	totalPending: number;
}

export interface CompleteDispensingResponse {
	id: string;
	prescriptionId: string;
	status: string;
	completedAt: string;
	completedBy: DispensingPharmacist;
	medicines: CompletedMedicineDetail[];
}

export interface MarkUnavailableResponse {
	medicineId: string;
	status: string;
	reason: string;
	alternativeSuggested?: string;
}

export interface ReturnToQueueResponse {
	prescriptionId: string;
	status: string;
	returnedAt: string;
}

export interface GetDispensingByIdResponse {
	id: string;
	prescription: DispensingPrescription;
	patient: DispensingPatient;
	medicines: DispensingMedicineDetail[];
	status: string;
	assignedTo?: DispensingPharmacist;
	startedAt?: string;
	completedAt?: string;
	notes?: string;
}

export interface ListHistoryResponse {
	data: HistoryRecord[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// ===== Dispensing API Functions =====

/**
 * Get pending prescriptions awaiting dispensing
 */
export async function listPending(
	params: ListPendingParams = {},
): Promise<ListPendingResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.priority) searchParams.set("priority", params.priority);
	if (params.departmentId)
		searchParams.set("departmentId", params.departmentId);
	if (params.sortBy) searchParams.set("sortBy", params.sortBy);
	if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

	const queryString = searchParams.toString();
	const endpoint = `/api/dispensing/pending${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ListPendingResponse["data"];
		pagination: ListPendingResponse["pagination"];
		summary: ListPendingResponse["summary"];
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
		summary: response.summary,
	};
}

/**
 * Get dispensing history
 */
export async function listHistory(
	params: ListHistoryParams = {},
): Promise<ListHistoryResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.pharmacistId)
		searchParams.set("pharmacistId", params.pharmacistId);
	if (params.patientId) searchParams.set("patientId", params.patientId);
	if (params.startDate) searchParams.set("startDate", params.startDate);
	if (params.endDate) searchParams.set("endDate", params.endDate);
	if (params.status) searchParams.set("status", params.status);

	const queryString = searchParams.toString();
	const endpoint = `/api/dispensing/history${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ListHistoryResponse["data"];
		pagination: ListHistoryResponse["pagination"];
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
	};
}

/**
 * Get dispensing record by prescription ID
 */
export async function getById(
	prescriptionId: string,
): Promise<GetDispensingByIdResponse> {
	return authenticatedRequest<GetDispensingByIdResponse>(
		`/api/dispensing/${prescriptionId}`,
	);
}

/**
 * Start dispensing a prescription
 */
export async function startDispensing(
	prescriptionId: string,
): Promise<StartDispensingResponse> {
	return authenticatedRequest<StartDispensingResponse>(
		`/api/dispensing/${prescriptionId}/start`,
		{
			method: "POST",
		},
	);
}

/**
 * Dispense medicines for a prescription
 */
export async function dispenseMedicines(
	prescriptionId: string,
	input: DispenseMedicinesInput,
): Promise<DispenseMedicinesResponse> {
	return authenticatedRequest<DispenseMedicinesResponse>(
		`/api/dispensing/${prescriptionId}/dispense`,
		{
			method: "POST",
			body: JSON.stringify(input),
		},
	);
}

/**
 * Complete dispensing for a prescription
 */
export async function completeDispensing(
	prescriptionId: string,
	input: CompleteDispensingInput = {},
): Promise<CompleteDispensingResponse> {
	return authenticatedRequest<CompleteDispensingResponse>(
		`/api/dispensing/${prescriptionId}/complete`,
		{
			method: "POST",
			body: JSON.stringify(input),
		},
	);
}

/**
 * Mark medicine as unavailable
 */
export async function markUnavailable(
	prescriptionId: string,
	input: MarkUnavailableInput,
): Promise<MarkUnavailableResponse> {
	return authenticatedRequest<MarkUnavailableResponse>(
		`/api/dispensing/${prescriptionId}/unavailable`,
		{
			method: "POST",
			body: JSON.stringify(input),
		},
	);
}

/**
 * Return prescription to pending queue
 */
export async function returnToQueue(
	prescriptionId: string,
	input: ReturnToQueueInput,
): Promise<ReturnToQueueResponse> {
	return authenticatedRequest<ReturnToQueueResponse>(
		`/api/dispensing/${prescriptionId}/return`,
		{
			method: "POST",
			body: JSON.stringify(input),
		},
	);
}

// Export as a client object for consistency with other clients
export const dispensingClient = {
	listPending,
	listHistory,
	getById,
	startDispensing,
	dispenseMedicines,
	completeDispensing,
	markUnavailable,
	returnToQueue,
};

export default dispensingClient;
