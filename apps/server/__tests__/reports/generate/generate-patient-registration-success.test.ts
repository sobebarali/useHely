import { Report } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/reports/generate - Patient registration success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdReportIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["REPORT:CREATE", "REPORT:READ"],
			includeDepartment: true,
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		if (createdReportIds.length > 0) {
			await Report.deleteMany({ _id: { $in: createdReportIds } });
		}
		await context.cleanup();
	});

	it("generates patient registration report with date range", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-registration",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
				},
			});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("reportId");
		expect(response.body.reportType).toBe("patient-registration");

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("returns correct data structure for patient registration", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-registration",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-03-31",
				},
			});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("data");
		expect(response.body).toHaveProperty("summary");
		expect(response.body).toHaveProperty("generatedAt");

		const reportData = response.body.data;
		expect(reportData).toHaveProperty("totalRegistrations");
		expect(reportData).toHaveProperty("byType");
		expect(reportData.byType).toHaveProperty("opd");
		expect(reportData.byType).toHaveProperty("ipd");

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("accepts exactly 365 days date range", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-registration",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-12-31",
				},
			});

		expect(response.status).toBe(201);

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("generates report with patientType filter", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-registration",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
					patientType: "OPD",
				},
			});

		expect(response.status).toBe(201);

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});
});
