import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/patients - Unauthorized access", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create context WITHOUT PATIENT:READ permission
		context = await createAuthTestContext({
			rolePermissions: ["PATIENT:CREATE"], // Only create, no read
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 403 when user lacks PATIENT:READ permission", async () => {
		const response = await request(app)
			.get("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ page: 1, limit: 10 });

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("returns 401 when no authorization token is provided", async () => {
		const response = await request(app)
			.get("/api/patients")
			.query({ page: 1, limit: 10 });

		expect(response.status).toBe(401);
		expect(response.body.code).toBe("UNAUTHORIZED");
	});
});
