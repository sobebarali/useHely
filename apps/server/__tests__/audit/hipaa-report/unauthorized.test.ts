import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/reports/hipaa - Unauthorized", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let readOnlyContext: AuthTestContext;
	let readOnlyToken: string;

	beforeAll(async () => {
		// Create user without any audit permissions
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["PATIENT:READ", "APPOINTMENT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create user with AUDIT:READ but not AUDIT:REPORT
		readOnlyContext = await createAuthTestContext({
			roleName: "AUDIT_READER",
			rolePermissions: ["AUDIT:READ"],
		});

		const readOnlyTokens = await readOnlyContext.issuePasswordTokens();
		readOnlyToken = readOnlyTokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
		await readOnlyContext.cleanup();
	});

	it("returns 403 when user lacks AUDIT:REPORT permission", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app)
			.get(`/api/audit/reports/hipaa?startDate=${startDate}&endDate=${endDate}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("returns 403 when user only has AUDIT:READ permission", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app)
			.get(`/api/audit/reports/hipaa?startDate=${startDate}&endDate=${endDate}`)
			.set("Authorization", `Bearer ${readOnlyToken}`);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("returns 401 when no auth token provided", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app).get(
			`/api/audit/reports/hipaa?startDate=${startDate}&endDate=${endDate}`,
		);

		expect(response.status).toBe(401);
	});

	it("returns 401 with invalid token", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app)
			.get(`/api/audit/reports/hipaa?startDate=${startDate}&endDate=${endDate}`)
			.set("Authorization", "Bearer invalid-token");

		expect(response.status).toBe(401);
	});
});
