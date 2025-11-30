import { Report } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/reports/generate - Department utilization success", () => {
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

	it("generates department utilization report with date range", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "department-utilization",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
				},
			});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("reportId");
		expect(response.body.reportType).toBe("department-utilization");

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("returns correct data structure for department utilization", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "department-utilization",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-03-31",
				},
			});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("data");
		expect(response.body.data).toHaveProperty("departments");
		expect(response.body.data.departments).toBeInstanceOf(Array);

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("generates with specific department filter", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "department-utilization",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
					departmentId: context.departmentId,
				},
			});

		expect(response.status).toBe(201);

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});
});
