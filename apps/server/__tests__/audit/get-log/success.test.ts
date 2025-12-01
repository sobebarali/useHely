import { AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/logs/:id - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let testLogId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a test audit log
		testLogId = uuidv4();
		await AuditLog.create({
			_id: testLogId,
			tenantId: context.hospitalId,
			eventType: "PHI_VIEW",
			category: "PHI",
			userId: context.userId,
			userName: "Test User",
			resourceType: "patient",
			resourceId: uuidv4(),
			action: "READ",
			ip: "192.168.1.1",
			userAgent: "Test Agent",
			hash: "test-hash",
			previousHash: "GENESIS",
			timestamp: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await AuditLog.deleteOne({ _id: testLogId });
		await context.cleanup();
	});

	it("returns audit log by id", async () => {
		const response = await request(app)
			.get(`/api/audit/logs/${testLogId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toBeDefined();
		expect(response.body.data.id).toBe(testLogId);
		expect(response.body.data.eventType).toBe("PHI_VIEW");
		expect(response.body.data.category).toBe("PHI");
	});

	it("returns 404 for non-existent log", async () => {
		const nonExistentId = uuidv4();
		const response = await request(app)
			.get(`/api/audit/logs/${nonExistentId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("AUDIT_LOG_NOT_FOUND");
	});
});
