import { Report } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/reports/generate - With groupBy", () => {
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
		if (createdReportIds.length > 0) {
			await Report.deleteMany({ _id: { $in: createdReportIds } });
		}
		await context.cleanup();
	});

	it("generates patient registration report with groupBy day", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-registration",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
					groupBy: "day",
				},
			});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("reportId");

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("generates patient registration report with groupBy week", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-registration",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
					groupBy: "week",
				},
			});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("reportId");

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("generates patient registration report with groupBy month", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-registration",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-06-30",
					groupBy: "month",
				},
			});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("reportId");

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("generates appointment summary report with groupBy day", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "appointment-summary",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
					groupBy: "day",
				},
			});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("reportId");

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("generates appointment summary report with groupBy month", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "appointment-summary",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-06-30",
					groupBy: "month",
				},
			});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("reportId");

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});
});
