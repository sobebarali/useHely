import {
	Organization,
	type OrganizationStatusValue,
	OrganizationType,
	type OrganizationTypeValue,
	PricingTier,
	type PricingTierValue,
} from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("registerHospital");

export async function createHospital({
	id,
	type,
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
	status,
	pricingTier,
}: {
	id: string;
	type: OrganizationTypeValue;
	name: string;
	slug: string;
	licenseNumber?: string;
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
	verificationToken?: string;
	verificationExpires?: Date;
	status: OrganizationStatusValue;
	pricingTier?: PricingTierValue;
}) {
	try {
		logger.debug(
			{
				organizationId: id,
				organizationName: name,
				type,
			},
			"Creating organization in database",
		);

		// Determine default pricing tier based on organization type
		const defaultPricingTier =
			type === OrganizationType.HOSPITAL
				? PricingTier.ENTERPRISE
				: type === OrganizationType.CLINIC
					? PricingTier.PROFESSIONAL
					: PricingTier.STARTER;

		const organization = await Organization.create({
			_id: id,
			type,
			name,
			slug,
			...(licenseNumber && { licenseNumber }),
			address,
			contactEmail,
			contactPhone,
			adminEmail,
			adminPhone,
			...(verificationToken && { verificationToken }),
			...(verificationExpires && { verificationExpires }),
			status,
			pricingTier: pricingTier || defaultPricingTier,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		logDatabaseOperation(
			logger,
			"create",
			"organization",
			{ _id: id },
			{ _id: organization._id, status: organization.status, type },
		);

		logger.info(
			{
				organizationId: organization._id,
				status: organization.status,
				type,
			},
			"Organization created in database",
		);

		return organization;
	} catch (error) {
		logError(logger, error, "Failed to create organization in database", {
			organizationId: id,
			organizationName: name,
			type,
		});
		throw error;
	}
}
