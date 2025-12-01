import { AuditLog } from "@hms/db";
import crypto from "crypto";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/audit/verify - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdLogIds: string[] = [];

	function computeHash(data: string, previousHash: string): string {
		return crypto
			.createHash("sha256")
			.update(data + previousHash)
			.digest("hex");
	}

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:MANAGE"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create test audit logs with valid hash chain
		let previousHash = "GENESIS";
		for (let i = 0; i < 3; i++) {
			const logId = uuidv4();
			const timestamp = new Date(Date.now() - (2 - i) * 60000);

			const entryData = JSON.stringify({
				eventId: logId,
				tenantId: context.hospitalId,
				eventType: "PHI_VIEW",
				category: "PHI",
				userId: context.userId,
				userName: "Test User",
				action: "READ",
				resourceType: "patient",
				resourceId: `patient-${i}`,
				ip: "192.168.1.1",
				userAgent: undefined,
				sessionId: undefined,
				details: undefined,
				before: undefined,
				after: undefined,
				timestamp: timestamp.toISOString(),
			});

			const hash = computeHash(entryData, previousHash);

			await AuditLog.create({
				_id: logId,
				tenantId: context.hospitalId,
				eventType: "PHI_VIEW",
				category: "PHI",
				userId: context.userId,
				userName: "Test User",
				resourceType: "patient",
				resourceId: `patient-${i}`,
				action: "READ",
				ip: "192.168.1.1",
				hash,
				previousHash,
				timestamp,
			});

			createdLogIds.push(logId);
			previousHash = hash;
		}
	}, 30000);

	afterAll(async () => {
		for (const logId of createdLogIds) {
			await AuditLog.deleteOne({ _id: logId });
		}
		await context.cleanup();
	});

	it("verifies chain integrity", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app)
			.post("/api/audit/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				startDate,
				endDate,
			});

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.verified).toBeDefined();
		expect(response.body.data.entriesChecked).toBeGreaterThanOrEqual(3);
		expect(response.body.data.verifiedAt).toBeDefined();
	});

	it("returns empty result for no logs in range", async () => {
		// Use dates far in the past
		const startDate = new Date("2000-01-01").toISOString();
		const endDate = new Date("2000-01-02").toISOString();

		const response = await request(app)
			.post("/api/audit/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				startDate,
				endDate,
			});

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.verified).toBe(true);
		expect(response.body.data.entriesChecked).toBe(0);
		expect(response.body.data.chainIntact).toBe(true);
	});
});
