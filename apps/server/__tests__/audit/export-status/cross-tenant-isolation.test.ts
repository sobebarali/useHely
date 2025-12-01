import { AuditExport } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/export/:exportId - Cross-Tenant Isolation", () => {
	let tenantAContext: AuthTestContext;
	let tenantAToken: string;
	let tenantBContext: AuthTestContext;
	let tenantBExportId: string;

	beforeAll(async () => {
		// Create Tenant A
		tenantAContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:EXPORT"],
		});
		const tenantATokens = await tenantAContext.issuePasswordTokens();
		tenantAToken = tenantATokens.accessToken;

		// Create Tenant B with an export job
		tenantBContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:EXPORT"],
		});

		// Create export job for Tenant B directly in the database
		tenantBExportId = uuidv4();
		await AuditExport.create({
			_id: tenantBExportId,
			tenantId: tenantBContext.hospitalId,
			requestedBy: tenantBContext.userId,
			startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
			endDate: new Date(),
			format: "json",
			status: "PENDING",
			estimatedRecords: 100,
			processedRecords: 0,
		});
	}, 30000);

	afterAll(async () => {
		await AuditExport.deleteOne({ _id: tenantBExportId });
		await tenantAContext.cleanup();
		await tenantBContext.cleanup();
	});

	it("returns 404 when accessing export from another tenant", async () => {
		// Tenant A tries to access Tenant B's export job
		const response = await request(app)
			.get(`/api/audit/export/${tenantBExportId}`)
			.set("Authorization", `Bearer ${tenantAToken}`);

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("EXPORT_NOT_FOUND");
	});
});
