import { AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/logs - Filter by Date Range", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdLogIds: string[] = [];

	// Create logs at specific times
	const now = new Date();
	const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
	const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
	const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create audit logs at different times
		const timestamps = [now, oneHourAgo, twoHoursAgo, threeHoursAgo];
		for (let i = 0; i < timestamps.length; i++) {
			const logId = uuidv4();
			await AuditLog.create({
				_id: logId,
				tenantId: context.hospitalId,
				eventType: "PHI_VIEW",
				category: "PHI",
				userId: context.userId,
				userName: "Test User",
				resourceType: "patient",
				resourceId: uuidv4(),
				action: "READ",
				ip: "192.168.1.1",
				hash: `date-hash-${i}`,
				previousHash: i === 0 ? "GENESIS" : `date-hash-${i - 1}`,
				timestamp: timestamps[i],
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

	it("filters logs by startDate", async () => {
		const startDate = twoHoursAgo.toISOString();

		const response = await request(app)
			.get(`/api/audit/logs?startDate=${startDate}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);

		// All returned logs should be after startDate
		for (const log of response.body.data) {
			expect(new Date(log.timestamp).getTime()).toBeGreaterThanOrEqual(
				twoHoursAgo.getTime(),
			);
		}
	});

	it("filters logs by endDate", async () => {
		const endDate = oneHourAgo.toISOString();

		const response = await request(app)
			.get(`/api/audit/logs?endDate=${endDate}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);

		// All returned logs should be before or at endDate
		for (const log of response.body.data) {
			expect(new Date(log.timestamp).getTime()).toBeLessThanOrEqual(
				oneHourAgo.getTime(),
			);
		}
	});

	it("filters logs by date range (startDate and endDate)", async () => {
		const startDate = threeHoursAgo.toISOString();
		const endDate = oneHourAgo.toISOString();

		const response = await request(app)
			.get(`/api/audit/logs?startDate=${startDate}&endDate=${endDate}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);

		// All returned logs should be within date range
		for (const log of response.body.data) {
			const logTime = new Date(log.timestamp).getTime();
			expect(logTime).toBeGreaterThanOrEqual(threeHoursAgo.getTime());
			expect(logTime).toBeLessThanOrEqual(oneHourAgo.getTime());
		}
	});
});
