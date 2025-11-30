/**
 * Generate report service
 *
 * Business logic for POST /api/reports/generate
 */

import crypto from "node:crypto";
import { ReportType } from "@hms/db";
import { BadRequestError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { REPORT_DEFAULTS, REPORT_METADATA } from "../reports.constants";
import {
	createReport,
	getAppointmentSummaryData,
	getDepartmentUtilizationData,
	getDoctorPerformanceData,
	getMedicineUsageData,
	getPatientDemographicsData,
	getPatientRegistrationData,
	getPrescriptionSummaryData,
	getStaffSummaryData,
	markReportFailed,
	updateReportWithData,
} from "../repositories/generate.reports.repository";
import type {
	GenerateReportInput,
	GenerateReportOutput,
	ReportData,
} from "../validations/generate.reports.validation";

const logger = createServiceLogger("generateReport");

/**
 * Validate date range is within allowed limits
 */
function validateDateRange(startDate: Date, endDate: Date): void {
	const diffDays =
		(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
	if (diffDays > REPORT_DEFAULTS.MAX_DATE_RANGE_DAYS) {
		throw new BadRequestError(
			`Date range cannot exceed ${REPORT_DEFAULTS.MAX_DATE_RANGE_DAYS} days`,
			"DATE_RANGE_TOO_LARGE",
		);
	}
	if (endDate < startDate) {
		throw new BadRequestError(
			"End date must be after start date",
			"INVALID_DATE_RANGE",
		);
	}
}

/**
 * Generate report data based on type
 */
async function generateReportData({
	tenantId,
	reportType,
	parameters,
}: {
	tenantId: string;
	reportType: string;
	parameters: Record<string, unknown>;
}): Promise<{ data: ReportData; summary: Record<string, unknown> }> {
	const startDate = parameters.startDate
		? new Date(parameters.startDate as string)
		: undefined;
	const endDate = parameters.endDate
		? new Date(parameters.endDate as string)
		: undefined;

	// Validate date range for reports that require it
	if (startDate && endDate) {
		validateDateRange(startDate, endDate);
	}

	switch (reportType) {
		case ReportType.PATIENT_REGISTRATION: {
			if (!startDate || !endDate) {
				throw new BadRequestError(
					"startDate and endDate are required",
					"MISSING_PARAMETERS",
				);
			}
			const data = await getPatientRegistrationData({
				tenantId,
				startDate,
				endDate,
				patientType: parameters.patientType as string | undefined,
				departmentId: parameters.departmentId as string | undefined,
				groupBy: parameters.groupBy as string | undefined,
			});
			return {
				data,
				summary: {
					totalRegistrations: data.totalRegistrations,
					opdCount: data.byType.opd,
					ipdCount: data.byType.ipd,
				},
			};
		}

		case ReportType.PATIENT_DEMOGRAPHICS: {
			const asOfDate = parameters.asOfDate
				? new Date(parameters.asOfDate as string)
				: new Date();
			const data = await getPatientDemographicsData({
				tenantId,
				asOfDate,
				patientType: parameters.patientType as string | undefined,
			});
			return {
				data,
				summary: {
					totalPatients: data.totalPatients,
					maleCount: data.byGender.male,
					femaleCount: data.byGender.female,
				},
			};
		}

		case ReportType.APPOINTMENT_SUMMARY: {
			if (!startDate || !endDate) {
				throw new BadRequestError(
					"startDate and endDate are required",
					"MISSING_PARAMETERS",
				);
			}
			const data = await getAppointmentSummaryData({
				tenantId,
				startDate,
				endDate,
				departmentId: parameters.departmentId as string | undefined,
				doctorId: parameters.doctorId as string | undefined,
				groupBy: parameters.groupBy as string | undefined,
			});
			return {
				data,
				summary: {
					totalAppointments: data.totalAppointments,
					averageWaitTime: data.averageWaitTime,
					noShowRate: data.noShowRate,
				},
			};
		}

		case ReportType.DOCTOR_PERFORMANCE: {
			if (!startDate || !endDate) {
				throw new BadRequestError(
					"startDate and endDate are required",
					"MISSING_PARAMETERS",
				);
			}
			const data = await getDoctorPerformanceData({
				tenantId,
				startDate,
				endDate,
				doctorId: parameters.doctorId as string | undefined,
				departmentId: parameters.departmentId as string | undefined,
			});
			return {
				data,
				summary: {
					totalDoctors: data.doctors.length,
					totalAppointments: data.doctors.reduce(
						(sum, d) => sum + d.totalAppointments,
						0,
					),
				},
			};
		}

		case ReportType.PRESCRIPTION_SUMMARY: {
			if (!startDate || !endDate) {
				throw new BadRequestError(
					"startDate and endDate are required",
					"MISSING_PARAMETERS",
				);
			}
			const data = await getPrescriptionSummaryData({
				tenantId,
				startDate,
				endDate,
				doctorId: parameters.doctorId as string | undefined,
				departmentId: parameters.departmentId as string | undefined,
			});
			return {
				data,
				summary: {
					totalPrescriptions: data.totalPrescriptions,
					averageMedicinesPerPrescription: data.averageMedicinesPerPrescription,
				},
			};
		}

		case ReportType.MEDICINE_USAGE: {
			if (!startDate || !endDate) {
				throw new BadRequestError(
					"startDate and endDate are required",
					"MISSING_PARAMETERS",
				);
			}
			const data = await getMedicineUsageData({
				tenantId,
				startDate,
				endDate,
				medicineId: parameters.medicineId as string | undefined,
			});
			return {
				data,
				summary: {
					totalDispensed: data.totalDispensed,
					uniqueMedicines: data.byMedicine.length,
				},
			};
		}

		case ReportType.DEPARTMENT_UTILIZATION: {
			if (!startDate || !endDate) {
				throw new BadRequestError(
					"startDate and endDate are required",
					"MISSING_PARAMETERS",
				);
			}
			const data = await getDepartmentUtilizationData({
				tenantId,
				startDate,
				endDate,
				departmentId: parameters.departmentId as string | undefined,
			});
			return {
				data,
				summary: {
					totalDepartments: data.departments.length,
					totalPatients: data.departments.reduce(
						(sum, d) => sum + d.totalPatients,
						0,
					),
				},
			};
		}

		case ReportType.STAFF_SUMMARY: {
			if (!startDate || !endDate) {
				throw new BadRequestError(
					"startDate and endDate are required",
					"MISSING_PARAMETERS",
				);
			}
			const data = await getStaffSummaryData({
				tenantId,
				startDate,
				endDate,
				departmentId: parameters.departmentId as string | undefined,
				role: parameters.role as string | undefined,
			});
			return {
				data,
				summary: {
					totalStaff: data.totalStaff,
					activeCount: data.byStatus.active,
					newHires: data.newHires,
				},
			};
		}

		default:
			throw new BadRequestError(
				`Unknown report type: ${reportType}`,
				"INVALID_REPORT_TYPE",
			);
	}
}

/**
 * Generate a new report
 */
export async function generateReportService({
	tenantId,
	reportType,
	parameters,
	format,
	staffId,
	staffName,
}: GenerateReportInput): Promise<GenerateReportOutput> {
	const reportId = `rpt_${crypto.randomUUID()}`;
	const metadata = REPORT_METADATA[reportType as keyof typeof REPORT_METADATA];

	if (!metadata) {
		throw new BadRequestError(
			`Unknown report type: ${reportType}`,
			"INVALID_REPORT_TYPE",
		);
	}

	logger.info(
		{ tenantId, reportId, reportType, parameters },
		"Generating report",
	);

	// Create report record in "generating" status
	await createReport({
		reportId,
		tenantId,
		reportType,
		category: metadata.category,
		format,
		parameters,
		generatedBy: { id: staffId, name: staffName },
	});

	try {
		// Generate report data
		const { data, summary } = await generateReportData({
			tenantId,
			reportType,
			parameters,
		});

		// Update report with generated data
		const report = await updateReportWithData({
			reportId,
			tenantId,
			data,
			summary,
		});

		logger.info(
			{ tenantId, reportId, reportType },
			"Report generated successfully",
		);

		return {
			reportId,
			reportType,
			generatedAt:
				report?.generatedAt?.toISOString() ?? new Date().toISOString(),
			parameters,
			data,
			summary,
		};
	} catch (error) {
		// Mark report as failed
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		await markReportFailed({ reportId, tenantId, errorMessage });

		logger.error(
			{ tenantId, reportId, reportType, error: errorMessage },
			"Report generation failed",
		);

		throw error;
	}
}
