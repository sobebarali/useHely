import { OrganizationType, PricingTier } from "@hms/db";
import { z } from "zod";

// Organization types enum for validation
const organizationTypeValues = Object.values(OrganizationType) as [
	string,
	...string[],
];
const pricingTierValues = Object.values(PricingTier) as [string, ...string[]];

// Zod schema for runtime validation
export const registerHospitalSchema = z.object({
	body: z
		.object({
			type: z.enum(organizationTypeValues).default(OrganizationType.HOSPITAL),
			name: z.string().min(1, "Organization name is required"),
			address: z.object({
				street: z.string().min(1, "Street address is required"),
				city: z.string().min(1, "City is required"),
				state: z.string().min(1, "State is required"),
				postalCode: z.string().min(1, "Postal code is required"),
				country: z.string().min(1, "Country is required"),
			}),
			contactEmail: z.string().email("Valid contact email is required"),
			contactPhone: z.string().min(1, "Contact phone is required"),
			licenseNumber: z.string().optional(),
			adminEmail: z.string().email("Valid admin email is required"),
			adminPhone: z.string().min(1, "Admin phone is required"),
			pricingTier: z.enum(pricingTierValues).optional(),
		})
		.refine(
			(data) =>
				data.type !== OrganizationType.HOSPITAL ||
				(data.licenseNumber && data.licenseNumber.length > 0),
			{
				message: "License number is required for hospitals",
				path: ["licenseNumber"],
			},
		),
});

// Input type - inferred from Zod (single source of truth)
export type RegisterHospitalInput = z.infer<
	typeof registerHospitalSchema.shape.body
>;

// Output type - manually defined for response structure
export interface RegisterHospitalOutput {
	id: string;
	tenantId: string;
	name: string;
	type: string;
	status: string;
	message: string;
	/** Only present for self-service registrations (CLINIC, SOLO_PRACTICE) */
	temporaryPassword?: string;
}
