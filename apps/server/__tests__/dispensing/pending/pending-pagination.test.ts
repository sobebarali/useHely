import { Dispensing, Patient, Prescription } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/dispensing/pending - Pagination", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	const prescriptionIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["DISPENSING:READ"],
			includeDepartment: true,
			pricingTier: "PROFESSIONAL",
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a test patient
		patientId = uuidv4();
		await Patient.create({
			_id: patientId,
			tenantId: context.hospitalId,
			patientId: `${context.hospitalId}-P-${context.uniqueId}`,
			firstName: "Test",
			lastName: "Patient",
			dateOfBirth: new Date("1990-01-01"),
			gender: "MALE",
			phone: `+1-${context.uniqueId}`,
			email: `patient-${context.uniqueId}@test.com`,
			emergencyContact: {
				name: "Emergency Contact",
				relationship: "Spouse",
				phone: "+1-555-1234",
			},
			patientType: "OPD",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create 5 pending prescriptions for pagination testing
		for (let i = 0; i < 5; i++) {
			const prescriptionId = uuidv4();
			prescriptionIds.push(prescriptionId);

			await Prescription.create({
				_id: prescriptionId,
				tenantId: context.hospitalId,
				prescriptionId: `${context.hospitalId}-RX-${context.uniqueId}-${i}`,
				patientId,
				doctorId: context.staffId,
				diagnosis: `Test diagnosis ${i}`,
				medicines: [
					{
						_id: uuidv4(),
						name: `Medicine ${i}`,
						dosage: "500mg",
						frequency: "3 times daily",
						duration: "5 days",
						quantity: 15,
						dispensed: false,
					},
				],
				status: "PENDING",
				createdAt: new Date(Date.now() - i * 60000),
				updatedAt: new Date(),
			});
		}
	}, 30000);

	afterAll(async () => {
		await Dispensing.deleteMany({ tenantId: context.hospitalId });
		await Prescription.deleteMany({ tenantId: context.hospitalId });
		await Patient.deleteOne({ _id: patientId });
		await context.cleanup();
	});

	it("returns paginated results with custom page and limit", async () => {
		const response = await request(app)
			.get("/api/dispensing/pending")
			.query({ page: 1, limit: 2 })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeLessThanOrEqual(2);
		expect(response.body.pagination.page).toBe(1);
		expect(response.body.pagination.limit).toBe(2);
		expect(response.body.pagination.totalPages).toBeGreaterThanOrEqual(1);
	});

	it("returns second page of results", async () => {
		const response = await request(app)
			.get("/api/dispensing/pending")
			.query({ page: 2, limit: 2 })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.pagination.page).toBe(2);
	});

	it("sorts results by createdAt in descending order", async () => {
		const response = await request(app)
			.get("/api/dispensing/pending")
			.query({ sortOrder: "desc" })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		if (response.body.data.length >= 2) {
			const dates = response.body.data.map((p: { createdAt: string }) =>
				new Date(p.createdAt).getTime(),
			);
			for (let i = 1; i < dates.length; i++) {
				expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
			}
		}
	});
});
