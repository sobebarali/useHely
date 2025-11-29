import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/patients/export - Unauthorized access", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create context WITHOUT PATIENT:MANAGE permission
		context = await createAuthTestContext({
			rolePermissions: ["PATIENT:READ"], // Only read, no manage
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 403 when user lacks PATIENT:MANAGE permission", async () => {
		const response = await request(app)
			.get("/api/patients/export")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ format: "csv" });

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("returns 401 when no authorization token is provided", async () => {
		const response = await request(app)
			.get("/api/patients/export")
			.query({ format: "csv" });

		expect(response.status).toBe(401);
		expect(response.body.code).toBe("UNAUTHORIZED");
	});
});
