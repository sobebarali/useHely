import { Patient, Prescription } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthTestContext } from "../../helpers/auth-test-context";
import { createAuthTestContext } from "../../helpers/auth-test-context";
import {
	type EncryptionTestContext,
	getEncryptedValueFromDb,
	getRawDocumentFromDb,
	setupEncryptionTestKey,
	verifyFieldDecrypted,
	verifyFieldEncrypted,
} from "../../helpers/encryption-test-helper";

describe("Prescription Model - Field Encryption", () => {
	let context: AuthTestContext;
	let encContext: EncryptionTestContext;
	let prescriptionId: string;
	let patientId: string;

	beforeAll(async () => {
		// Setup encryption key for tests
		encContext = setupEncryptionTestKey();

		// Create test context
		context = await createAuthTestContext({
			roleName: "DOCTOR",
			rolePermissions: [
				"PRESCRIPTION:CREATE",
				"PRESCRIPTION:READ",
				"PATIENT:CREATE",
			],
			createStaff: true,
		});

		// Create patient for prescription
		patientId = uuidv4();
		await Patient.create({
			_id: patientId,
			tenantId: context.hospitalId,
			patientId: `PAT-${Date.now()}`,
			firstName: "John",
			lastName: "Doe",
			dateOfBirth: new Date("1990-01-01"),
			gender: "MALE",
			phone: "+1234567890",
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
			status: "ACTIVE",
		});
	});

	afterAll(async () => {
		// Clean up prescription
		if (prescriptionId) {
			await Prescription.deleteOne({ _id: prescriptionId });
		}

		// Clean up patient
		if (patientId) {
			await Patient.deleteOne({ _id: patientId });
		}

		// Clean up context
		await context.cleanup();

		// Restore original encryption key
		encContext.restoreKey();
	});

	it("should encrypt diagnosis field at rest", async () => {
		// Create prescription with diagnosis
		prescriptionId = uuidv4();
		const prescriptionData = {
			_id: prescriptionId,
			tenantId: context.hospitalId,
			prescriptionId: `RX-${Date.now()}`,
			patientId: patientId,
			doctorId: context.staffId,
			diagnosis: "Type 2 Diabetes Mellitus",
			notes: "Patient shows improvement in blood sugar levels",
			medicines: [
				{
					name: "Metformin",
					dosage: "500mg",
					frequency: "Twice daily",
					duration: "30 days",
					instructions: "Take with meals",
				},
			],
			status: "PENDING",
		};

		await Prescription.create(prescriptionData);

		// Get raw database value (bypassing Mongoose decryption)
		const rawDiagnosis = await getEncryptedValueFromDb(
			"prescription",
			prescriptionId,
			"diagnosis",
		);

		// Verify diagnosis is encrypted with "enc:" prefix
		expect(rawDiagnosis).toMatch(/^enc:/);
	});

	it("should encrypt notes field at rest", async () => {
		// Get raw database value
		const rawNotes = await getEncryptedValueFromDb(
			"prescription",
			prescriptionId,
			"notes",
		);

		// Verify notes is encrypted with "enc:" prefix
		expect(rawNotes).toMatch(/^enc:/);
	});

	it("should decrypt diagnosis and notes when retrieved via Mongoose", async () => {
		// Retrieve prescription via Mongoose (should auto-decrypt)
		const prescription = await Prescription.findById(prescriptionId);

		expect(prescription).toBeDefined();
		expect(prescription?.diagnosis).toBe("Type 2 Diabetes Mellitus");
		expect(prescription?.notes).toBe(
			"Patient shows improvement in blood sugar levels",
		);

		// Verify fields are decrypted (no "enc:" prefix)
		expect(prescription?.diagnosis).not.toMatch(/^enc:/);
		expect(prescription?.notes).not.toMatch(/^enc:/);
	});

	it("should re-encrypt diagnosis on update", async () => {
		// Update diagnosis
		await Prescription.findByIdAndUpdate(prescriptionId, {
			diagnosis: "Type 2 Diabetes Mellitus - Under Control",
		});

		// Get raw value after update
		const rawDiagnosis = await getEncryptedValueFromDb(
			"prescription",
			prescriptionId,
			"diagnosis",
		);

		// Verify it's still encrypted
		expect(rawDiagnosis).toMatch(/^enc:/);

		// Verify decrypted value is updated
		const prescription = await Prescription.findById(prescriptionId);
		expect(prescription?.diagnosis).toBe(
			"Type 2 Diabetes Mellitus - Under Control",
		);
	});

	it("should re-encrypt notes on update", async () => {
		// Update notes
		await Prescription.findByIdAndUpdate(prescriptionId, {
			notes: "Patient responding well to treatment",
		});

		// Get raw value after update
		const rawNotes = await getEncryptedValueFromDb(
			"prescription",
			prescriptionId,
			"notes",
		);

		// Verify it's still encrypted
		expect(rawNotes).toMatch(/^enc:/);

		// Verify decrypted value is updated
		const prescription = await Prescription.findById(prescriptionId);
		expect(prescription?.notes).toBe("Patient responding well to treatment");
	});

	it("should keep other fields unencrypted", async () => {
		const prescription = await Prescription.findById(prescriptionId);

		// Non-encrypted fields should be plaintext
		expect(prescription?.prescriptionId).toBe(prescription?.prescriptionId);
		expect(prescription?.patientId).toBe(patientId);
		expect(prescription?.doctorId).toBe(context.staffId);
		expect(prescription?.status).toBe("PENDING");

		// Medicines array should not be encrypted
		expect(prescription?.medicines).toBeDefined();
		const firstMedicine = prescription?.medicines?.[0] as
			| { name: string; dosage: string }
			| undefined;
		expect(firstMedicine?.name).toBe("Metformin");
		expect(firstMedicine?.dosage).toBe("500mg");

		// Verify they don't have "enc:" prefix
		expect(prescription?.prescriptionId).not.toMatch(/^enc:/);
		expect(prescription?.status).not.toMatch(/^enc:/);
	});

	it("should verify encryption in raw database", async () => {
		const rawDoc = await getRawDocumentFromDb("prescription", prescriptionId);

		// Test verifyFieldEncrypted helper
		expect(verifyFieldEncrypted(rawDoc, "diagnosis")).toBe(true);
		expect(verifyFieldEncrypted(rawDoc, "notes")).toBe(true);

		// Non-encrypted fields should return false
		expect(verifyFieldEncrypted(rawDoc, "prescriptionId")).toBe(false);
		expect(verifyFieldEncrypted(rawDoc, "status")).toBe(false);
	});

	it("should verify decryption in retrieved document", async () => {
		const prescription = await Prescription.findById(prescriptionId);

		// Test verifyFieldDecrypted helper
		expect(
			verifyFieldDecrypted(
				prescription,
				"diagnosis",
				"Type 2 Diabetes Mellitus - Under Control",
			),
		).toBe(true);
		expect(
			verifyFieldDecrypted(
				prescription,
				"notes",
				"Patient responding well to treatment",
			),
		).toBe(true);
	});

	it("should handle minimal prescription data gracefully", async () => {
		// Create prescription with minimal required fields (diagnosis is required)
		const tempPrescriptionId = uuidv4();
		await Prescription.create({
			_id: tempPrescriptionId,
			tenantId: context.hospitalId,
			prescriptionId: `RX-TEMP-${Date.now()}`,
			patientId: patientId,
			doctorId: context.staffId,
			diagnosis: "General checkup",
			medicines: [],
			status: "PENDING",
		});

		// Re-fetch to get decrypted values
		const prescriptionMinimal = await Prescription.findById(tempPrescriptionId);

		expect(prescriptionMinimal).toBeDefined();
		expect(prescriptionMinimal?.diagnosis).toBe("General checkup");
		expect(prescriptionMinimal?.notes).toBeUndefined();

		// Clean up
		await Prescription.deleteOne({ _id: tempPrescriptionId });
	});
});
