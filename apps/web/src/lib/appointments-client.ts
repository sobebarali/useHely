/**
 * Appointments API Client
 *
 * This client interfaces with the /api/appointments/* endpoints on the server.
 */

import { authenticatedRequest } from "./api-client";

// Re-export ApiError for backward compatibility
export type { ApiError } from "./api-client";

// Types
export type AppointmentType =
	| "CONSULTATION"
	| "FOLLOW_UP"
	| "PROCEDURE"
	| "EMERGENCY"
	| "ROUTINE_CHECK";

export type AppointmentPriority = "NORMAL" | "URGENT" | "EMERGENCY";

export type AppointmentStatus =
	| "SCHEDULED"
	| "CONFIRMED"
	| "CHECKED_IN"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "CANCELLED"
	| "NO_SHOW";

export interface TimeSlot {
	start: string;
	end: string;
}

export interface PatientInfo {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
	phone?: string;
}

export interface DoctorInfo {
	id: string;
	firstName: string;
	lastName: string;
	specialization?: string;
}

export interface DepartmentInfo {
	id: string;
	name: string;
}

export interface AppointmentListItem {
	id: string;
	appointmentNumber: string;
	patient: PatientInfo;
	doctor: DoctorInfo;
	department: DepartmentInfo;
	date: string;
	timeSlot: TimeSlot;
	type: AppointmentType;
	priority: AppointmentPriority;
	status: AppointmentStatus;
	reason?: string;
	queueNumber?: number;
	createdAt: string;
}

export interface AppointmentDetails {
	id: string;
	appointmentNumber: string;
	patient: PatientInfo;
	doctor: DoctorInfo;
	department: DepartmentInfo;
	date: string;
	timeSlot: TimeSlot;
	type: AppointmentType;
	priority: AppointmentPriority;
	status: AppointmentStatus;
	reason?: string;
	notes?: string;
	queueNumber?: number;
	checkedInAt?: string;
	completedAt?: string;
	followUpRequired?: boolean;
	followUpDate?: string;
	cancelledAt?: string;
	cancelledBy?: string;
	cancellationReason?: string;
	createdBy?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ListAppointmentsParams {
	page?: number;
	limit?: number;
	patientId?: string;
	doctorId?: string;
	departmentId?: string;
	date?: string;
	startDate?: string;
	endDate?: string;
	status?: AppointmentStatus;
	type?: AppointmentType;
	sortBy?: "date" | "createdAt" | "status";
	sortOrder?: "asc" | "desc";
}

export interface ListAppointmentsResponse {
	data: AppointmentListItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CreateAppointmentInput {
	patientId: string;
	doctorId: string;
	departmentId: string;
	date: string;
	timeSlot: TimeSlot;
	type: AppointmentType;
	reason?: string;
	notes?: string;
	priority?: AppointmentPriority;
}

export interface CreateAppointmentResponse {
	id: string;
	appointmentNumber: string;
	patientId: string;
	doctorId: string;
	departmentId: string;
	date: string;
	timeSlot: TimeSlot;
	type: AppointmentType;
	priority: AppointmentPriority;
	status: AppointmentStatus;
	queueNumber?: number;
	createdAt: string;
}

export interface UpdateAppointmentInput {
	doctorId?: string;
	date?: string;
	timeSlot?: TimeSlot;
	type?: AppointmentType;
	reason?: string;
	notes?: string;
	priority?: AppointmentPriority;
}

export interface CancelAppointmentInput {
	reason?: string;
}

export interface CheckInResponse {
	id: string;
	appointmentNumber: string;
	status: AppointmentStatus;
	queueNumber: number;
	checkedInAt: string;
}

export interface CompleteAppointmentInput {
	notes?: string;
	followUpRequired?: boolean;
	followUpDate?: string;
}

export interface CompleteAppointmentResponse {
	id: string;
	appointmentNumber: string;
	status: AppointmentStatus;
	completedAt: string;
	followUpRequired?: boolean;
	followUpDate?: string;
}

export interface AvailabilitySlot {
	start: string;
	end: string;
	available: boolean;
}

export interface DoctorAvailabilityResponse {
	doctorId: string;
	date: string;
	slots: AvailabilitySlot[];
}

export interface QueueParams {
	doctorId?: string;
	departmentId?: string;
	date?: string;
}

export interface QueueItem {
	id: string;
	appointmentNumber: string;
	queueNumber: number;
	patient: PatientInfo;
	doctor: DoctorInfo;
	timeSlot: TimeSlot;
	type: AppointmentType;
	priority: AppointmentPriority;
	status: AppointmentStatus;
	checkedInAt: string;
}

export interface QueueResponse {
	data: QueueItem[];
	total: number;
}

// ===== Appointments API Functions =====

/**
 * List appointments with pagination and filters
 */
export async function listAppointments(
	params: ListAppointmentsParams = {},
): Promise<ListAppointmentsResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.patientId) searchParams.set("patientId", params.patientId);
	if (params.doctorId) searchParams.set("doctorId", params.doctorId);
	if (params.departmentId)
		searchParams.set("departmentId", params.departmentId);
	if (params.date) searchParams.set("date", params.date);
	if (params.startDate) searchParams.set("startDate", params.startDate);
	if (params.endDate) searchParams.set("endDate", params.endDate);
	if (params.status) searchParams.set("status", params.status);
	if (params.type) searchParams.set("type", params.type);
	if (params.sortBy) searchParams.set("sortBy", params.sortBy);
	if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

	const queryString = searchParams.toString();
	const endpoint = `/api/appointments${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ListAppointmentsResponse["data"];
		pagination: ListAppointmentsResponse["pagination"];
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
	};
}

/**
 * Get appointment by ID
 */
export async function getAppointmentById(
	id: string,
): Promise<AppointmentDetails> {
	return authenticatedRequest<AppointmentDetails>(`/api/appointments/${id}`);
}

/**
 * Create a new appointment
 */
export async function createAppointment(
	input: CreateAppointmentInput,
): Promise<CreateAppointmentResponse> {
	return authenticatedRequest<CreateAppointmentResponse>("/api/appointments", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

/**
 * Update an appointment
 */
export async function updateAppointment({
	id,
	data,
}: {
	id: string;
	data: UpdateAppointmentInput;
}): Promise<AppointmentDetails> {
	return authenticatedRequest<AppointmentDetails>(`/api/appointments/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment({
	id,
	reason,
}: {
	id: string;
	reason?: string;
}): Promise<AppointmentDetails> {
	return authenticatedRequest<AppointmentDetails>(`/api/appointments/${id}`, {
		method: "DELETE",
		body: reason ? JSON.stringify({ reason }) : undefined,
	});
}

/**
 * Check in a patient for their appointment
 */
export async function checkInAppointment(id: string): Promise<CheckInResponse> {
	return authenticatedRequest<CheckInResponse>(
		`/api/appointments/${id}/check-in`,
		{
			method: "POST",
		},
	);
}

/**
 * Complete an appointment
 */
export async function completeAppointment({
	id,
	data,
}: {
	id: string;
	data?: CompleteAppointmentInput;
}): Promise<CompleteAppointmentResponse> {
	return authenticatedRequest<CompleteAppointmentResponse>(
		`/api/appointments/${id}/complete`,
		{
			method: "POST",
			body: data ? JSON.stringify(data) : undefined,
		},
	);
}

/**
 * Get doctor availability for a specific date
 */
export async function getDoctorAvailability({
	doctorId,
	date,
}: {
	doctorId: string;
	date: string;
}): Promise<DoctorAvailabilityResponse> {
	const searchParams = new URLSearchParams();
	searchParams.set("date", date);

	return authenticatedRequest<DoctorAvailabilityResponse>(
		`/api/appointments/availability/${doctorId}?${searchParams.toString()}`,
	);
}

/**
 * Get the OPD queue
 */
export async function getQueue(
	params: QueueParams = {},
): Promise<QueueResponse> {
	const searchParams = new URLSearchParams();

	if (params.doctorId) searchParams.set("doctorId", params.doctorId);
	if (params.departmentId)
		searchParams.set("departmentId", params.departmentId);
	if (params.date) searchParams.set("date", params.date);

	const queryString = searchParams.toString();
	const endpoint = `/api/appointments/queue${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: QueueResponse["data"];
		total: number;
	}>(endpoint);

	return {
		data: response.data,
		total: response.total,
	};
}

// Appointments client object for convenience
export const appointmentsClient = {
	listAppointments,
	getAppointmentById,
	createAppointment,
	updateAppointment,
	cancelAppointment,
	checkInAppointment,
	completeAppointment,
	getDoctorAvailability,
	getQueue,
};

export default appointmentsClient;
