import { AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/logs - Cross-Tenant Isolation", () => {
	let tenantAContext: AuthTestContext;
	let tenantAToken: string;
	let tenantBContext: AuthTestContext;
	const tenantALogIds: string[] = [];
	const tenantBLogIds: string[] = [];

	beforeAll(async () => {
		// Create Tenant A with audit logs
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
		await tenantBContext.issuePasswordTokens();

		// Create audit logs for Tenant A
		for (let i = 0; i < 3; i++) {
			const logId = uuidv4();
			await AuditLog.create({
				_id: logId,
				tenantId: tenantAContext.hospitalId,
				eventType: "PHI_VIEW",
				category: "PHI",
				userId: tenantAContext.userId,
				userName: "Tenant A User",
				resourceType: "patient",
				resourceId: uuidv4(),
				action: "READ",
				ip: "192.168.1.1",
				hash: `tenant-a-hash-${i}`,
				previousHash: i === 0 ? "GENESIS" : `tenant-a-hash-${i - 1}`,
				timestamp: new Date(Date.now() - i * 60000),
			});
			tenantALogIds.push(logId);
		}

		// Create audit logs for Tenant B
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
		for (const logId of tenantALogIds) {
			await AuditLog.deleteOne({ _id: logId });
		}
		for (const logId of tenantBLogIds) {
			await AuditLog.deleteOne({ _id: logId });
		}
		await tenantAContext.cleanup();
		await tenantBContext.cleanup();
	});

	it("does not return logs from other tenants", async () => {
		const response = await request(app)
			.get("/api/audit/logs")
			.set("Authorization", `Bearer ${tenantAToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);

		// All returned logs should belong to Tenant A
		for (const log of response.body.data) {
			expect(log.tenantId).toBe(tenantAContext.hospitalId);
		}

		// None of the Tenant B logs should be returned
		const returnedIds = response.body.data.map((log: { id: string }) => log.id);
		for (const tenantBLogId of tenantBLogIds) {
			expect(returnedIds).not.toContain(tenantBLogId);
		}
	});

	it("cannot filter to access another tenant's logs by resourceId", async () => {
		// Try to filter using a resourceId that belongs to Tenant B's logs
		const tenantBLog = await AuditLog.findById(tenantBLogIds[0]).lean();
		const tenantBResourceId = tenantBLog?.resourceId;

		const response = await request(app)
			.get(`/api/audit/logs?resourceId=${tenantBResourceId}`)
			.set("Authorization", `Bearer ${tenantAToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		// Should return empty results since tenant isolation applies
		expect(response.body.data.length).toBe(0);
	});
});
