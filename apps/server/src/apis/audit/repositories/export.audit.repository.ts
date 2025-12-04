/**
 * Export Audit Logs Repository
 *
 * Database operations for audit log export
 */

import { AuditExport, AuditExportStatus } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { createRepositoryLogger, logDatabaseOperation } from "@/lib/logger";

const logger = createRepositoryLogger("exportAudit");

/**
 * Export document type
 */
export type ExportDocument = {
	_id: string;
	tenantId: string;
	status: string;
	format: string;
	startDate: Date;
	endDate: Date;
	categories?: string[];
	estimatedRecords: number;
	processedRecords: number;
	downloadUrl?: string | null;
	storageKey?: string | null;
	errorMessage?: string | null;
	requestedBy: string;
	completedAt?: Date | null;
	expiresAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export async function createExportJob({
	tenantId,
	startDate,
	endDate,
	format,
	categories,
	estimatedRecords,
	requestedBy,
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
	format: string;
	categories?: string[];
	estimatedRecords: number;
	requestedBy: string;
}): Promise<ExportDocument> {
	const exportId = uuidv4();
	const expiresAt = new Date();
	expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

	logDatabaseOperation(logger, "create", "audit_export", {
		tenantId,
		startDate,
		endDate,
		format,
		categories,
		estimatedRecords,
		requestedBy,
	});

	const exportJob = await AuditExport.create({
		_id: exportId,
		tenantId,
		status: AuditExportStatus.PENDING,
		format,
		startDate,
		endDate,
		categories: categories || [],
		estimatedRecords,
		processedRecords: 0,
		requestedBy,
		expiresAt,
	});

	return exportJob.toObject() as ExportDocument;
}

export async function findExportById({
	id,
	tenantId,
}: {
	id: string;
	tenantId: string;
}): Promise<ExportDocument | null> {
	const filter = { _id: id, tenantId };

	logDatabaseOperation(logger, "findOne", "audit_export", filter);

	const exportJob = await AuditExport.findOne(filter).lean<ExportDocument>();

	return exportJob;
}

export async function updateExportStatus({
	id,
	tenantId,
	status,
	downloadUrl,
	storageKey,
	errorMessage,
	processedRecords,
}: {
	id: string;
	tenantId: string;
	status: string;
	downloadUrl?: string;
	storageKey?: string;
	errorMessage?: string;
	processedRecords?: number;
}): Promise<ExportDocument | null> {
	const filter = { _id: id, tenantId };
	const update: Record<string, unknown> = { status };

	if (downloadUrl) {
		update.downloadUrl = downloadUrl;
	}
	if (storageKey) {
		update.storageKey = storageKey;
	}
	if (errorMessage) {
		update.errorMessage = errorMessage;
	}
	if (processedRecords !== undefined) {
		update.processedRecords = processedRecords;
	}
	if (
		status === AuditExportStatus.COMPLETED ||
		status === AuditExportStatus.FAILED
	) {
		update.completedAt = new Date();
	}

	logDatabaseOperation(logger, "findOneAndUpdate", "audit_export", {
		filter,
		update,
	});

	const exportJob = await AuditExport.findOneAndUpdate(filter, update, {
		new: true,
	}).lean<ExportDocument>();

	return exportJob;
}
