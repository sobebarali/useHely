import { AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/logs/:id - Cross-Tenant Isolation", () => {
	let tenantAContext: AuthTestContext;
	let tenantAToken: string;
	let tenantBContext: AuthTestContext;
	let tenantBLogId: string;

	beforeAll(async () => {
		// Create Tenant A
		tenantAContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:READ"],
		});
		const tenantATokens = await tenantAContext.issuePasswordTokens();
		tenantAToken = tenantATokens.accessToken;

		// Create Tenant B with an audit log
		tenantBContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:READ"],
		});

		// Create audit log for Tenant B
		tenantBLogId = uuidv4();
		await AuditLog.create({
			_id: tenantBLogId,
			tenantId: tenantBContext.hospitalId,
			eventType: "PHI_VIEW",
			category: "PHI",
			userId: tenantBContext.userId,
			userName: "Tenant B User",
			resourceType: "patient",
			resourceId: uuidv4(),
			action: "READ",
			ip: "192.168.1.2",
			hash: "tenant-b-hash",
			previousHash: "GENESIS",
			timestamp: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await AuditLog.deleteOne({ _id: tenantBLogId });
		await tenantAContext.cleanup();
		await tenantBContext.cleanup();
	});

	it("returns 404 when accessing log from another tenant", async () => {
		const response = await request(app)
			.get(`/api/audit/logs/${tenantBLogId}`)
			.set("Authorization", `Bearer ${tenantAToken}`);

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("AUDIT_LOG_NOT_FOUND");
	});
});
