import { Counter, Department, Patient, Staff } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("sharedPatients");

/**
 * Find patient by ID within a tenant
 */
export async function findPatientById({
	tenantId,
	patientId,
}: {
	tenantId: string;
	patientId: string;
}) {
	try {
		logger.debug({ tenantId, patientId }, "Finding patient by ID");

		const patient = await Patient.findOne({
			_id: patientId,
			tenantId,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"patient",
			{ tenantId, patientId },
			patient ? { _id: patient._id, found: true } : { found: false },
		);

		return patient;
	} catch (error) {
		logError(logger, error, "Failed to find patient by ID");
		throw error;
	}
}

/**
 * Find patient by email within a tenant
 */
export async function findPatientByEmail({
	tenantId,
	email,
}: {
	tenantId: string;
	email: string;
}) {
	try {
		logger.debug({ tenantId, email }, "Finding patient by email");

		const patient = await Patient.findOne({
			tenantId,
			email,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"patient",
			{ tenantId, email },
			patient ? { _id: patient._id, found: true } : { found: false },
		);

		return patient;
	} catch (error) {
		logError(logger, error, "Failed to find patient by email");
		throw error;
	}
}

/**
 * Find patient by phone within a tenant
 */
export async function findPatientByPhone({
	tenantId,
	phone,
}: {
	tenantId: string;
	phone: string;
}) {
	try {
		logger.debug({ tenantId, phone }, "Finding patient by phone");

		const patient = await Patient.findOne({
			tenantId,
			phone,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"patient",
			{ tenantId, phone },
			patient ? { _id: patient._id, found: true } : { found: false },
		);

		return patient;
	} catch (error) {
		logError(logger, error, "Failed to find patient by phone");
		throw error;
	}
}

/**
 * Generate next patient ID for a tenant
 * Format: {tenantId}-P-{sequential}
 */
export async function generatePatientId({
	tenantId,
}: {
	tenantId: string;
}): Promise<string> {
	try {
		logger.debug({ tenantId }, "Generating patient ID");

		// Use Counter model's static method
		const counter = await Counter.findOneAndUpdate(
			{ tenantId, type: "patient" },
			{ $inc: { seq: 1 } },
			{ new: true, upsert: true },
		);

		const seq = counter?.seq || 1;
		const patientId = `${tenantId}-P-${String(seq).padStart(6, "0")}`;

		logDatabaseOperation(
			logger,
			"generateId",
			"counter",
			{ tenantId, type: "patient" },
			{ patientId, seq },
		);

		return patientId;
	} catch (error) {
		logError(logger, error, "Failed to generate patient ID");
		throw error;
	}
}

/**
 * Find department by ID
 */
export async function findDepartmentById({
	departmentId,
}: {
	departmentId: string;
}) {
	try {
		logger.debug({ departmentId }, "Finding department by ID");

		const department = await Department.findById(departmentId).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"department",
			{ departmentId },
			department ? { _id: department._id, found: true } : { found: false },
		);

		return department;
	} catch (error) {
		logError(logger, error, "Failed to find department by ID");
		throw error;
	}
}

/**
 * Find staff by ID
 */
export async function findStaffById({ staffId }: { staffId: string }) {
	try {
		logger.debug({ staffId }, "Finding staff by ID");

		const staff = await Staff.findById(staffId).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"staff",
			{ staffId },
			staff ? { _id: staff._id, found: true } : { found: false },
		);

		return staff;
	} catch (error) {
		logError(logger, error, "Failed to find staff by ID");
		throw error;
	}
}

/**
 * Find departments by IDs
 */
export async function findDepartmentsByIds({
	departmentIds,
}: {
	departmentIds: string[];
}) {
	try {
		logger.debug({ count: departmentIds.length }, "Finding departments by IDs");

		const departments = await Department.find({
			_id: { $in: departmentIds },
		}).lean();

		logDatabaseOperation(
			logger,
			"find",
			"department",
			{ count: departmentIds.length },
			{ found: departments.length },
		);

		return departments;
	} catch (error) {
		logError(logger, error, "Failed to find departments by IDs");
		throw error;
	}
}

/**
 * Find multiple patients by IDs within a tenant
 */
export async function findPatientsByIds({
	tenantId,
	patientIds,
}: {
	tenantId: string;
	patientIds: string[];
}) {
	try {
		logger.debug(
			{ tenantId, count: patientIds.length },
			"Finding patients by IDs",
		);

		const patients = await Patient.find({
			_id: { $in: patientIds },
			tenantId,
		}).lean();

		logDatabaseOperation(
			logger,
			"find",
			"patient",
			{ tenantId, count: patientIds.length },
			{ found: patients.length },
		);

		return patients;
	} catch (error) {
		logError(logger, error, "Failed to find patients by IDs");
		throw error;
	}
}
