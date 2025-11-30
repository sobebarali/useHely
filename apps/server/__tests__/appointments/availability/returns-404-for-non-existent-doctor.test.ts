import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/appointments/availability/:doctorId - Returns 404 for non-existent doctor", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["DOCTOR:READ", "APPOINTMENT:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 404 for non-existent doctor", async () => {
		const fakeId = uuidv4();
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const dateStr = tomorrow.toISOString().split("T")[0];

		const response = await request(app)
			.get(`/api/appointments/availability/${fakeId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ date: dateStr });

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("DOCTOR_NOT_FOUND");
	});
});
