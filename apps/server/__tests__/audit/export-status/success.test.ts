import { AuditExport } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/export/:exportId - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let pendingExportId: string;
	let completedExportId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:EXPORT"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a pending export job
		pendingExportId = uuidv4();
		await AuditExport.create({
			_id: pendingExportId,
			tenantId: context.hospitalId,
			requestedBy: context.userId,
			startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
			endDate: new Date(),
			format: "json",
			status: "PENDING",
			estimatedRecords: 100,
			processedRecords: 0,
		});

		// Create a completed export job
		completedExportId = uuidv4();
		await AuditExport.create({
			_id: completedExportId,
			tenantId: context.hospitalId,
			requestedBy: context.userId,
			startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
			endDate: new Date(),
			format: "json",
			status: "COMPLETED",
			estimatedRecords: 50,
			processedRecords: 50,
			downloadUrl: "https://example.com/export/download",
			completedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await AuditExport.deleteOne({ _id: pendingExportId });
		await AuditExport.deleteOne({ _id: completedExportId });
		await context.cleanup();
	});

	it("returns export status for pending job", async () => {
		const response = await request(app)
			.get(`/api/audit/export/${pendingExportId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.exportId).toBe(pendingExportId);
		expect(response.body.data.status).toBe("PENDING");
		expect(response.body.data.downloadUrl).toBeNull();
	});

	it("returns export status with download URL when completed", async () => {
		const response = await request(app)
			.get(`/api/audit/export/${completedExportId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.exportId).toBe(completedExportId);
		expect(response.body.data.status).toBe("COMPLETED");
		expect(response.body.data.downloadUrl).toBe(
			"https://example.com/export/download",
		);
		expect(response.body.data.completedAt).toBeDefined();
	});
});
