import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/appointments - Returns 403 without permission", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "NURSE",
			rolePermissions: ["PATIENT:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 403 when user lacks APPOINTMENT:CREATE permission", async () => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);

		const payload = {
			patientId: uuidv4(),
			doctorId: uuidv4(),
			departmentId: context.departmentId,
			date: tomorrow.toISOString(),
			timeSlot: {
				start: "10:00",
				end: "10:30",
			},
			type: "CONSULTATION",
		};

		const response = await request(app)
			.post("/api/appointments")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(403);
	});
});
