/**
 * Generate report validation
 *
 * Schema and types for POST /api/reports/generate
 * Generates a report with specified parameters
 */

import { ReportFormat, ReportType } from "@hms/db";
import { z } from "zod";

/**
 * ISO date string validation helper
 */
const dateStringSchema = z
	.string()
	.refine((val) => !Number.isNaN(Date.parse(val)), {
		message: "Invalid date format. Use ISO 8601 format (e.g., 2024-01-01)",
	});

// Report parameters schema
const reportParametersSchema = z.object({
	startDate: dateStringSchema.optional(),
	endDate: dateStringSchema.optional(),
	departmentId: z.string().optional(),
	doctorId: z.string().optional(),
	patientType: z.enum(["OPD", "IPD"]).optional(),
	groupBy: z.enum(["day", "week", "month"]).optional(),
	asOfDate: dateStringSchema.optional(),
	medicineId: z.string().optional(),
	role: z.string().optional(),
});

export const generateReportSchema = z.object({
	body: z.object({
		reportType: z.enum(Object.values(ReportType) as [string, ...string[]]),
		parameters: reportParametersSchema,
		format: z
			.enum(Object.values(ReportFormat) as [string, ...string[]])
			.default("json"),
	}),
});

export type GenerateReportInput = {
	tenantId: string;
	staffId: string;
	staffName: string;
	reportType: string;
	parameters: z.infer<typeof reportParametersSchema>;
	format: string;
};

// Patient Registration Report Data
export type PatientRegistrationData = {
	totalRegistrations: number;
	byType: { opd: number; ipd: number };
	byDepartment: { departmentId: string; name: string; count: number }[];
	byGender: { male: number; female: number; other: number };
	byAgeGroup: { group: string; count: number }[];
	trend: { date: string; count: number }[];
};

// Patient Demographics Report Data
export type PatientDemographicsData = {
	totalPatients: number;
	byGender: { male: number; female: number; other: number };
	byAgeGroup: { group: string; count: number }[];
	byBloodGroup: Record<string, number>;
	byLocation: { location: string; count: number }[];
};

// Appointment Summary Report Data
export type AppointmentSummaryData = {
	totalAppointments: number;
	byStatus: Record<string, number>;
	byType: Record<string, number>;
	byDepartment: { departmentId: string; name: string; count: number }[];
	byDoctor: { doctorId: string; name: string; count: number }[];
	averageWaitTime: number;
	noShowRate: number;
	trend: { date: string; count: number }[];
};

// Doctor Performance Report Data
export type DoctorPerformanceData = {
	doctors: {
		doctorId: string;
		doctorName: string;
		department: string;
		totalAppointments: number;
		completedAppointments: number;
		averageConsultationTime: number;
		patientsSeen: number;
		prescriptionsIssued: number;
		followUpRate: number;
	}[];
};

// Prescription Summary Report Data
export type PrescriptionSummaryData = {
	totalPrescriptions: number;
	byDoctor: { doctorId: string; name: string; count: number }[];
	byDepartment: { departmentId: string; name: string; count: number }[];
	byStatus: Record<string, number>;
	averageMedicinesPerPrescription: number;
	topMedicines: { medicineId: string; name: string; count: number }[];
	trend: { date: string; count: number }[];
};

// Medicine Usage Report Data
export type MedicineUsageData = {
	totalDispensed: number;
	byMedicine: { medicineId: string; name: string; quantity: number }[];
	byDepartment: { departmentId: string; name: string; quantity: number }[];
	trend: { date: string; quantity: number }[];
};

// Department Utilization Report Data
export type DepartmentUtilizationData = {
	departments: {
		departmentId: string;
		departmentName: string;
		totalPatients: number;
		totalAppointments: number;
		averageWaitTime: number;
		staffUtilization: number;
		peakHours: number[];
	}[];
};

// Staff Summary Report Data
export type StaffSummaryData = {
	totalStaff: number;
	byRole: { role: string; count: number }[];
	byDepartment: { departmentId: string; name: string; count: number }[];
	byStatus: { active: number; inactive: number };
	newHires: number;
	departures: number;
};

// Union type for all report data
export type ReportData =
	| PatientRegistrationData
	| PatientDemographicsData
	| AppointmentSummaryData
	| DoctorPerformanceData
	| PrescriptionSummaryData
	| MedicineUsageData
	| DepartmentUtilizationData
	| StaffSummaryData;

export type GenerateReportOutput = {
	reportId: string;
	reportType: string;
	generatedAt: string;
	parameters: Record<string, unknown>;
	data: ReportData;
	summary: Record<string, unknown>;
};
