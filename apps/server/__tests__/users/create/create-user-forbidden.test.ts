import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/users - Forbidden (missing permission)", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create context WITHOUT USER:CREATE permission
		context = await createAuthTestContext({
			rolePermissions: ["USER:READ"], // Only read permission, not create
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 403 when user lacks USER:CREATE permission", async () => {
		const payload = {
			firstName: "John",
			lastName: "Doe",
			email: `john.doe.${context.uniqueId}@test.com`,
			phone: "+1234567890",
			department: context.departmentId,
			roles: context.roleIds,
		};

		const response = await request(app)
			.post("/api/users")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});
});
