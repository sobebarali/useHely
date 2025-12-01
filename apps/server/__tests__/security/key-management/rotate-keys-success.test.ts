import { KeyRotation, Patient, Prescription, Vitals } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";
import {
	type EncryptionTestContext,
	setupEncryptionTestKey,
} from "../../helpers/encryption-test-helper";
import { cleanupSecurityEvents } from "../../helpers/security-test-helper";

describe("POST /api/security/keys/rotate - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let encContext: EncryptionTestContext;
	const createdPatientIds: string[] = [];
	const createdPrescriptionIds: string[] = [];
	const createdVitalsIds: string[] = [];

	beforeAll(async () => {
		// Setup encryption test key
		encContext = setupEncryptionTestKey();

		// Create test context with SECURITY:MANAGE permission
		context = await createAuthTestContext({
			roleName: "SECURITY_ADMIN",
			rolePermissions: ["SECURITY:READ", "SECURITY:MANAGE"],
			createStaff: true,
			includeDepartment: true,
		});

		// Get access token
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create test data to be re-encrypted
		const patientId = uuidv4();
		await Patient.create({
			_id: patientId,
			tenantId: context.hospitalId,
			patientId: `PAT-${Date.now()}`,
			firstName: "John",
			lastName: "Doe",
			dateOfBirth: new Date("1990-01-01"),
			gender: "MALE",
			phone: "+1234567890",
			email: `test-${Date.now()}@example.com`,
			status: "ACTIVE",
			address: {
				street: "123 Main St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			emergencyContact: {
				name: "Jane Doe",
				relationship: "Spouse",
				phone: "+0987654321",
			},
			patientType: "OPD",
		});
		createdPatientIds.push(patientId);
	}, 60000);

	afterAll(async () => {
		// Clean up test data
		for (const id of createdPatientIds) {
			await Patient.deleteOne({ _id: id });
		}
		for (const id of createdPrescriptionIds) {
			await Prescription.deleteOne({ _id: id });
		}
		for (const id of createdVitalsIds) {
			await Vitals.deleteOne({ _id: id });
		}

		// Clean up key rotation records created during tests
		await KeyRotation.deleteMany({ rotatedBy: context.userId });

		await cleanupSecurityEvents(context.hospitalId);
		await context.cleanup();

		// Restore original encryption key
		encContext.restoreKey();
	});

	it("should generate new 256-bit master key", async () => {
		const response = await request(app)
			.post("/api/security/keys/rotate")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("newKeyId");

		// New key ID should be 8 characters (first 8 chars of 64-char hex key)
		const newKeyId = response.body.data.newKeyId;
		expect(typeof newKeyId).toBe("string");
		expect(newKeyId.length).toBe(8);
	});

	it("should return previous key ID", async () => {
		// Get current key status first
		const statusResponse = await request(app)
			.get("/api/security/keys/status")
			.set("Authorization", `Bearer ${accessToken}`);

		const currentKeyId = statusResponse.body.data.currentKeyId;

		const response = await request(app)
			.post("/api/security/keys/rotate")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveProperty("previousKeyId");
		expect(response.body.data.previousKeyId).toBe(currentKeyId);
	});

	it("should create KeyRotation audit record", async () => {
		const response = await request(app)
			.post("/api/security/keys/rotate")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// Verify rotation record was created
		const rotation = await KeyRotation.findOne({
			rotatedBy: context.userId,
		}).sort({ rotatedAt: -1 });

		expect(rotation).toBeDefined();
		expect(rotation?.keyId).toBe(response.body.data.newKeyId);
		expect(rotation?.recordsReEncrypted).toBeGreaterThanOrEqual(0);
	});

	it("should return breakdown of re-encrypted records", async () => {
		const response = await request(app)
			.post("/api/security/keys/rotate")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveProperty("breakdown");

		const breakdown = response.body.data.breakdown;
		expect(breakdown).toHaveProperty("patients");
		expect(breakdown).toHaveProperty("prescriptions");
		expect(breakdown).toHaveProperty("vitals");
		expect(breakdown).toHaveProperty("staff");

		// All counts should be non-negative numbers
		expect(typeof breakdown.patients).toBe("number");
		expect(breakdown.patients).toBeGreaterThanOrEqual(0);
	});

	it("should return rotatedAt timestamp", async () => {
		const response = await request(app)
			.post("/api/security/keys/rotate")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveProperty("rotatedAt");

		// Should be valid ISO 8601 timestamp
		const rotatedAt = new Date(response.body.data.rotatedAt);
		expect(rotatedAt.getTime()).not.toBeNaN();

		// Should be recent (within last minute)
		const now = new Date();
		const diff = now.getTime() - rotatedAt.getTime();
		expect(diff).toBeLessThan(60000);
	});

	it("should return rotatedBy user ID", async () => {
		const response = await request(app)
			.post("/api/security/keys/rotate")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveProperty("rotatedBy");
		expect(response.body.data.rotatedBy).toBe(context.userId);
	});

	it("should require authentication", async () => {
		const response = await request(app).post("/api/security/keys/rotate");

		expect(response.status).toBe(401);
	});
});
