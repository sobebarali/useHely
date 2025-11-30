import { Report } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/reports/generate - Medicine usage success", () => {
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

	it("generates medicine usage report with date range", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "medicine-usage",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
				},
			});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("reportId");
		expect(response.body.reportType).toBe("medicine-usage");

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("returns correct data structure for medicine usage", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "medicine-usage",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-03-31",
				},
			});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("data");
		expect(response.body.data).toHaveProperty("totalDispensed");
		expect(response.body.data).toHaveProperty("byMedicine");
		expect(response.body.data).toHaveProperty("byDepartment");

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("generates with medicine filter", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "medicine-usage",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
					medicineId: "med-123",
				},
			});

		expect(response.status).toBe(201);

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});
});
