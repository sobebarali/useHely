import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory/expiring - Forbidden", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create user without INVENTORY:READ permission
		context = await createAuthTestContext({
			rolePermissions: ["PATIENTS:READ"], // Different permission
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 403 when user lacks INVENTORY:READ permission", async () => {
		const response = await request(app)
			.get("/api/inventory/expiring")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(403);
	});
});
