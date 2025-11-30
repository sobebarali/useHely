import { Counter, Prescription, PrescriptionTemplate } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
// Cross-domain imports for proper separation of concerns
import {
	findPatientById as findPatientByIdFromPatients,
	findPatientsByIds as findPatientsByIdsFromPatients,
} from "../../patients/repositories/shared.patients.repository";
import {
	findStaffById as findStaffByIdFromUsers,
	findStaffByIds as findStaffByIdsFromUsers,
} from "../../users/repositories/shared.users.repository";

const logger = createRepositoryLogger("sharedPrescriptions");

// TypeScript interfaces for lean documents (plain objects returned by .lean())
export interface MedicineItemLean {
	_id: string;
	medicineId?: string;
	name: string;
	genericName?: string;
	dosage: string;
	frequency: string;
	duration: string;
	route?: string;
	quantity?: number;
	instructions?: string;
	dispensed: boolean;
	dispensedQuantity: number;
}

export interface TemplateMedicineLean {
	_id: string;
	medicineId?: string;
	name: string;
	genericName?: string;
	dosage?: string;
	frequency?: string;
	duration?: string;
	route?: string;
	instructions?: string;
}

export interface PrescriptionLean {
	_id: string;
	tenantId: string;
	prescriptionId: string;
	patientId: string;
	doctorId: string;
	appointmentId?: string;
	diagnosis: string;
	notes?: string;
	medicines: MedicineItemLean[];
	status: string;
	followUpDate?: Date;
	templateId?: string;
	cancelledAt?: Date;
	cancelledBy?: string;
	cancellationReason?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface PrescriptionTemplateLean {
	_id: string;
	tenantId: string;
	name: string;
	category?: string;
	condition?: string;
	medicines: TemplateMedicineLean[];
	isSystem: boolean;
	createdBy?: string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Find prescription by ID within a tenant
 */
export async function findPrescriptionById({
	tenantId,
	prescriptionId,
}: {
	tenantId: string;
	prescriptionId: string;
}): Promise<PrescriptionLean | null> {
	try {
		logger.debug({ tenantId, prescriptionId }, "Finding prescription by ID");

		const prescription = await Prescription.findOne({
			_id: prescriptionId,
			tenantId,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"prescription",
			{ tenantId, prescriptionId },
			prescription ? { _id: prescription._id, found: true } : { found: false },
		);

		return prescription as PrescriptionLean | null;
	} catch (error) {
		logError(logger, error, "Failed to find prescription by ID");
		throw error;
	}
}

/**
 * Find template by ID within a tenant
 */
export async function findTemplateById({
	tenantId,
	templateId,
}: {
	tenantId: string;
	templateId: string;
}): Promise<PrescriptionTemplateLean | null> {
	try {
		logger.debug({ tenantId, templateId }, "Finding template by ID");

		const template = await PrescriptionTemplate.findOne({
			_id: templateId,
			tenantId,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"prescriptionTemplate",
			{ tenantId, templateId },
			template ? { _id: template._id, found: true } : { found: false },
		);

		return template as PrescriptionTemplateLean | null;
	} catch (error) {
		logError(logger, error, "Failed to find template by ID");
		throw error;
	}
}

/**
 * Find template by name within a tenant
 */
export async function findTemplateByName({
	tenantId,
	name,
}: {
	tenantId: string;
	name: string;
}): Promise<PrescriptionTemplateLean | null> {
	try {
		logger.debug({ tenantId, name }, "Finding template by name");

		const template = await PrescriptionTemplate.findOne({
			tenantId,
			name,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"prescriptionTemplate",
			{ tenantId, name },
			template ? { _id: template._id, found: true } : { found: false },
		);

		return template as PrescriptionTemplateLean | null;
	} catch (error) {
		logError(logger, error, "Failed to find template by name");
		throw error;
	}
}

/**
 * Generate next prescription ID for a tenant
 * Format: {tenantId}-RX-{sequential}
 */
export async function generatePrescriptionId({
	tenantId,
}: {
	tenantId: string;
}): Promise<string> {
	try {
		logger.debug({ tenantId }, "Generating prescription ID");

		const counter = await Counter.findOneAndUpdate(
			{ tenantId, type: "prescription" },
			{ $inc: { seq: 1 } },
			{ new: true, upsert: true },
		);

		const seq = counter?.seq || 1;
		const prescriptionId = `${tenantId}-RX-${String(seq).padStart(6, "0")}`;

		logDatabaseOperation(
			logger,
			"generateId",
			"counter",
			{ tenantId, type: "prescription" },
			{ prescriptionId, seq },
		);

		return prescriptionId;
	} catch (error) {
		logError(logger, error, "Failed to generate prescription ID");
		throw error;
	}
}

/**
 * Find patient by ID within a tenant
 * Re-exported from patients domain for convenience
 */
export async function findPatientById({
	tenantId,
	patientId,
}: {
	tenantId: string;
	patientId: string;
}) {
	return findPatientByIdFromPatients({ tenantId, patientId });
}

/**
 * Find staff by ID within a tenant
 * Re-exported from users domain for convenience
 */
export async function findStaffById({
	tenantId,
	staffId,
}: {
	tenantId: string;
	staffId: string;
}) {
	return findStaffByIdFromUsers({ tenantId, staffId });
}

/**
 * Find multiple staff by IDs within a tenant
 * Re-exported from users domain for convenience
 */
export async function findStaffByIds({
	tenantId,
	staffIds,
}: {
	tenantId: string;
	staffIds: string[];
}) {
	return findStaffByIdsFromUsers({ tenantId, staffIds });
}

/**
 * Find multiple patients by IDs within a tenant
 * Re-exported from patients domain for convenience
 */
export async function findPatientsByIds({
	tenantId,
	patientIds,
}: {
	tenantId: string;
	patientIds: string[];
}) {
	return findPatientsByIdsFromPatients({ tenantId, patientIds });
}
