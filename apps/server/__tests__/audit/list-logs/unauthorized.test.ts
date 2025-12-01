import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/logs - Unauthorized", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create user without AUDIT:READ permission
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["PATIENT:READ", "APPOINTMENT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 403 when user lacks AUDIT:READ permission", async () => {
		const response = await request(app)
			.get("/api/audit/logs")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("returns 401 when no auth token provided", async () => {
		const response = await request(app).get("/api/audit/logs");

		expect(response.status).toBe(401);
	});

	it("returns 401 with invalid token", async () => {
		const response = await request(app)
			.get("/api/audit/logs")
			.set("Authorization", "Bearer invalid-token");

		expect(response.status).toBe(401);
	});
});
