import { Report } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/reports/:reportId/download - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let createdReportId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["REPORT:CREATE", "REPORT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Generate a report first
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-demographics",
				parameters: {},
			});

		createdReportId = response.body.reportId;
	}, 30000);

	afterAll(async () => {
		if (createdReportId) {
			await Report.deleteOne({ _id: createdReportId });
		}
		await context.cleanup();
	});

	it("downloads a completed report successfully", async () => {
		const response = await request(app)
			.get(`/api/reports/${createdReportId}/download`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("reportId");
		expect(response.body).toHaveProperty("reportType");
		expect(response.body).toHaveProperty("format");
		expect(response.body).toHaveProperty("data");
		expect(response.body).toHaveProperty("generatedAt");
	});

	it("returns the correct report data", async () => {
		const response = await request(app)
			.get(`/api/reports/${createdReportId}/download`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.reportId).toBe(createdReportId);
		expect(response.body.reportType).toBe("patient-demographics");
	});

	it("returns report data with correct structure", async () => {
		const response = await request(app)
			.get(`/api/reports/${createdReportId}/download`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const reportData = response.body.data;
		expect(reportData).toHaveProperty("totalPatients");
		expect(reportData).toHaveProperty("byGender");
	});
});
