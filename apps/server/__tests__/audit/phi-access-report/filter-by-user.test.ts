import { AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/reports/phi-access - Filter by User", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let targetUserId: string;
	const createdLogIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:REPORT"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		targetUserId = uuidv4();
		const otherUserId = uuidv4();

		// Create PHI access logs for target user
		for (let i = 0; i < 3; i++) {
			const logId = uuidv4();
			await AuditLog.create({
				_id: logId,
				tenantId: context.hospitalId,
				eventType: "PHI_VIEW",
				category: "PHI",
				userId: targetUserId,
				userName: "Target User",
				resourceType: "patient",
				resourceId: uuidv4(),
				action: "READ",
				ip: "192.168.1.1",
				details: { fieldsAccessed: ["name", "diagnosis"] },
				hash: `target-hash-${i}`,
				previousHash: i === 0 ? "GENESIS" : `target-hash-${i - 1}`,
				timestamp: new Date(Date.now() - i * 60000),
			});
			createdLogIds.push(logId);
		}

		// Create PHI access logs for another user
		for (let i = 0; i < 2; i++) {
			const logId = uuidv4();
			await AuditLog.create({
				_id: logId,
				tenantId: context.hospitalId,
				eventType: "PHI_VIEW",
				category: "PHI",
				userId: otherUserId,
				userName: "Other User",
				resourceType: "patient",
				resourceId: uuidv4(),
				action: "READ",
				ip: "192.168.1.2",
				details: { fieldsAccessed: ["name"] },
				hash: `other-hash-${i}`,
				previousHash: i === 0 ? "GENESIS" : `other-hash-${i - 1}`,
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

	it("filters PHI access report by userId", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app)
			.get(
				`/api/audit/reports/phi-access?startDate=${startDate}&endDate=${endDate}&userId=${targetUserId}`,
			)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.filters.userId).toBe(targetUserId);

		// All returned logs should belong to target user
		for (const log of response.body.data.logs) {
			expect(log.userId).toBe(targetUserId);
		}
	});
});
