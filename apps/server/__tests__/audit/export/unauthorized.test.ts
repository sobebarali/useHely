import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/audit/export - Unauthorized", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let readOnlyContext: AuthTestContext;
	let readOnlyToken: string;
	let reportContext: AuthTestContext;
	let reportToken: string;

	beforeAll(async () => {
		// Create user without any audit permissions
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["PATIENT:READ", "APPOINTMENT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create user with AUDIT:READ but not AUDIT:EXPORT
		readOnlyContext = await createAuthTestContext({
			roleName: "AUDIT_READER",
			rolePermissions: ["AUDIT:READ"],
		});

		const readOnlyTokens = await readOnlyContext.issuePasswordTokens();
		readOnlyToken = readOnlyTokens.accessToken;

		// Create user with AUDIT:REPORT but not AUDIT:EXPORT
		reportContext = await createAuthTestContext({
			roleName: "AUDIT_REPORTER",
			rolePermissions: ["AUDIT:REPORT"],
		});

		const reportTokens = await reportContext.issuePasswordTokens();
		reportToken = reportTokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
		await readOnlyContext.cleanup();
		await reportContext.cleanup();
	});

	it("returns 403 when user lacks AUDIT:EXPORT permission", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app)
			.post("/api/audit/export")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				startDate,
				endDate,
				format: "json",
			});

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("returns 403 when user only has AUDIT:READ permission", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app)
			.post("/api/audit/export")
			.set("Authorization", `Bearer ${readOnlyToken}`)
			.send({
				startDate,
				endDate,
				format: "json",
			});

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("returns 403 when user only has AUDIT:REPORT permission", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app)
			.post("/api/audit/export")
			.set("Authorization", `Bearer ${reportToken}`)
			.send({
				startDate,
				endDate,
				format: "json",
			});

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("returns 401 when no auth token provided", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app).post("/api/audit/export").send({
			startDate,
			endDate,
			format: "json",
		});

		expect(response.status).toBe(401);
	});

	it("returns 401 with invalid token", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app)
			.post("/api/audit/export")
			.set("Authorization", "Bearer invalid-token")
			.send({
				startDate,
				endDate,
				format: "json",
			});

		expect(response.status).toBe(401);
	});
});
