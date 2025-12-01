import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/audit/verify - Missing Date Range", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:MANAGE"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 400 when startDate is missing", async () => {
		const endDate = new Date().toISOString();

		const response = await request(app)
			.post("/api/audit/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				endDate,
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when endDate is missing", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

		const response = await request(app)
			.post("/api/audit/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				startDate,
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when both dates are missing", async () => {
		const response = await request(app)
			.post("/api/audit/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});
});
