import { Role } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/roles - Duplicate name handling", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let existingRoleId: string;
	const roleName = `Duplicate-${uuidv4()}`;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["ROLE:CREATE", "ROLE:READ"],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		const role = await Role.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			name: roleName,
			description: "Existing role",
			permissions: ["PATIENT:READ"],
			isSystem: false,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		existingRoleId = String(role._id);
	}, 30000);

	afterAll(async () => {
		await Role.deleteOne({ _id: existingRoleId });
		await context.cleanup();
	});

	it("returns 409 when role name already exists within the tenant", async () => {
		const response = await request(app)
			.post("/api/roles")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				name: roleName,
				description: "Duplicate attempt",
				permissions: ["PATIENT:READ"],
			});

		expect(response.status).toBe(409);
		expect(response.body).toMatchObject({
			code: "ROLE_EXISTS",
			message: "A role with this name already exists",
		});
	});
});
