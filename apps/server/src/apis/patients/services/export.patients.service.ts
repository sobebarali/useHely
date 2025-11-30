import PDFDocument from "pdfkit";
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

	// PDF format - generate actual PDF using pdfkit
	const pdfBuffer = await generatePDF(result.data, fields);
	return {
		content: pdfBuffer,
		contentType: "application/pdf",
		filename: `patients_${date}.pdf`,
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
 * Generate PDF content from patient data using pdfkit
 */
async function generatePDF(
	data: Record<string, string>[],
	fields: string[],
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		try {
			const doc = new PDFDocument({
				size: "A4",
				layout: "landscape",
				margin: 40,
			});

			const chunks: Buffer[] = [];

			doc.on("data", (chunk: Buffer) => chunks.push(chunk));
			doc.on("end", () => resolve(Buffer.concat(chunks)));
			doc.on("error", reject);

			// Title
			doc.fontSize(18).font("Helvetica-Bold").text("Patient Export Report", {
				align: "center",
			});
			doc.moveDown(0.5);

			// Metadata
			doc
				.fontSize(10)
				.font("Helvetica")
				.text(`Generated: ${new Date().toISOString()}`, { align: "center" });
			doc.text(`Total Records: ${data.length}`, { align: "center" });
			doc.moveDown(1);

			// Calculate column widths
			const pageWidth =
				doc.page.width - doc.page.margins.left - doc.page.margins.right;
			const columnWidth = pageWidth / fields.length;
			const startX = doc.page.margins.left;

			// Table header
			doc.fontSize(9).font("Helvetica-Bold");
			let currentX = startX;
			const headerY = doc.y;

			// Draw header background
			doc.rect(startX, headerY - 2, pageWidth, 16).fill("#f0f0f0");

			// Draw header text
			doc.fill("#000000");
			for (const field of fields) {
				const displayName = formatFieldName(field);
				doc.text(displayName, currentX + 2, headerY, {
					width: columnWidth - 4,
					height: 14,
					ellipsis: true,
				});
				currentX += columnWidth;
			}
			doc.moveDown(0.5);

			// Draw horizontal line after header
			doc
				.moveTo(startX, doc.y)
				.lineTo(startX + pageWidth, doc.y)
				.stroke();
			doc.moveDown(0.3);

			// Table data
			doc.font("Helvetica").fontSize(8);

			for (let i = 0; i < data.length; i++) {
				const patient = data[i];
				if (!patient) continue;

				// Check if we need a new page
				if (doc.y > doc.page.height - 60) {
					doc.addPage();
					doc.y = doc.page.margins.top;
				}

				currentX = startX;
				const rowY = doc.y;

				// Alternate row background
				if (i % 2 === 0) {
					doc.rect(startX, rowY - 1, pageWidth, 14).fill("#fafafa");
					doc.fill("#000000");
				}

				for (const field of fields) {
					const value = patient[field] || "-";
					doc.text(value, currentX + 2, rowY, {
						width: columnWidth - 4,
						height: 12,
						ellipsis: true,
					});
					currentX += columnWidth;
				}
				doc.moveDown(0.5);
			}

			// Footer
			doc.moveDown(2);
			doc
				.fontSize(8)
				.font("Helvetica")
				.fill("#666666")
				.text("Page 1 | Generated by HMS", { align: "center" });

			doc.end();
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Format field name for display (camelCase to Title Case)
 */
function formatFieldName(field: string): string {
	return field
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (str) => str.toUpperCase())
		.trim();
}
