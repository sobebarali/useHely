import crypto from "node:crypto";
import { AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/audit/verify - Tampered Chain", () => {
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

		// Create audit logs with a tampered hash (broken chain)
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

			// For the second entry, use an incorrect hash (simulate tampering)
			let hash: string;
			if (i === 1) {
				// Tampered hash - doesn't match the expected computation
				hash = "tampered-invalid-hash-value";
			} else {
				hash = computeHash(entryData, previousHash);
			}

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

	it("detects tampered audit log chain", async () => {
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
		// The chain should be detected as tampered
		expect(response.body.data.verified).toBe(false);
		expect(response.body.data.chainIntact).toBe(false);
	});
});
