import { AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/logs - Filter by Resource", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let targetResourceId: string;
	const createdLogIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		targetResourceId = uuidv4();

		// Create audit logs for target resource (patient)
		for (let i = 0; i < 3; i++) {
			const logId = uuidv4();
			await AuditLog.create({
				_id: logId,
				tenantId: context.hospitalId,
				eventType: "PHI_VIEW",
				category: "PHI",
				userId: context.userId,
				userName: "Test User",
				resourceType: "patient",
				resourceId: targetResourceId,
				action: "READ",
				ip: "192.168.1.1",
				hash: `target-hash-${i}`,
				previousHash: i === 0 ? "GENESIS" : `target-hash-${i - 1}`,
				timestamp: new Date(Date.now() - i * 60000),
			});
			createdLogIds.push(logId);
		}

		// Create audit logs for different resource type
		for (let i = 0; i < 2; i++) {
			const logId = uuidv4();
			await AuditLog.create({
				_id: logId,
				tenantId: context.hospitalId,
				eventType: "PRESCRIPTION_VIEW",
				category: "PHI",
				userId: context.userId,
				userName: "Test User",
				resourceType: "prescription",
				resourceId: uuidv4(),
				action: "READ",
				ip: "192.168.1.1",
				hash: `prescription-hash-${i}`,
				previousHash: i === 0 ? "GENESIS" : `prescription-hash-${i - 1}`,
				timestamp: new Date(Date.now() - i * 60000),
			});
			createdLogIds.push(logId);
		}
	}, 30000);

	afterAll(async () => {
		for (const logId of createdLogIds) {
			await AuditLog.deleteOne({ _id: logId });
		}
		await context.cleanup();
	});

	it("filters logs by resourceType parameter", async () => {
		const response = await request(app)
			.get("/api/audit/logs?resourceType=patient")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);

		// All returned logs should have patient resource type
		for (const log of response.body.data) {
			expect(log.resourceType).toBe("patient");
		}
	});

	it("filters logs by resourceId parameter", async () => {
		const response = await request(app)
			.get(`/api/audit/logs?resourceId=${targetResourceId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.length).toBe(3);

		// All returned logs should belong to target resource
		for (const log of response.body.data) {
			expect(log.resourceId).toBe(targetResourceId);
		}
	});

	it("filters logs by both resourceType and resourceId", async () => {
		const response = await request(app)
			.get(
				`/api/audit/logs?resourceType=patient&resourceId=${targetResourceId}`,
			)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.length).toBe(3);

		for (const log of response.body.data) {
			expect(log.resourceType).toBe("patient");
			expect(log.resourceId).toBe(targetResourceId);
		}
	});
});
