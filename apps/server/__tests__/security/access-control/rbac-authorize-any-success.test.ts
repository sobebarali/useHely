import { Patient } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";
import { cleanupSecurityEvents } from "../../helpers/security-test-helper";

describe("RBAC Authorization - Any Permission (OR Logic)", () => {
	let readerContext: AuthTestContext;
	let writerContext: AuthTestContext;
	let noneContext: AuthTestContext;
	let testPatientId: string;

	beforeAll(async () => {
		// Context with PATIENT:READ permission only
		readerContext = await createAuthTestContext({
			roleName: "PATIENT_READER",
			rolePermissions: ["PATIENT:READ"],
			createStaff: true,
		});

		// Context with PATIENT:CREATE permission only
		writerContext = await createAuthTestContext({
			roleName: "PATIENT_CREATOR",
			rolePermissions: ["PATIENT:CREATE"],
			createStaff: true,
		});

		// Context with no relevant permissions
		noneContext = await createAuthTestContext({
			roleName: "NO_ACCESS",
			rolePermissions: ["ROLE:READ"],
			createStaff: true,
		});

		// Create a test patient for GET requests
		testPatientId = uuidv4();
		await Patient.create({
			_id: testPatientId,
			tenantId: readerContext.hospitalId,
			patientId: `PAT-${Date.now()}`,
			firstName: "Test",
			lastName: "Patient",
			dateOfBirth: new Date("1990-01-01"),
			gender: "MALE",
			phone: `+1-${Date.now()}`,
			email: `test-${Date.now()}@example.com`,
			emergencyContact: {
				name: "Emergency Contact",
				relationship: "Spouse",
				phone: "+0987654321",
			},
			patientType: "OPD",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 60000);

	afterAll(async () => {
		await Patient.deleteOne({ _id: testPatientId });
		await cleanupSecurityEvents(readerContext.hospitalId);
		await cleanupSecurityEvents(writerContext.hospitalId);
		await cleanupSecurityEvents(noneContext.hospitalId);
		await readerContext.cleanup();
		await writerContext.cleanup();
		await noneContext.cleanup();
	});

	it("should allow access when user has at least one of the required permissions", async () => {
		const tokens = await readerContext.issuePasswordTokens();

		// PATIENT:READ should allow listing patients
		const response = await request(app)
			.get("/api/patients")
			.set("Authorization", `Bearer ${tokens.accessToken}`);

		expect(response.status).toBe(200);
	});

	it("should allow access with any matching permission (OR logic)", async () => {
		const tokens = await writerContext.issuePasswordTokens();

		// PATIENT:CREATE should allow creating patients
		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${tokens.accessToken}`)
			.send({
				firstName: "New",
				lastName: "Patient",
				dateOfBirth: new Date("1985-05-15").toISOString(),
				gender: "FEMALE",
				phone: `+1-${Date.now()}`,
				email: `new-${Date.now()}@example.com`,
				address: {
					street: "123 Test St",
					city: "Test City",
					state: "Test State",
					postalCode: "12345",
					country: "Test Country",
				},
				emergencyContact: {
					name: "Emergency Contact",
					relationship: "Spouse",
					phone: "+1-555-0100",
				},
				patientType: "OPD",
			});

		// Should succeed with PATIENT:CREATE permission
		expect([200, 201]).toContain(response.status);
	});

	it("should deny access when user has none of the required permissions", async () => {
		const tokens = await noneContext.issuePasswordTokens();

		const response = await request(app)
			.get("/api/patients")
			.set("Authorization", `Bearer ${tokens.accessToken}`);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});
});
