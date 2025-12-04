/**
 * Report Worker
 *
 * Processes report generation jobs
 */

import { ReportType } from "@hms/db";
import { type Job, Worker } from "bullmq";
import { createUtilLogger, logError, logSuccess } from "../../logger";
import { createRedisConnection } from "../../redis";
import {
	type GenerateReportJobData,
	REPORT_JOB_TYPES,
} from "../jobs/report.job";
import { QUEUE_NAMES } from "../queues";

const logger = createUtilLogger("reportWorker");

/**
 * Process report generation
 */
async function processReportGeneration(
	data: GenerateReportJobData,
): Promise<void> {
	const { reportId, tenantId, reportType, parameters } = data;

	logger.info(
		{ reportId, tenantId, reportType },
		"Processing report generation",
	);

	// Import dynamically to avoid circular dependencies
	const {
		updateReportWithData,
		markReportFailed,
		getPatientRegistrationData,
		getPatientDemographicsData,
		getAppointmentSummaryData,
		getDoctorPerformanceData,
		getPrescriptionSummaryData,
		getMedicineUsageData,
		getDepartmentUtilizationData,
		getStaffSummaryData,
	} = await import(
		"../../../apis/reports/repositories/generate.reports.repository"
	);
	const { BadRequestError } = await import("../../../errors");

	try {
		const startDate = parameters.startDate
			? new Date(parameters.startDate as string)
			: undefined;
		const endDate = parameters.endDate
			? new Date(parameters.endDate as string)
			: undefined;

		let reportData: Record<string, unknown>;
		let summary: Record<string, unknown>;

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
				reportData = data;
				summary = {
					totalRegistrations: data.totalRegistrations,
					opdCount: data.byType.opd,
					ipdCount: data.byType.ipd,
				};
				break;
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
				reportData = data;
				summary = {
					totalPatients: data.totalPatients,
					maleCount: data.byGender.male,
					femaleCount: data.byGender.female,
				};
				break;
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
				reportData = data;
				summary = {
					totalAppointments: data.totalAppointments,
					averageWaitTime: data.averageWaitTime,
					noShowRate: data.noShowRate,
				};
				break;
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
				reportData = data;
				summary = {
					totalDoctors: data.doctors.length,
					totalAppointments: data.doctors.reduce(
						(sum: number, d: { totalAppointments: number }) =>
							sum + d.totalAppointments,
						0,
					),
				};
				break;
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
				reportData = data;
				summary = {
					totalPrescriptions: data.totalPrescriptions,
					averageMedicinesPerPrescription: data.averageMedicinesPerPrescription,
				};
				break;
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
				reportData = data;
				summary = {
					totalDispensed: data.totalDispensed,
					uniqueMedicines: data.byMedicine.length,
				};
				break;
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
				reportData = data;
				summary = {
					totalDepartments: data.departments.length,
					totalPatients: data.departments.reduce(
						(sum: number, d: { totalPatients: number }) =>
							sum + d.totalPatients,
						0,
					),
				};
				break;
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
				reportData = data;
				summary = {
					totalStaff: data.totalStaff,
					activeCount: data.byStatus.active,
					newHires: data.newHires,
				};
				break;
			}

			default:
				throw new BadRequestError(
					`Unknown report type: ${reportType}`,
					"INVALID_REPORT_TYPE",
				);
		}

		// Update report with generated data
		await updateReportWithData({
			reportId,
			tenantId,
			data: reportData,
			summary,
		});

		logSuccess(logger, { reportId, reportType }, "Report generation completed");
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		await markReportFailed({ reportId, tenantId, errorMessage });
		throw error;
	}
}

/**
 * Process report jobs
 */
async function processReportJob(job: Job): Promise<void> {
	logger.debug({ jobId: job.id, type: job.name }, "Processing report job");

	switch (job.name) {
		case REPORT_JOB_TYPES.GENERATE_REPORT:
			await processReportGeneration(job.data as GenerateReportJobData);
			break;
		default:
			throw new Error(`Unknown report job type: ${job.name}`);
	}
}

/**
 * Create and start the report worker
 */
export function createReportWorker(): Worker {
	const connection = createRedisConnection();

	const worker = new Worker(QUEUE_NAMES.REPORT, processReportJob, {
		connection,
		concurrency: 3, // Allow some concurrency for reports
	});

	worker.on("completed", (job) => {
		logger.debug({ jobId: job.id }, "Report job completed");
	});

	worker.on("failed", (job, error) => {
		logError(logger, error, "Report job failed", { jobId: job?.id });
	});

	worker.on("error", (error) => {
		logError(logger, error, "Report worker error");
	});

	logger.info("Report worker started");
	return worker;
}
