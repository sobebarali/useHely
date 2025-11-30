/**
 * Rotate Keys Repository
 *
 * Database operations for key rotation and re-encryption
 */

import { KeyRotation, Patient, Prescription, Staff, Vitals } from "@hms/db";
import { v4 as uuidv4 } from "uuid";

/**
 * Create a key rotation record
 */
export async function createKeyRotation({
	keyId,
	rotatedBy,
	recordsReEncrypted,
}: {
	keyId: string;
	rotatedBy: string;
	recordsReEncrypted: number;
}): Promise<{
	_id: string;
	keyId: string;
	rotatedAt: Date;
	rotatedBy: string;
	recordsReEncrypted: number;
}> {
	const now = new Date();
	const rotation = await KeyRotation.create({
		_id: uuidv4(),
		keyId,
		rotatedAt: now,
		rotatedBy,
		recordsReEncrypted,
		createdAt: now,
		updatedAt: now,
	});

	return {
		_id: rotation._id as string,
		keyId: rotation.keyId,
		rotatedAt: rotation.rotatedAt,
		rotatedBy: rotation.rotatedBy,
		recordsReEncrypted: rotation.recordsReEncrypted,
	};
}

/**
 * Re-encrypt patient records
 * Returns the number of records re-encrypted
 */
export async function reEncryptPatients({
	decrypt,
	encrypt,
	oldKey,
	newKey,
}: {
	decrypt: (encrypted: string, key: string) => string;
	encrypt: (plaintext: string, key: string) => string;
	oldKey: string;
	newKey: string;
}): Promise<number> {
	// Fetch all patients (raw data without automatic decryption)
	const patients = await Patient.find().lean();

	let reEncryptedCount = 0;

	for (const patient of patients) {
		const updates: Record<string, string> = {};

		// Re-encrypt top-level fields
		for (const field of ["firstName", "lastName", "phone", "email"]) {
			const value = (patient as Record<string, unknown>)[field];
			if (value && typeof value === "string" && value.startsWith("enc:")) {
				const encryptedValue = value.substring(4); // Remove "enc:" prefix
				const decrypted = decrypt(encryptedValue, oldKey);
				const encrypted = encrypt(decrypted, newKey);
				updates[field] = `enc:${encrypted}`;
			}
		}

		// Re-encrypt nested address fields
		if (patient.address) {
			const addressFields = [
				"street",
				"city",
				"state",
				"postalCode",
				"country",
			];
			for (const field of addressFields) {
				const value = (patient.address as Record<string, unknown>)[field];
				if (value && typeof value === "string" && value.startsWith("enc:")) {
					const encryptedValue = value.substring(4);
					const decrypted = decrypt(encryptedValue, oldKey);
					const encrypted = encrypt(decrypted, newKey);
					updates[`address.${field}`] = `enc:${encrypted}`;
				}
			}
		}

		// Re-encrypt nested emergency contact fields
		if (patient.emergencyContact) {
			const contactFields = ["name", "phone", "relationship"];
			for (const field of contactFields) {
				const value = (patient.emergencyContact as Record<string, unknown>)[
					field
				];
				if (value && typeof value === "string" && value.startsWith("enc:")) {
					const encryptedValue = value.substring(4);
					const decrypted = decrypt(encryptedValue, oldKey);
					const encrypted = encrypt(decrypted, newKey);
					updates[`emergencyContact.${field}`] = `enc:${encrypted}`;
				}
			}
		}

		// Update patient if any fields were re-encrypted
		if (Object.keys(updates).length > 0) {
			await Patient.updateOne({ _id: patient._id }, { $set: updates });
			reEncryptedCount++;
		}
	}

	return reEncryptedCount;
}

/**
 * Re-encrypt prescription records
 */
export async function reEncryptPrescriptions({
	decrypt,
	encrypt,
	oldKey,
	newKey,
}: {
	decrypt: (encrypted: string, key: string) => string;
	encrypt: (plaintext: string, key: string) => string;
	oldKey: string;
	newKey: string;
}): Promise<number> {
	const prescriptions = await Prescription.find().lean();
	let reEncryptedCount = 0;

	for (const prescription of prescriptions) {
		const updates: Record<string, string> = {};

		// Re-encrypt diagnosis and notes
		for (const field of ["diagnosis", "notes"]) {
			const value = (prescription as Record<string, unknown>)[field];
			if (value && typeof value === "string" && value.startsWith("enc:")) {
				const encryptedValue = value.substring(4);
				const decrypted = decrypt(encryptedValue, oldKey);
				const encrypted = encrypt(decrypted, newKey);
				updates[field] = `enc:${encrypted}`;
			}
		}

		if (Object.keys(updates).length > 0) {
			await Prescription.updateOne(
				{ _id: prescription._id },
				{ $set: updates },
			);
			reEncryptedCount++;
		}
	}

	return reEncryptedCount;
}

/**
 * Re-encrypt vitals records
 */
export async function reEncryptVitals({
	decrypt,
	encrypt,
	oldKey,
	newKey,
}: {
	decrypt: (encrypted: string, key: string) => string;
	encrypt: (plaintext: string, key: string) => string;
	oldKey: string;
	newKey: string;
}): Promise<number> {
	const vitalsRecords = await Vitals.find().lean();
	let reEncryptedCount = 0;

	for (const vital of vitalsRecords) {
		const updates: Record<string, string> = {};

		// Re-encrypt notes and correctionReason
		for (const field of ["notes", "correctionReason"]) {
			const value = (vital as Record<string, unknown>)[field];
			if (value && typeof value === "string" && value.startsWith("enc:")) {
				const encryptedValue = value.substring(4);
				const decrypted = decrypt(encryptedValue, oldKey);
				const encrypted = encrypt(decrypted, newKey);
				updates[field] = `enc:${encrypted}`;
			}
		}

		if (Object.keys(updates).length > 0) {
			await Vitals.updateOne({ _id: vital._id }, { $set: updates });
			reEncryptedCount++;
		}
	}

	return reEncryptedCount;
}

/**
 * Re-encrypt staff records
 */
export async function reEncryptStaff({
	decrypt,
	encrypt,
	oldKey,
	newKey,
}: {
	decrypt: (encrypted: string, key: string) => string;
	encrypt: (plaintext: string, key: string) => string;
	oldKey: string;
	newKey: string;
}): Promise<number> {
	const staffRecords = await Staff.find().lean();
	let reEncryptedCount = 0;

	for (const staff of staffRecords) {
		const updates: Record<string, string> = {};

		// Re-encrypt phone
		if (
			staff.phone &&
			typeof staff.phone === "string" &&
			staff.phone.startsWith("enc:")
		) {
			const encryptedValue = staff.phone.substring(4);
			const decrypted = decrypt(encryptedValue, oldKey);
			const encrypted = encrypt(decrypted, newKey);
			updates.phone = `enc:${encrypted}`;
		}

		if (Object.keys(updates).length > 0) {
			await Staff.updateOne({ _id: staff._id }, { $set: updates });
			reEncryptedCount++;
		}
	}

	return reEncryptedCount;
}
