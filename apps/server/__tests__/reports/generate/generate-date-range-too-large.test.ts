import { Report } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/reports/generate - Date range too large", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdReportIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["REPORT:CREATE", "REPORT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		// Clean up any created reports
		if (createdReportIds.length > 0) {
			await Report.deleteMany({ _id: { $in: createdReportIds } });
		}
		await context.cleanup();
	});

	it("returns 400 when date range exceeds 365 days", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-registration",
				parameters: {
					startDate: "2023-01-01",
					endDate: "2024-06-01", // More than 365 days
				},
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("DATE_RANGE_TOO_LARGE");
	});

	it("returns 400 when date range is exactly 366 days", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "appointment-summary",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2025-01-02", // 366 days
				},
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("DATE_RANGE_TOO_LARGE");
	});

	it("returns 400 when date range is 2 years", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "prescription-summary",
				parameters: {
					startDate: "2022-01-01",
					endDate: "2024-01-01",
				},
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("DATE_RANGE_TOO_LARGE");
	});
});
