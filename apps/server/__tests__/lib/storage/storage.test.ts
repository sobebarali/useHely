/**
 * Storage Service Tests
 *
 * Tests for R2 storage functionality
 * Note: These tests require R2 to be configured via environment variables
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
	ContentTypes,
	deleteFile,
	fileExists,
	getAuditExportKey,
	getComplianceExportKey,
	getFile,
	getPatientPhotoKey,
	getSignedDownloadUrl,
	getSignedUploadUrl,
	isR2Configured,
	StoragePrefixes,
	uploadExportFile,
	uploadFile,
	uploadPatientPhoto,
} from "../../../src/lib/storage";

describe("Storage Service", () => {
	describe("Configuration", () => {
		it("should export isR2Configured flag", () => {
			expect(typeof isR2Configured).toBe("boolean");
		});

		it("should export storage prefixes", () => {
			expect(StoragePrefixes.PATIENT_PHOTOS).toBe("patients/photos");
			expect(StoragePrefixes.AUDIT_EXPORTS).toBe("exports/audit");
			expect(StoragePrefixes.COMPLIANCE_EXPORTS).toBe("exports/compliance");
			expect(StoragePrefixes.REPORTS).toBe("exports/reports");
		});

		it("should export content types", () => {
			expect(ContentTypes.JPEG).toBe("image/jpeg");
			expect(ContentTypes.PNG).toBe("image/png");
			expect(ContentTypes.PDF).toBe("application/pdf");
			expect(ContentTypes.CSV).toBe("text/csv");
			expect(ContentTypes.JSON).toBe("application/json");
		});
	});

	describe("Key Generation", () => {
		it("should generate correct patient photo key", () => {
			const key = getPatientPhotoKey({
				tenantId: "tenant-123",
				patientId: "patient-456",
				extension: "jpg",
			});
			expect(key).toBe("patients/photos/tenant-123/patient-456.jpg");
		});

		it("should generate correct patient photo key with png extension", () => {
			const key = getPatientPhotoKey({
				tenantId: "tenant-123",
				patientId: "patient-456",
				extension: "png",
			});
			expect(key).toBe("patients/photos/tenant-123/patient-456.png");
		});

		it("should generate correct audit export key", () => {
			const key = getAuditExportKey({
				tenantId: "tenant-123",
				exportId: "export-789",
				format: "json",
			});
			expect(key).toBe("exports/audit/tenant-123/export-789.json");
		});

		it("should generate correct audit export key with csv format", () => {
			const key = getAuditExportKey({
				tenantId: "tenant-123",
				exportId: "export-789",
				format: "csv",
			});
			expect(key).toBe("exports/audit/tenant-123/export-789.csv");
		});

		it("should generate correct compliance export key", () => {
			const key = getComplianceExportKey({
				tenantId: "tenant-123",
				requestId: "request-abc",
				format: "json",
			});
			expect(key).toBe("exports/compliance/tenant-123/request-abc.json");
		});
	});

	describe("Storage Operations (when R2 not configured)", () => {
		// These tests verify graceful handling when R2 is not configured
		// They should pass regardless of R2 configuration

		it("should return null when uploading without R2 configured", async () => {
			if (isR2Configured) {
				// Skip this test if R2 is configured
				return;
			}

			const result = await uploadFile({
				key: "test/file.txt",
				body: Buffer.from("test content"),
				contentType: "text/plain",
			});

			expect(result).toBeNull();
		});

		it("should return null when getting file without R2 configured", async () => {
			if (isR2Configured) {
				return;
			}

			const result = await getFile({ key: "test/file.txt" });
			expect(result).toBeNull();
		});

		it("should return false when checking file exists without R2 configured", async () => {
			if (isR2Configured) {
				return;
			}

			const exists = await fileExists({ key: "test/file.txt" });
			expect(exists).toBe(false);
		});

		it("should return false when deleting without R2 configured", async () => {
			if (isR2Configured) {
				return;
			}

			const result = await deleteFile({ key: "test/file.txt" });
			expect(result).toBe(false);
		});

		it("should return null for signed download URL without R2 configured", async () => {
			if (isR2Configured) {
				return;
			}

			const url = await getSignedDownloadUrl({ key: "test/file.txt" });
			expect(url).toBeNull();
		});

		it("should return null for signed upload URL without R2 configured", async () => {
			if (isR2Configured) {
				return;
			}

			const url = await getSignedUploadUrl({
				key: "test/file.txt",
				contentType: "text/plain",
			});
			expect(url).toBeNull();
		});
	});

	describe("Patient Photo Upload", () => {
		it("should reject invalid base64 format", async () => {
			if (!isR2Configured) {
				// When R2 is not configured, upload returns null without throwing
				const result = await uploadPatientPhoto({
					tenantId: "tenant-123",
					patientId: "patient-456",
					base64Data: "invalid-data",
				});
				expect(result).toBeNull();
				return;
			}

			// When R2 is configured, it should throw for invalid format
			await expect(
				uploadPatientPhoto({
					tenantId: "tenant-123",
					patientId: "patient-456",
					base64Data: "invalid-data",
				}),
			).rejects.toThrow("Invalid base64 image format");
		});

		it("should return null when R2 not configured", async () => {
			if (isR2Configured) {
				return;
			}

			const result = await uploadPatientPhoto({
				tenantId: "tenant-123",
				patientId: "patient-456",
				base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
			});

			expect(result).toBeNull();
		});
	});

	describe("Export File Upload", () => {
		it("should return null when R2 not configured", async () => {
			if (isR2Configured) {
				return;
			}

			const result = await uploadExportFile({
				tenantId: "tenant-123",
				exportId: "export-789",
				type: "audit",
				format: "json",
				data: JSON.stringify({ test: "data" }),
			});

			expect(result).toBeNull();
		});
	});
});

// Integration tests - only run when R2 is configured
describe("Storage Integration Tests (requires R2)", () => {
	const testTenantId = `test-tenant-${Date.now()}`;
	const testKey = `test/${testTenantId}/integration-test.txt`;
	const testContent = "Integration test content";

	beforeAll(() => {
		if (!isR2Configured) {
			console.log("Skipping R2 integration tests - R2 not configured");
		}
	});

	it("should upload, verify, download, and delete a file", async () => {
		if (!isR2Configured) {
			return;
		}

		// Upload
		const uploadResult = await uploadFile({
			key: testKey,
			body: Buffer.from(testContent),
			contentType: "text/plain",
			metadata: {
				testRun: "true",
				timestamp: new Date().toISOString(),
			},
		});

		expect(uploadResult).not.toBeNull();
		expect(uploadResult?.key).toBe(testKey);

		// Check exists
		const exists = await fileExists({ key: testKey });
		expect(exists).toBe(true);

		// Download
		const downloadResult = await getFile({ key: testKey });
		expect(downloadResult).not.toBeNull();
		expect(downloadResult?.contentType).toBe("text/plain");

		const downloadedContent = new TextDecoder().decode(downloadResult?.body);
		expect(downloadedContent).toBe(testContent);

		// Generate signed URL
		const signedUrl = await getSignedDownloadUrl({
			key: testKey,
			expiresIn: 60,
		});
		expect(signedUrl).not.toBeNull();
		expect(signedUrl).toContain("X-Amz-Signature");

		// Delete
		const deleteResult = await deleteFile({ key: testKey });
		expect(deleteResult).toBe(true);

		// Verify deleted
		const existsAfterDelete = await fileExists({ key: testKey });
		expect(existsAfterDelete).toBe(false);
	});

	it("should upload and download export file", async () => {
		if (!isR2Configured) {
			return;
		}

		const exportData = {
			exportId: "test-export",
			records: [{ id: 1, name: "Test" }],
		};

		const result = await uploadExportFile({
			tenantId: testTenantId,
			exportId: `test-export-${Date.now()}`,
			type: "audit",
			format: "json",
			data: JSON.stringify(exportData, null, 2),
		});

		expect(result).not.toBeNull();
		expect(result?.key).toContain("exports/audit");
		expect(result?.downloadUrl).not.toBeNull();

		// Clean up
		if (result?.key) {
			await deleteFile({ key: result.key });
		}
	});
});
