import { Hospital } from "@hms/db";
import type { RegisterHospitalInput } from "../dtos/register.hospital.dto";

export async function createHospital({
	id,
	data,
}: {
	id: string;
	data: RegisterHospitalInput & {
		slug: string;
		verificationToken: string;
		verificationExpires: Date;
	};
}) {
	const hospital = await Hospital.create({
		_id: id,
		name: data.name,
		slug: data.slug,
		licenseNumber: data.licenseNumber,
		address: data.address,
		contactEmail: data.contactEmail,
		contactPhone: data.contactPhone,
		adminEmail: data.adminEmail,
		adminPhone: data.adminPhone,
		verificationToken: data.verificationToken,
		verificationExpires: data.verificationExpires,
		status: "PENDING",
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	return hospital;
}

export async function findHospitalByLicense(licenseNumber: string) {
	return await Hospital.findOne({ licenseNumber });
}

export async function findHospitalByAdminEmail(adminEmail: string) {
	return await Hospital.findOne({ adminEmail });
}
