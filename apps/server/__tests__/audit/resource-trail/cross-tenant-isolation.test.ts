import { AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/resources/:resourceType/:resourceId/trail - Cross-Tenant Isolation", () => {
	let tenantAContext: AuthTestContext;
	let tenantAToken: string;
	let tenantBContext: AuthTestContext;
	let tenantBResourceId: string;
	const tenantBLogIds: string[] = [];

	beforeAll(async () => {
		// Create Tenant A
		tenantAContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:READ"],
		});
		const tenantATokens = await tenantAContext.issuePasswordTokens();
		tenantAToken = tenantATokens.accessToken;

		// Create Tenant B with audit logs for a specific resource
		tenantBContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:READ"],
		});

		tenantBResourceId = uuidv4();

		// Create audit logs for Tenant B resource
		for (let i = 0; i < 3; i++) {
			const logId = uuidv4();
			await AuditLog.create({
				_id: logId,
				tenantId: tenantBContext.hospitalId,
				eventType: i === 0 ? "PHI_CREATE" : "PHI_VIEW",
				category: "PHI",
				userId: tenantBContext.userId,
				userName: "Tenant B User",
				resourceType: "patient",
				resourceId: tenantBResourceId,
				action: i === 0 ? "CREATE" : "READ",
				ip: "192.168.1.2",
				hash: `tenant-b-hash-${i}`,
				previousHash: i === 0 ? "GENESIS" : `tenant-b-hash-${i - 1}`,
				timestamp: new Date(Date.now() - i * 60000),
			});
			tenantBLogIds.push(logId);
		}
	}, 30000);

	afterAll(async () => {
		for (const logId of tenantBLogIds) {
			await AuditLog.deleteOne({ _id: logId });
		}
		await tenantAContext.cleanup();
		await tenantBContext.cleanup();
	});

	it("returns empty trail for resource from another tenant", async () => {
		// Tenant A tries to access Tenant B resource's audit trail
		const response = await request(app)
			.get(`/api/audit/resources/patient/${tenantBResourceId}/trail`)
			.set("Authorization", `Bearer ${tenantAToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.resourceType).toBe("patient");
		expect(response.body.data.resourceId).toBe(tenantBResourceId);
		// Should return empty logs since tenant isolation applies
		expect(response.body.data.logs.length).toBe(0);
	});
});
