import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/reports/generate - Invalid report type", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["REPORT:CREATE", "REPORT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 400 when report type is unknown", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "unknown-report-type",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
				},
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when report type is empty", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
				},
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when report type is missing", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
				},
			});

		expect(response.status).toBe(400);
	});
});
