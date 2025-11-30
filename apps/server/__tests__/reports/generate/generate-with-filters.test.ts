import { Report } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/reports/generate - With filters", () => {
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

	it("generates report with departmentId filter", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-registration",
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

	it("generates report with doctorId filter", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "appointment-summary",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
					doctorId: context.staffId,
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
					patientType: "IPD",
				},
			});

		expect(response.status).toBe(201);

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("generates report with multiple filters combined", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "appointment-summary",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
					departmentId: context.departmentId,
					doctorId: context.staffId,
				},
			});

		expect(response.status).toBe(201);

		if (response.body.reportId) {
			createdReportIds.push(response.body.reportId);
		}
	});

	it("generates doctor-performance report with departmentId filter", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "doctor-performance",
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
