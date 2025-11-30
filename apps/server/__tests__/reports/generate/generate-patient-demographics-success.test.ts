import { Report } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/reports/generate - Patient demographics success", () => {
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

	it("generates patient demographics report without date range", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-demographics",
				parameters: {},
			});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("reportId");
		expect(response.body.reportType).toBe("patient-demographics");

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("generates patient demographics report with asOfDate", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-demographics",
				parameters: {
					asOfDate: "2024-06-15",
				},
			});

		expect(response.status).toBe(201);
		expect(response.body.reportType).toBe("patient-demographics");

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("returns correct data structure for patient demographics", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-demographics",
				parameters: {},
			});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("data");
		expect(response.body).toHaveProperty("summary");
		expect(response.body).toHaveProperty("generatedAt");

		const reportData = response.body.data;
		expect(reportData).toHaveProperty("totalPatients");
		expect(reportData).toHaveProperty("byGender");
		expect(reportData).toHaveProperty("byAgeGroup");

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("generates patient demographics with patientType filter", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-demographics",
				parameters: {
					patientType: "OPD",
				},
			});

		expect(response.status).toBe(201);

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});
});
