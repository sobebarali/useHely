/**
 * Vitals API Client for useHely
 *
 * This client interfaces with the /api/vitals/* endpoints on the server.
 */

import { authenticatedRequest } from "./api-client";

// Re-export ApiError for backward compatibility
export type { ApiError } from "./api-client";

// ===== Type Definitions =====

// Unit types
export type TemperatureUnit = "CELSIUS" | "FAHRENHEIT";
export type WeightUnit = "KG" | "LB";
export type HeightUnit = "CM" | "IN";
export type BloodGlucoseUnit = "MG_DL" | "MMOL_L";
export type BloodGlucoseTiming = "FASTING" | "RANDOM" | "POSTPRANDIAL";
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// Vital parameter types for filtering/trending
export type VitalParameter =
	| "temperature"
	| "bloodPressure"
	| "heartRate"
	| "respiratoryRate"
	| "oxygenSaturation"
	| "weight"
	| "height"
	| "bmi"
	| "bloodGlucose"
	| "painLevel";

// Sub-types for vitals measurements
export interface Temperature {
	value: number;
	unit: TemperatureUnit;
}

export interface BloodPressure {
	systolic: number;
	diastolic: number;
}

export interface Weight {
	value: number;
	unit: WeightUnit;
}

export interface Height {
	value: number;
	unit: HeightUnit;
}

export interface BloodGlucose {
	value: number;
	unit: BloodGlucoseUnit;
	timing: BloodGlucoseTiming;
}

// Alert type
export interface VitalAlert {
	type: string;
	parameter: string;
	value: number;
	severity: AlertSeverity;
	normalRange?: {
		min: number;
		max: number;
	};
}

// Staff basic info
export interface StaffBasicInfo {
	id: string;
	firstName: string;
	lastName: string;
}

// Patient basic info
export interface PatientBasicInfo {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
}

// ===== Input Types =====

export interface RecordVitalsInput {
	patientId: string;
	appointmentId?: string;
	admissionId?: string;
	temperature?: Temperature;
	bloodPressure?: BloodPressure;
	heartRate?: number;
	respiratoryRate?: number;
	oxygenSaturation?: number;
	weight?: Weight;
	height?: Height;
	bloodGlucose?: BloodGlucose;
	painLevel?: number;
	notes?: string;
}

export interface UpdateVitalsInput {
	notes?: string;
	correctionReason: string;
}

export interface ListVitalsParams {
	page?: number;
	limit?: number;
	startDate?: string;
	endDate?: string;
	parameter?: VitalParameter;
	admissionId?: string;
}

export interface TrendsParams {
	parameter: VitalParameter;
	startDate?: string;
	endDate?: string;
	limit?: string;
}

// ===== Output Types =====

export interface RecordVitalsOutput {
	id: string;
	patientId: string;
	recordedBy: StaffBasicInfo;
	vitals: {
		temperature?: Temperature;
		bloodPressure?: BloodPressure;
		heartRate?: number;
		respiratoryRate?: number;
		oxygenSaturation?: number;
		weight?: Weight;
		height?: Height;
		bloodGlucose?: BloodGlucose;
		painLevel?: number;
	};
	bmi?: number;
	alerts: VitalAlert[];
	notes?: string;
	recordedAt: string;
}

export interface VitalsRecordOutput {
	id: string;
	patientId: string;
	temperature?: Temperature;
	bloodPressure?: BloodPressure;
	heartRate?: number;
	respiratoryRate?: number;
	oxygenSaturation?: number;
	weight?: Weight;
	height?: Height;
	bmi?: number;
	bloodGlucose?: BloodGlucose;
	painLevel?: number;
	notes?: string;
	alerts: VitalAlert[];
	recordedBy: StaffBasicInfo;
	recordedAt: string;
}

export interface LatestVitalsSummary {
	temperature?: { value: number; unit: string; recordedAt: string };
	bloodPressure?: { systolic: number; diastolic: number; recordedAt: string };
	heartRate?: { value: number; recordedAt: string };
	respiratoryRate?: { value: number; recordedAt: string };
	oxygenSaturation?: { value: number; recordedAt: string };
	weight?: { value: number; unit: string; recordedAt: string };
	height?: { value: number; unit: string; recordedAt: string };
	bloodGlucose?: {
		value: number;
		unit: string;
		timing: string;
		recordedAt: string;
	};
}

export interface ListVitalsOutput {
	data: VitalsRecordOutput[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	latestVitals: LatestVitalsSummary;
}

export interface GetVitalsByIdOutput {
	id: string;
	patient: PatientBasicInfo;
	appointment?: { id: string };
	admission?: { id: string };
	temperature?: Temperature;
	bloodPressure?: BloodPressure;
	heartRate?: number;
	respiratoryRate?: number;
	oxygenSaturation?: number;
	weight?: Weight;
	height?: Height;
	bmi?: number;
	bloodGlucose?: BloodGlucose;
	painLevel?: number;
	notes?: string;
	alerts: VitalAlert[];
	recordedBy: StaffBasicInfo;
	recordedAt: string;
}

export interface UpdateVitalsOutput {
	id: string;
	patientId: string;
	notes?: string;
	correctionReason: string;
	updatedAt: string;
}

export interface LatestVitalsOutput {
	patientId: string;
	temperature?: { value: number; unit: string; recordedAt: string };
	bloodPressure?: { systolic: number; diastolic: number; recordedAt: string };
	heartRate?: { value: number; recordedAt: string };
	respiratoryRate?: { value: number; recordedAt: string };
	oxygenSaturation?: { value: number; recordedAt: string };
	weight?: { value: number; unit: string; recordedAt: string };
	height?: { value: number; unit: string; recordedAt: string };
	bmi?: { value: number; recordedAt: string };
	bloodGlucose?: {
		value: number;
		unit: string;
		timing: string;
		recordedAt: string;
	};
	painLevel?: { value: number; recordedAt: string };
}

export interface TrendDataPoint {
	value: number;
	secondaryValue?: number; // For blood pressure diastolic
	recordedAt: string;
	vitalsId: string;
}

export interface TrendStatistics {
	min: number;
	max: number;
	avg: number;
	count: number;
	minSecondary?: number;
	maxSecondary?: number;
	avgSecondary?: number;
}

export interface TrendsVitalsOutput {
	patientId: string;
	parameter: string;
	unit?: string;
	dataPoints: TrendDataPoint[];
	statistics: TrendStatistics;
	dateRange: {
		start: string;
		end: string;
	};
}

// ===== Vitals API Functions =====

/**
 * Record new vitals for a patient
 */
export async function recordVitals(
	input: RecordVitalsInput,
): Promise<RecordVitalsOutput> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: RecordVitalsOutput;
	}>("/api/vitals", {
		method: "POST",
		body: JSON.stringify(input),
	});
	return response.data;
}

/**
 * List vitals for a patient with pagination and filters
 */
export async function listVitals(
	patientId: string,
	params: ListVitalsParams = {},
): Promise<ListVitalsOutput> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.startDate) searchParams.set("startDate", params.startDate);
	if (params.endDate) searchParams.set("endDate", params.endDate);
	if (params.parameter) searchParams.set("parameter", params.parameter);
	if (params.admissionId) searchParams.set("admissionId", params.admissionId);

	const queryString = searchParams.toString();
	const endpoint = `/api/vitals/patient/${patientId}${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: VitalsRecordOutput[];
		pagination: ListVitalsOutput["pagination"];
		latestVitals: LatestVitalsSummary;
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
		latestVitals: response.latestVitals,
	};
}

/**
 * Get vitals by ID
 */
export async function getVitalsById(id: string): Promise<GetVitalsByIdOutput> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: GetVitalsByIdOutput;
	}>(`/api/vitals/${id}`);
	return response.data;
}

/**
 * Update vitals (notes only)
 */
export async function updateVitals({
	id,
	data,
}: {
	id: string;
	data: UpdateVitalsInput;
}): Promise<UpdateVitalsOutput> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: UpdateVitalsOutput;
	}>(`/api/vitals/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
	return response.data;
}

/**
 * Get latest vitals for a patient
 */
export async function getLatestVitals(
	patientId: string,
): Promise<LatestVitalsOutput> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: LatestVitalsOutput;
	}>(`/api/vitals/patient/${patientId}/latest`);
	return response.data;
}

/**
 * Get vitals trends for a patient
 */
export async function getVitalsTrends(
	patientId: string,
	params: TrendsParams,
): Promise<TrendsVitalsOutput> {
	const searchParams = new URLSearchParams();

	searchParams.set("parameter", params.parameter);
	if (params.startDate) searchParams.set("startDate", params.startDate);
	if (params.endDate) searchParams.set("endDate", params.endDate);
	if (params.limit) searchParams.set("limit", params.limit);

	const queryString = searchParams.toString();
	const endpoint = `/api/vitals/patient/${patientId}/trends?${queryString}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: TrendsVitalsOutput;
	}>(endpoint);

	return response.data;
}

// Vitals client object for convenience
export const vitalsClient = {
	recordVitals,
	listVitals,
	getVitalsById,
	updateVitals,
	getLatestVitals,
	getVitalsTrends,
};

export default vitalsClient;
