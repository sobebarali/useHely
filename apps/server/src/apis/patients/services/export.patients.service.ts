import { BadRequestError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { getExportPatients } from "../repositories/export.patients.repository";
import {
	DEFAULT_EXPORT_FIELDS,
	type ExportPatientsInput,
	MAX_EXPORT_RECORDS,
} from "../validations/export.patients.validation";

const logger = createServiceLogger("exportPatients");

/**
 * Export patients to CSV or PDF format
 */
export async function exportPatientsService({
	tenantId,
	format,
	patientType,
	department,
	startDate,
	endDate,
	fields: fieldsParam,
}: {
	tenantId: string;
} & ExportPatientsInput) {
	logger.info({ tenantId, format }, "Exporting patients");

	// Validate date range if provided
	if (startDate && endDate) {
		const start = new Date(startDate);
		const end = new Date(endDate);
		if (start > end) {
			throw new BadRequestError(
				"Start date must be before end date",
				"INVALID_DATE_RANGE",
			);
		}
	}

	// Parse fields to export
	const fields = fieldsParam
		? fieldsParam.split(",").map((f) => f.trim())
		: DEFAULT_EXPORT_FIELDS;

	// Get patients for export
	const result = await getExportPatients({
		tenantId,
		patientType,
		department,
		startDate,
		endDate,
		limit: MAX_EXPORT_RECORDS,
	});

	// Check if too many records
	if (result.total > MAX_EXPORT_RECORDS) {
		throw new BadRequestError(
			`Export limit exceeded. Maximum ${MAX_EXPORT_RECORDS} records allowed. Found ${result.total} records. Please narrow your filters.`,
			"EXPORT_TOO_LARGE",
		);
	}

	const date = new Date().toISOString().split("T")[0];

	if (format === "csv") {
		const csv = generateCSV(result.data, fields);
		return {
			content: csv,
			contentType: "text/csv",
			filename: `patients_${date}.csv`,
		};
	}

	// PDF format - generate simple text-based PDF content
	// In production, would use a PDF library like pdfkit or puppeteer
	const pdfContent = generateSimplePDFContent(result.data, fields);
	return {
		content: pdfContent,
		contentType: "text/plain", // Would be application/pdf with real PDF library
		filename: `patients_${date}.txt`, // Would be .pdf with real PDF library
	};
}

/**
 * Generate CSV content from patient data
 */
function generateCSV(data: Record<string, string>[], fields: string[]): string {
	// Header row
	const header = fields.join(",");

	// Data rows
	const rows = data.map((patient) => {
		return fields
			.map((field) => {
				const value = patient[field] || "";
				// Escape values that contain commas or quotes
				if (
					value.includes(",") ||
					value.includes('"') ||
					value.includes("\n")
				) {
					return `"${value.replace(/"/g, '""')}"`;
				}
				return value;
			})
			.join(",");
	});

	return [header, ...rows].join("\n");
}

/**
 * Generate simple text content for PDF (placeholder)
 * In production, would use a PDF library
 */
function generateSimplePDFContent(
	data: Record<string, string>[],
	fields: string[],
): string {
	const lines = [
		"PATIENT EXPORT REPORT",
		`Generated: ${new Date().toISOString()}`,
		`Total Records: ${data.length}`,
		"",
		"---",
		fields.join(" | "),
		"---",
	];

	for (const patient of data) {
		lines.push(fields.map((field) => patient[field] || "-").join(" | "));
	}

	return lines.join("\n");
}
