import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/users - Fail when user already staff in same tenant", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["USER:CREATE", "USER:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("should return 409 when trying to add user who is already staff in the same tenant", async () => {
		// The context already has a user (context.email) who is staff in this tenant
		// Try to add the same email again
		const payload = {
			firstName: "Duplicate",
			lastName: "User",
			email: context.email, // Email of existing staff in this tenant
			phone: "+1234567890",
			department: context.departmentId,
			roles: context.roleIds,
			shift: "MORNING",
		};

		const response = await request(app)
			.post("/api/users")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(409);
		expect(response.body.code).toBe("EMAIL_EXISTS");
		expect(response.body.message).toContain("already in use");
	});

	it("should mention the user is already a member of this organization", async () => {
		const payload = {
			firstName: "Another",
			lastName: "Duplicate",
			email: context.email,
			phone: "+1234567891",
			department: context.departmentId,
			roles: context.roleIds,
			shift: "EVENING",
		};

		const response = await request(app)
			.post("/api/users")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(409);
		// Message should indicate the user is already part of this organization
		expect(response.body.message.toLowerCase()).toMatch(
			/already|organization|tenant|member/i,
		);
	});
});
