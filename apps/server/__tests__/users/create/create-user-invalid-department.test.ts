import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/users - Invalid department ID", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["USER:CREATE"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 400 when department ID does not exist", async () => {
		const payload = {
			firstName: "John",
			lastName: "Doe",
			email: `john.doe.${context.uniqueId}@test.com`,
			phone: "+1234567890",
			department: "non-existent-department-id", // Invalid department
			roles: context.roleIds,
		};

		const response = await request(app)
			.post("/api/users")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
		expect(response.body.message).toContain("Invalid department");
	});
});
