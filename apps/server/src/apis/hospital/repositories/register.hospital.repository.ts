import { Hospital, HospitalStatus } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("registerHospital");

export async function createHospital({
	id,
	name,
	slug,
	licenseNumber,
	address,
	contactEmail,
	contactPhone,
	adminEmail,
	adminPhone,
	verificationToken,
	verificationExpires,
}: {
	id: string;
	name: string;
	slug: string;
	licenseNumber: string;
	address: {
		street: string;
		city: string;
		state: string;
		postalCode: string;
		country: string;
	};
	contactEmail: string;
	contactPhone: string;
	adminEmail: string;
	adminPhone: string;
	verificationToken: string;
	verificationExpires: Date;
}) {
	try {
		logger.debug(
			{
				hospitalId: id,
				hospitalName: name,
			},
			"Creating hospital in database",
		);

		const hospital = await Hospital.create({
			_id: id,
			name,
			slug,
			licenseNumber,
			address,
			contactEmail,
			contactPhone,
			adminEmail,
			adminPhone,
			verificationToken,
			verificationExpires,
			status: HospitalStatus.PENDING,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		logDatabaseOperation(
			logger,
			"create",
			"hospitals",
			{ _id: id },
			{ _id: hospital._id, status: hospital.status },
		);

		logger.info(
			{
				hospitalId: hospital._id,
				status: hospital.status,
			},
			"Hospital created in database",
		);

		return hospital;
	} catch (error) {
		logError(logger, error, "Failed to create hospital in database", {
			hospitalId: id,
			hospitalName: name,
		});
		throw error;
	}
}
