import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/auth/me - Staff profile response", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			includeDepartment: true,
			rolePermissions: [
				"ROLE:CREATE",
				"ROLE:READ",
				"PATIENT:READ",
				"PATIENT:UPDATE",
			],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns the authenticated staff member with roles and attributes", async () => {
		const response = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		expect(response.body).toMatchObject({
			id: context.userId,
			email: context.email,
			tenantId: context.hospitalId,
			department: context.departmentName,
		});

		expect(Array.isArray(response.body.roles)).toBe(true);
		expect(response.body.roles[0]).toHaveProperty("name", context.roleNames[0]);

		expect(response.body.permissions).toEqual(
			expect.arrayContaining(["PATIENT:READ"]),
		);

		expect(response.body.attributes).toMatchObject({
			department: context.departmentId,
		});
	});
});
