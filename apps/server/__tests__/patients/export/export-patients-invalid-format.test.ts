import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/patients/export - Invalid format", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["PATIENT:READ", "PATIENT:MANAGE"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 400 when format is not specified", async () => {
		const response = await request(app)
			.get("/api/patients/export")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when format is invalid", async () => {
		const response = await request(app)
			.get("/api/patients/export")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ format: "xlsx" }); // Not supported

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when format is empty", async () => {
		const response = await request(app)
			.get("/api/patients/export")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ format: "" });

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});
});
