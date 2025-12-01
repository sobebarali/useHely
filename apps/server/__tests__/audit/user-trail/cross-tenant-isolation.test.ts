import { AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/users/:userId/trail - Cross-Tenant Isolation", () => {
	let tenantAContext: AuthTestContext;
	let tenantAToken: string;
	let tenantBContext: AuthTestContext;
	const tenantBLogIds: string[] = [];

	beforeAll(async () => {
		// Create Tenant A
		tenantAContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:READ"],
		});
		const tenantATokens = await tenantAContext.issuePasswordTokens();
		tenantAToken = tenantATokens.accessToken;

		// Create Tenant B with audit logs
		tenantBContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:READ"],
		});

		// Create audit logs for Tenant B user
		for (let i = 0; i < 3; i++) {
			const logId = uuidv4();
			await AuditLog.create({
				_id: logId,
				tenantId: tenantBContext.hospitalId,
				eventType: "PHI_VIEW",
				category: "PHI",
				userId: tenantBContext.userId,
				userName: "Tenant B User",
				resourceType: "patient",
				resourceId: uuidv4(),
				action: "READ",
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

	it("returns empty trail for user from another tenant", async () => {
		// Tenant A tries to access Tenant B user's audit trail
		const response = await request(app)
			.get(`/api/audit/users/${tenantBContext.userId}/trail`)
			.set("Authorization", `Bearer ${tenantAToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.userId).toBe(tenantBContext.userId);
		// Should return empty logs since tenant isolation applies
		expect(response.body.data.logs.length).toBe(0);
	});

	it("does not return logs from other tenants in user trail", async () => {
		// Get Tenant A's own audit trail
		const response = await request(app)
			.get(`/api/audit/users/${tenantAContext.userId}/trail`)
			.set("Authorization", `Bearer ${tenantAToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);

		// None of the returned logs should be from Tenant B
		const returnedIds = response.body.data.logs.map(
			(log: { id: string }) => log.id,
		);
		for (const tenantBLogId of tenantBLogIds) {
			expect(returnedIds).not.toContain(tenantBLogId);
		}
	});
});
