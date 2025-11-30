import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/appointments/:id/complete - Returns 404 for non-existent appointment", () => {
	let doctorContext: AuthTestContext;
	let doctorAccessToken: string;

	beforeAll(async () => {
		doctorContext = await createAuthTestContext({
			roleName: "DOCTOR",
			rolePermissions: ["APPOINTMENT:UPDATE", "APPOINTMENT:READ"],
			includeDepartment: true,
		});
		const tokens = await doctorContext.issuePasswordTokens();
		doctorAccessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await doctorContext.cleanup();
	});

	it("returns 404 for non-existent appointment", async () => {
		const fakeId = uuidv4();
		const response = await request(app)
			.post(`/api/appointments/${fakeId}/complete`)
			.set("Authorization", `Bearer ${doctorAccessToken}`);

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("NOT_FOUND");
	});
});
