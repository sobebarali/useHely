import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("DELETE /api/appointments/:id - Returns 404 for non-existent appointment", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["APPOINTMENT:DELETE", "APPOINTMENT:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 404 for non-existent appointment", async () => {
		const fakeId = uuidv4();
		const response = await request(app)
			.delete(`/api/appointments/${fakeId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("NOT_FOUND");
	});
});
