/**
 * Reports constants
 *
 * Centralized configuration values for reports module
 */

import { ReportCategory, ReportFormat, ReportType } from "@hms/db";

/**
 * Default report configuration values
 */
export const REPORT_DEFAULTS = {
	/** Maximum allowed date range in days */
	MAX_DATE_RANGE_DAYS: 365,
	/** Number of days until report expires */
	EXPIRY_DAYS: 7,
	/** Default page size for history */
	DEFAULT_PAGE_SIZE: 20,
	/** Maximum page size for history */
	MAX_PAGE_SIZE: 100,
} as const;

/**
 * Report metadata for each report type
 * Contains display info, category, and required parameters
 */
export const REPORT_METADATA = {
	[ReportType.PATIENT_REGISTRATION]: {
		id: ReportType.PATIENT_REGISTRATION,
		name: "Patient Registration Report",
		description: "Statistics on patient registrations",
		category: ReportCategory.PATIENT,
		requiredPermission: "REPORT:READ",
		formats: [
			ReportFormat.JSON,
			ReportFormat.CSV,
			ReportFormat.PDF,
			ReportFormat.XLSX,
		],
		parameters: [
			{
				name: "startDate",
				type: "string",
				required: true,
				description: "Period start date",
			},
			{
				name: "endDate",
				type: "string",
				required: true,
				description: "Period end date",
			},
			{
				name: "patientType",
				type: "string",
				required: false,
				description: "OPD/IPD filter",
			},
			{
				name: "departmentId",
				type: "string",
				required: false,
				description: "Department filter",
			},
			{
				name: "groupBy",
				type: "string",
				required: false,
				description: "Grouping option: day, week, month",
			},
		],
	},
	[ReportType.PATIENT_DEMOGRAPHICS]: {
		id: ReportType.PATIENT_DEMOGRAPHICS,
		name: "Patient Demographics Report",
		description: "Patient demographic analysis",
		category: ReportCategory.PATIENT,
		requiredPermission: "REPORT:READ",
		formats: [
			ReportFormat.JSON,
			ReportFormat.CSV,
			ReportFormat.PDF,
			ReportFormat.XLSX,
		],
		parameters: [
			{
				name: "asOfDate",
				type: "string",
				required: false,
				description: "Point-in-time date (default: today)",
			},
			{
				name: "patientType",
				type: "string",
				required: false,
				description: "OPD/IPD filter",
			},
		],
	},
	[ReportType.APPOINTMENT_SUMMARY]: {
		id: ReportType.APPOINTMENT_SUMMARY,
		name: "Appointment Summary Report",
		description: "Appointment statistics and trends",
		category: ReportCategory.APPOINTMENT,
		requiredPermission: "REPORT:READ",
		formats: [
			ReportFormat.JSON,
			ReportFormat.CSV,
			ReportFormat.PDF,
			ReportFormat.XLSX,
		],
		parameters: [
			{
				name: "startDate",
				type: "string",
				required: true,
				description: "Period start date",
			},
			{
				name: "endDate",
				type: "string",
				required: true,
				description: "Period end date",
			},
			{
				name: "departmentId",
				type: "string",
				required: false,
				description: "Department filter",
			},
			{
				name: "doctorId",
				type: "string",
				required: false,
				description: "Doctor filter",
			},
			{
				name: "groupBy",
				type: "string",
				required: false,
				description: "Grouping option: day, week, month",
			},
		],
	},
	[ReportType.DOCTOR_PERFORMANCE]: {
		id: ReportType.DOCTOR_PERFORMANCE,
		name: "Doctor Performance Report",
		description: "Individual doctor performance metrics",
		category: ReportCategory.APPOINTMENT,
		requiredPermission: "REPORT:READ",
		formats: [
			ReportFormat.JSON,
			ReportFormat.CSV,
			ReportFormat.PDF,
			ReportFormat.XLSX,
		],
		parameters: [
			{
				name: "startDate",
				type: "string",
				required: true,
				description: "Period start date",
			},
			{
				name: "endDate",
				type: "string",
				required: true,
				description: "Period end date",
			},
			{
				name: "doctorId",
				type: "string",
				required: false,
				description: "Specific doctor filter",
			},
			{
				name: "departmentId",
				type: "string",
				required: false,
				description: "Department filter",
			},
		],
	},
	[ReportType.PRESCRIPTION_SUMMARY]: {
		id: ReportType.PRESCRIPTION_SUMMARY,
		name: "Prescription Summary Report",
		description: "Prescription statistics",
		category: ReportCategory.PRESCRIPTION,
		requiredPermission: "REPORT:READ",
		formats: [
			ReportFormat.JSON,
			ReportFormat.CSV,
			ReportFormat.PDF,
			ReportFormat.XLSX,
		],
		parameters: [
			{
				name: "startDate",
				type: "string",
				required: true,
				description: "Period start date",
			},
			{
				name: "endDate",
				type: "string",
				required: true,
				description: "Period end date",
			},
			{
				name: "doctorId",
				type: "string",
				required: false,
				description: "Doctor filter",
			},
			{
				name: "departmentId",
				type: "string",
				required: false,
				description: "Department filter",
			},
		],
	},
	[ReportType.MEDICINE_USAGE]: {
		id: ReportType.MEDICINE_USAGE,
		name: "Medicine Usage Report",
		description: "Medicine dispensing statistics",
		category: ReportCategory.PRESCRIPTION,
		requiredPermission: "REPORT:READ",
		formats: [
			ReportFormat.JSON,
			ReportFormat.CSV,
			ReportFormat.PDF,
			ReportFormat.XLSX,
		],
		parameters: [
			{
				name: "startDate",
				type: "string",
				required: true,
				description: "Period start date",
			},
			{
				name: "endDate",
				type: "string",
				required: true,
				description: "Period end date",
			},
			{
				name: "medicineId",
				type: "string",
				required: false,
				description: "Specific medicine filter",
			},
		],
	},
	[ReportType.DEPARTMENT_UTILIZATION]: {
		id: ReportType.DEPARTMENT_UTILIZATION,
		name: "Department Utilization Report",
		description: "Department workload and capacity",
		category: ReportCategory.OPERATIONAL,
		requiredPermission: "REPORT:READ",
		formats: [
			ReportFormat.JSON,
			ReportFormat.CSV,
			ReportFormat.PDF,
			ReportFormat.XLSX,
		],
		parameters: [
			{
				name: "startDate",
				type: "string",
				required: true,
				description: "Period start date",
			},
			{
				name: "endDate",
				type: "string",
				required: true,
				description: "Period end date",
			},
			{
				name: "departmentId",
				type: "string",
				required: false,
				description: "Department filter",
			},
		],
	},
	[ReportType.STAFF_SUMMARY]: {
		id: ReportType.STAFF_SUMMARY,
		name: "Staff Summary Report",
		description: "Staff statistics and attendance",
		category: ReportCategory.OPERATIONAL,
		requiredPermission: "REPORT:READ",
		formats: [
			ReportFormat.JSON,
			ReportFormat.CSV,
			ReportFormat.PDF,
			ReportFormat.XLSX,
		],
		parameters: [
			{
				name: "startDate",
				type: "string",
				required: true,
				description: "Period start date",
			},
			{
				name: "endDate",
				type: "string",
				required: true,
				description: "Period end date",
			},
			{
				name: "departmentId",
				type: "string",
				required: false,
				description: "Department filter",
			},
			{
				name: "role",
				type: "string",
				required: false,
				description: "Role filter",
			},
		],
	},
} as const;

export type ReportMetadata =
	(typeof REPORT_METADATA)[keyof typeof REPORT_METADATA];
