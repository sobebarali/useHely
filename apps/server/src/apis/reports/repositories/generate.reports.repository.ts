/**
 * Generate reports repository
 *
 * Database operations for POST /api/reports/generate
 */

import {
	Appointment,
	Department,
	Dispensing,
	Patient,
	PatientType,
	Prescription,
	Report,
	ReportStatus,
	Staff,
} from "@hms/db";
import { REPORT_DEFAULTS } from "../reports.constants";

/**
 * Create a new report record
 */
export async function createReport({
	reportId,
	tenantId,
	reportType,
	category,
	format,
	parameters,
	generatedBy,
}: {
	reportId: string;
	tenantId: string;
	reportType: string;
	category: string;
	format: string;
	parameters: Record<string, unknown>;
	generatedBy: { id: string; name: string };
}) {
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + REPORT_DEFAULTS.EXPIRY_DAYS);

	const report = new Report({
		_id: reportId,
		tenantId,
		reportType,
		category,
		format,
		parameters,
		generatedBy,
		status: ReportStatus.GENERATING,
		expiresAt,
	});

	return report.save();
}

/**
 * Update report with generated data
 */
export async function updateReportWithData({
	reportId,
	tenantId,
	data,
	summary,
}: {
	reportId: string;
	tenantId: string;
	data: unknown;
	summary: Record<string, unknown>;
}) {
	return Report.findOneAndUpdate(
		{ _id: reportId, tenantId },
		{
			$set: {
				data,
				summary,
				status: ReportStatus.COMPLETED,
				generatedAt: new Date(),
			},
		},
		{ new: true },
	).lean();
}

/**
 * Mark report as failed
 */
export async function markReportFailed({
	reportId,
	tenantId,
	errorMessage,
}: {
	reportId: string;
	tenantId: string;
	errorMessage: string;
}) {
	return Report.findOneAndUpdate(
		{ _id: reportId, tenantId },
		{
			$set: {
				status: ReportStatus.FAILED,
				errorMessage,
			},
		},
		{ new: true },
	).lean();
}

/**
 * Helper to get full name from staff
 */
function getStaffName(staff: { firstName: string; lastName: string }): string {
	return `${staff.firstName} ${staff.lastName}`;
}

// ============================================
// Report Data Generation Functions
// ============================================

/**
 * Get patient registration data
 */
export async function getPatientRegistrationData({
	tenantId,
	startDate,
	endDate,
	patientType,
	departmentId,
	groupBy = "day",
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
	patientType?: string;
	departmentId?: string;
	groupBy?: string;
}) {
	const matchStage: Record<string, unknown> = {
		tenantId,
		createdAt: { $gte: startDate, $lte: endDate },
	};

	if (patientType) {
		matchStage.patientType = patientType;
	}
	if (departmentId) {
		matchStage.departmentId = departmentId;
	}

	// Get total registrations
	const totalRegistrations = await Patient.countDocuments(matchStage);

	// Get by type
	const byTypeResult = await Patient.aggregate([
		{ $match: matchStage },
		{ $group: { _id: "$patientType", count: { $sum: 1 } } },
	]);
	const byType = {
		opd: byTypeResult.find((r) => r._id === PatientType.OPD)?.count ?? 0,
		ipd: byTypeResult.find((r) => r._id === PatientType.IPD)?.count ?? 0,
	};

	// Get by department
	const byDepartmentResult = await Patient.aggregate([
		{ $match: matchStage },
		{ $group: { _id: "$departmentId", count: { $sum: 1 } } },
	]);

	// Get department names
	const departmentIds = byDepartmentResult.map((r) => r._id).filter(Boolean);
	const departments = await Department.find({
		_id: { $in: departmentIds },
		tenantId,
	}).lean();
	const deptMap = new Map(departments.map((d) => [d._id, d.name]));

	const byDepartment = byDepartmentResult
		.filter((r) => r._id)
		.map((r) => ({
			departmentId: r._id as string,
			name: deptMap.get(r._id) ?? "Unknown",
			count: r.count as number,
		}));

	// Get by gender
	const byGenderResult = await Patient.aggregate([
		{ $match: matchStage },
		{ $group: { _id: "$gender", count: { $sum: 1 } } },
	]);
	const byGender = {
		male: byGenderResult.find((r) => r._id === "MALE")?.count ?? 0,
		female: byGenderResult.find((r) => r._id === "FEMALE")?.count ?? 0,
		other: byGenderResult.find((r) => r._id === "OTHER")?.count ?? 0,
	};

	// Get by age group using aggregation
	const byAgeGroupResult = await Patient.aggregate([
		{ $match: { ...matchStage, dateOfBirth: { $exists: true } } },
		{
			$project: {
				age: {
					$divide: [
						{ $subtract: [new Date(), "$dateOfBirth"] },
						365.25 * 24 * 60 * 60 * 1000,
					],
				},
			},
		},
		{
			$bucket: {
				groupBy: "$age",
				boundaries: [0, 19, 36, 51, 66, 200],
				default: "unknown",
				output: { count: { $sum: 1 } },
			},
		},
	]);

	const ageGroupLabels: Record<string, string> = {
		"0": "0-18",
		"19": "19-35",
		"36": "36-50",
		"51": "51-65",
		"66": "65+",
	};
	const byAgeGroup = byAgeGroupResult
		.filter((r) => r._id !== "unknown")
		.map((r) => ({
			group: ageGroupLabels[String(r._id)] ?? String(r._id),
			count: r.count as number,
		}));

	// Get trend
	const dateFormat =
		groupBy === "month" ? "%Y-%m" : groupBy === "week" ? "%Y-W%V" : "%Y-%m-%d";
	const trendResult = await Patient.aggregate([
		{ $match: matchStage },
		{
			$group: {
				_id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
				count: { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	]);
	const trend = trendResult.map((r) => ({
		date: r._id as string,
		count: r.count as number,
	}));

	return {
		totalRegistrations,
		byType,
		byDepartment,
		byGender,
		byAgeGroup,
		trend,
	};
}

/**
 * Get patient demographics data
 */
export async function getPatientDemographicsData({
	tenantId,
	asOfDate,
	patientType,
}: {
	tenantId: string;
	asOfDate: Date;
	patientType?: string;
}) {
	const matchStage: Record<string, unknown> = {
		tenantId,
		createdAt: { $lte: asOfDate },
	};

	if (patientType) {
		matchStage.patientType = patientType;
	}

	const totalPatients = await Patient.countDocuments(matchStage);

	// By gender
	const byGenderResult = await Patient.aggregate([
		{ $match: matchStage },
		{ $group: { _id: "$gender", count: { $sum: 1 } } },
	]);
	const byGender = {
		male: byGenderResult.find((r) => r._id === "MALE")?.count ?? 0,
		female: byGenderResult.find((r) => r._id === "FEMALE")?.count ?? 0,
		other: byGenderResult.find((r) => r._id === "OTHER")?.count ?? 0,
	};

	// By age group using aggregation
	const byAgeGroupResult = await Patient.aggregate([
		{ $match: { ...matchStage, dateOfBirth: { $exists: true } } },
		{
			$project: {
				age: {
					$divide: [
						{ $subtract: [asOfDate, "$dateOfBirth"] },
						365.25 * 24 * 60 * 60 * 1000,
					],
				},
			},
		},
		{
			$bucket: {
				groupBy: "$age",
				boundaries: [0, 19, 36, 51, 66, 200],
				default: "unknown",
				output: { count: { $sum: 1 } },
			},
		},
	]);

	const ageGroupLabels: Record<string, string> = {
		"0": "0-18",
		"19": "19-35",
		"36": "36-50",
		"51": "51-65",
		"66": "65+",
	};
	const byAgeGroup = byAgeGroupResult
		.filter((r) => r._id !== "unknown")
		.map((r) => ({
			group: ageGroupLabels[String(r._id)] ?? String(r._id),
			count: r.count as number,
		}));

	// By blood group
	const byBloodGroupResult = await Patient.aggregate([
		{ $match: matchStage },
		{ $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
	]);
	const byBloodGroup: Record<string, number> = {};
	for (const r of byBloodGroupResult) {
		if (r._id) byBloodGroup[r._id as string] = r.count as number;
	}

	// By location (city/address)
	const byLocationResult = await Patient.aggregate([
		{ $match: matchStage },
		{ $group: { _id: "$address.city", count: { $sum: 1 } } },
		{ $sort: { count: -1 } },
		{ $limit: 10 },
	]);
	const byLocation = byLocationResult
		.filter((r) => r._id)
		.map((r) => ({
			location: r._id as string,
			count: r.count as number,
		}));

	return {
		totalPatients,
		byGender,
		byAgeGroup,
		byBloodGroup,
		byLocation,
	};
}

/**
 * Get appointment summary data
 */
export async function getAppointmentSummaryData({
	tenantId,
	startDate,
	endDate,
	departmentId,
	doctorId,
	groupBy = "day",
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
	departmentId?: string;
	doctorId?: string;
	groupBy?: string;
}) {
	const matchStage: Record<string, unknown> = {
		tenantId,
		scheduledAt: { $gte: startDate, $lte: endDate },
	};

	if (departmentId) matchStage.departmentId = departmentId;
	if (doctorId) matchStage.doctorId = doctorId;

	const totalAppointments = await Appointment.countDocuments(matchStage);

	// By status
	const byStatusResult = await Appointment.aggregate([
		{ $match: matchStage },
		{ $group: { _id: "$status", count: { $sum: 1 } } },
	]);
	const byStatus: Record<string, number> = {};
	for (const r of byStatusResult) {
		byStatus[r._id as string] = r.count as number;
	}

	// By type
	const byTypeResult = await Appointment.aggregate([
		{ $match: matchStage },
		{ $group: { _id: "$appointmentType", count: { $sum: 1 } } },
	]);
	const byType: Record<string, number> = {};
	for (const r of byTypeResult) {
		byType[r._id as string] = r.count as number;
	}

	// By department
	const byDeptResult = await Appointment.aggregate([
		{ $match: matchStage },
		{ $group: { _id: "$departmentId", count: { $sum: 1 } } },
	]);
	const deptIds = byDeptResult.map((r) => r._id).filter(Boolean);
	const depts = await Department.find({
		_id: { $in: deptIds },
		tenantId,
	}).lean();
	const deptMap = new Map(depts.map((d) => [d._id, d.name]));
	const byDepartment = byDeptResult
		.filter((r) => r._id)
		.map((r) => ({
			departmentId: r._id as string,
			name: deptMap.get(r._id) ?? "Unknown",
			count: r.count as number,
		}));

	// By doctor
	const byDoctorResult = await Appointment.aggregate([
		{ $match: matchStage },
		{ $group: { _id: "$doctorId", count: { $sum: 1 } } },
	]);
	const doctorIds = byDoctorResult.map((r) => r._id).filter(Boolean);
	const doctors = await Staff.find({
		_id: { $in: doctorIds },
		tenantId,
	}).lean();
	const doctorMap = new Map(doctors.map((d) => [d._id, getStaffName(d)]));
	const byDoctor = byDoctorResult
		.filter((r) => r._id)
		.map((r) => ({
			doctorId: r._id as string,
			name: doctorMap.get(r._id) ?? "Unknown",
			count: r.count as number,
		}));

	// Average wait time (mock for now)
	const averageWaitTime = 15;

	// No-show rate
	const noShowCount = byStatus.NO_SHOW ?? 0;
	const noShowRate =
		totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0;

	// Trend
	const dateFormat =
		groupBy === "month" ? "%Y-%m" : groupBy === "week" ? "%Y-W%V" : "%Y-%m-%d";
	const trendResult = await Appointment.aggregate([
		{ $match: matchStage },
		{
			$group: {
				_id: { $dateToString: { format: dateFormat, date: "$scheduledAt" } },
				count: { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	]);
	const trend = trendResult.map((r) => ({
		date: r._id as string,
		count: r.count as number,
	}));

	return {
		totalAppointments,
		byStatus,
		byType,
		byDepartment,
		byDoctor,
		averageWaitTime,
		noShowRate: Math.round(noShowRate * 100) / 100,
		trend,
	};
}

/**
 * Get doctor performance data
 */
export async function getDoctorPerformanceData({
	tenantId,
	startDate,
	endDate,
	doctorId,
	departmentId,
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
	doctorId?: string;
	departmentId?: string;
}) {
	const matchStage: Record<string, unknown> = {
		tenantId,
		scheduledAt: { $gte: startDate, $lte: endDate },
	};

	if (doctorId) matchStage.doctorId = doctorId;
	if (departmentId) matchStage.departmentId = departmentId;

	// Get appointments grouped by doctor
	const appointmentsByDoctor = await Appointment.aggregate([
		{ $match: matchStage },
		{
			$group: {
				_id: "$doctorId",
				totalAppointments: { $sum: 1 },
				completedAppointments: {
					$sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
				},
				uniquePatients: { $addToSet: "$patientId" },
			},
		},
	]);

	// Get prescriptions by doctor
	const prescriptionMatch: Record<string, unknown> = {
		tenantId,
		createdAt: { $gte: startDate, $lte: endDate },
	};
	if (doctorId) prescriptionMatch.doctorId = doctorId;

	const prescriptionsByDoctor = await Prescription.aggregate([
		{ $match: prescriptionMatch },
		{ $group: { _id: "$doctorId", count: { $sum: 1 } } },
	]);
	const prescriptionMap = new Map(
		prescriptionsByDoctor.map((p) => [p._id as string, p.count as number]),
	);

	// Get doctor info
	const doctorIdList = appointmentsByDoctor.map((a) => a._id).filter(Boolean);
	const doctorList = await Staff.find({
		_id: { $in: doctorIdList },
		tenantId,
	}).lean();
	const doctorInfoMap = new Map(
		doctorList.map((d) => [
			d._id,
			{ name: getStaffName(d), departmentId: d.departmentId },
		]),
	);

	// Get department names
	const deptIds = doctorList
		.map((d) => d.departmentId)
		.filter((id): id is string => Boolean(id));
	const depts = await Department.find({
		_id: { $in: deptIds },
		tenantId,
	}).lean();
	const deptMap = new Map(depts.map((d) => [d._id, d.name]));

	const doctorResults = appointmentsByDoctor
		.filter((a) => a._id)
		.map((a) => {
			const info = doctorInfoMap.get(a._id);
			const deptName = info?.departmentId
				? deptMap.get(info.departmentId)
				: null;

			return {
				doctorId: a._id as string,
				doctorName: info?.name ?? "Unknown",
				department: deptName ?? "Unknown",
				totalAppointments: a.totalAppointments as number,
				completedAppointments: a.completedAppointments as number,
				averageConsultationTime: 15, // Mock value
				patientsSeen: (a.uniquePatients as string[])?.length ?? 0,
				prescriptionsIssued: prescriptionMap.get(a._id as string) ?? 0,
				followUpRate: 0, // Would need more complex calculation
			};
		});

	return { doctors: doctorResults };
}

/**
 * Get prescription summary data
 */
export async function getPrescriptionSummaryData({
	tenantId,
	startDate,
	endDate,
	doctorId,
	departmentId,
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
	doctorId?: string;
	departmentId?: string;
}) {
	const matchStage: Record<string, unknown> = {
		tenantId,
		createdAt: { $gte: startDate, $lte: endDate },
	};

	if (doctorId) matchStage.doctorId = doctorId;

	const totalPrescriptions = await Prescription.countDocuments(matchStage);

	// By doctor
	const byDoctorResult = await Prescription.aggregate([
		{ $match: matchStage },
		{ $group: { _id: "$doctorId", count: { $sum: 1 } } },
	]);
	const doctorIds = byDoctorResult.map((r) => r._id).filter(Boolean);
	const doctors = await Staff.find({
		_id: { $in: doctorIds },
		tenantId,
	}).lean();
	const doctorMap = new Map(doctors.map((d) => [d._id, getStaffName(d)]));
	const byDoctor = byDoctorResult
		.filter((r) => r._id)
		.map((r) => ({
			doctorId: r._id as string,
			name: doctorMap.get(r._id) ?? "Unknown",
			count: r.count as number,
		}));

	// By department - using doctor's department
	const byDepartment: { departmentId: string; name: string; count: number }[] =
		[];
	if (departmentId) {
		const dept = await Department.findOne({
			_id: departmentId,
			tenantId,
		}).lean();
		if (dept) {
			byDepartment.push({
				departmentId: dept._id as string,
				name: dept.name,
				count: totalPrescriptions,
			});
		}
	}

	// By status
	const byStatusResult = await Prescription.aggregate([
		{ $match: matchStage },
		{ $group: { _id: "$status", count: { $sum: 1 } } },
	]);
	const byStatus: Record<string, number> = {};
	for (const r of byStatusResult) {
		byStatus[r._id as string] = r.count as number;
	}

	// Average medicines per prescription using aggregation
	const avgMedicinesResult = await Prescription.aggregate([
		{ $match: matchStage },
		{
			$project: {
				medicineCount: { $size: { $ifNull: ["$medicines", []] } },
			},
		},
		{
			$group: {
				_id: null,
				avg: { $avg: "$medicineCount" },
			},
		},
	]);
	const averageMedicinesPerPrescription =
		Math.round((avgMedicinesResult[0]?.avg ?? 0) * 100) / 100;

	// Top medicines using aggregation
	const topMedicinesResult = await Prescription.aggregate([
		{ $match: matchStage },
		{ $unwind: "$medicines" },
		{
			$group: {
				_id: "$medicines.medicineId",
				name: { $first: "$medicines.name" },
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1 } },
		{ $limit: 10 },
	]);
	const topMedicines = topMedicinesResult.map((r) => ({
		medicineId: (r._id as string) ?? "",
		name: (r.name as string) ?? "Unknown",
		count: r.count as number,
	}));

	// Trend
	const trendResult = await Prescription.aggregate([
		{ $match: matchStage },
		{
			$group: {
				_id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
				count: { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	]);
	const trend = trendResult.map((r) => ({
		date: r._id as string,
		count: r.count as number,
	}));

	return {
		totalPrescriptions,
		byDoctor,
		byDepartment,
		byStatus,
		averageMedicinesPerPrescription,
		topMedicines,
		trend,
	};
}

/**
 * Get medicine usage data
 */
export async function getMedicineUsageData({
	tenantId,
	startDate,
	endDate,
	medicineId,
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
	medicineId?: string;
}) {
	const matchStage: Record<string, unknown> = {
		tenantId,
		completedAt: { $gte: startDate, $lte: endDate },
		status: "DISPENSED",
	};

	// Get total dispensed using aggregation
	const totalResult = await Dispensing.aggregate([
		{ $match: matchStage },
		{ $unwind: "$medicines" },
		...(medicineId ? [{ $match: { "medicines.medicineId": medicineId } }] : []),
		{
			$group: {
				_id: null,
				total: { $sum: "$medicines.dispensedQuantity" },
			},
		},
	]);
	const totalDispensed = (totalResult[0]?.total as number) ?? 0;

	// By medicine using aggregation
	const byMedicineResult = await Dispensing.aggregate([
		{ $match: matchStage },
		{ $unwind: "$medicines" },
		...(medicineId ? [{ $match: { "medicines.medicineId": medicineId } }] : []),
		{
			$group: {
				_id: "$medicines.medicineId",
				quantity: { $sum: "$medicines.dispensedQuantity" },
			},
		},
		{ $sort: { quantity: -1 } },
	]);
	const byMedicine = byMedicineResult.map((r) => ({
		medicineId: (r._id as string) ?? "",
		name: (r._id as string) ?? "Unknown", // Would need medicine lookup for name
		quantity: r.quantity as number,
	}));

	// Trend
	const trendResult = await Dispensing.aggregate([
		{ $match: matchStage },
		{ $unwind: "$medicines" },
		{
			$group: {
				_id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
				quantity: { $sum: "$medicines.dispensedQuantity" },
			},
		},
		{ $sort: { _id: 1 } },
	]);
	const trend = trendResult.map((r) => ({
		date: r._id as string,
		quantity: r.quantity as number,
	}));

	return {
		totalDispensed,
		byMedicine,
		byDepartment: [] as {
			departmentId: string;
			name: string;
			quantity: number;
		}[],
		trend,
	};
}

/**
 * Get department utilization data
 */
export async function getDepartmentUtilizationData({
	tenantId,
	startDate,
	endDate,
	departmentId,
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
	departmentId?: string;
}) {
	const deptMatch: Record<string, unknown> = { tenantId, status: "ACTIVE" };
	if (departmentId) deptMatch._id = departmentId;

	const departments = await Department.find(deptMatch).lean();

	if (departments.length === 0) {
		return { departments: [] };
	}

	const departmentIds = departments.map((d) => d._id);

	// Run all aggregations in parallel to avoid N+1 queries
	const [patientCounts, appointmentCounts, staffCounts] = await Promise.all([
		// Patient counts by department
		Patient.aggregate([
			{
				$match: {
					tenantId,
					departmentId: { $in: departmentIds },
					createdAt: { $gte: startDate, $lte: endDate },
				},
			},
			{ $group: { _id: "$departmentId", count: { $sum: 1 } } },
		]),
		// Appointment counts by department
		Appointment.aggregate([
			{
				$match: {
					tenantId,
					departmentId: { $in: departmentIds },
					scheduledAt: { $gte: startDate, $lte: endDate },
				},
			},
			{ $group: { _id: "$departmentId", count: { $sum: 1 } } },
		]),
		// Staff counts by department
		Staff.aggregate([
			{
				$match: {
					tenantId,
					departmentId: { $in: departmentIds },
					status: "ACTIVE",
				},
			},
			{ $group: { _id: "$departmentId", count: { $sum: 1 } } },
		]),
	]);

	// Create lookup maps for O(1) access
	const patientCountMap = new Map(
		patientCounts.map((r) => [r._id as string, r.count as number]),
	);
	const appointmentCountMap = new Map(
		appointmentCounts.map((r) => [r._id as string, r.count as number]),
	);
	const staffCountMap = new Map(
		staffCounts.map((r) => [r._id as string, r.count as number]),
	);

	// Build results using the maps
	const result = departments.map((dept) => {
		const deptId = dept._id as string;
		const patientCount = patientCountMap.get(deptId) ?? 0;
		const appointmentCount = appointmentCountMap.get(deptId) ?? 0;
		const staffCount = staffCountMap.get(deptId) ?? 0;

		// Calculate peak hours (mock - would need appointment time analysis)
		const peakHours = [9, 10, 11, 14, 15];

		return {
			departmentId: deptId,
			departmentName: dept.name,
			totalPatients: patientCount,
			totalAppointments: appointmentCount,
			averageWaitTime: 15, // Mock - would need actual wait time tracking
			staffUtilization:
				staffCount > 0 ? Math.min(85, appointmentCount / staffCount) : 0,
			peakHours,
		};
	});

	return { departments: result };
}

/**
 * Get staff summary data
 */
export async function getStaffSummaryData({
	tenantId,
	startDate,
	endDate,
	departmentId,
	role,
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
	departmentId?: string;
	role?: string;
}) {
	const matchStage: Record<string, unknown> = { tenantId };
	if (departmentId) matchStage.departmentId = departmentId;
	if (role) matchStage.roles = role;

	const totalStaff = await Staff.countDocuments(matchStage);

	// By role
	const byRoleResult = await Staff.aggregate([
		{ $match: matchStage },
		{ $unwind: "$roles" },
		{ $group: { _id: "$roles", count: { $sum: 1 } } },
	]);
	const byRole = byRoleResult.map((r) => ({
		role: r._id as string,
		count: r.count as number,
	}));

	// By department
	const byDeptResult = await Staff.aggregate([
		{ $match: matchStage },
		{ $group: { _id: "$departmentId", count: { $sum: 1 } } },
	]);
	const deptIds = byDeptResult.map((r) => r._id).filter(Boolean);
	const depts = await Department.find({
		_id: { $in: deptIds },
		tenantId,
	}).lean();
	const deptMap = new Map(depts.map((d) => [d._id, d.name]));
	const byDepartment = byDeptResult
		.filter((r) => r._id)
		.map((r) => ({
			departmentId: r._id as string,
			name: deptMap.get(r._id) ?? "Unknown",
			count: r.count as number,
		}));

	// By status
	const activeCount = await Staff.countDocuments({
		...matchStage,
		status: "ACTIVE",
	});
	const inactiveCount = totalStaff - activeCount;
	const byStatus = { active: activeCount, inactive: inactiveCount };

	// New hires in period
	const newHires = await Staff.countDocuments({
		...matchStage,
		createdAt: { $gte: startDate, $lte: endDate },
	});

	// Departures (status changed to inactive in period) - simplified
	const departures = 0;

	return {
		totalStaff,
		byRole,
		byDepartment,
		byStatus,
		newHires,
		departures,
	};
}
