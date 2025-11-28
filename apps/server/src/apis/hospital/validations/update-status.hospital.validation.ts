import { z } from "zod";

// UUID v4 validation regex
const uuidRegex =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Valid hospital status values
const validStatuses = [
	"PENDING",
	"VERIFIED",
	"ACTIVE",
	"SUSPENDED",
	"INACTIVE",
] as const;

export const updateStatusHospitalSchema = z.object({
	params: z.object({
		id: z
			.string()
			.min(1, "Hospital ID is required")
			.regex(uuidRegex, "Invalid hospital ID format"),
	}),
	body: z.object({
		status: z.enum(validStatuses, {
			message: "Invalid status value",
		}),
		reason: z.string().optional(),
	}),
});

export type UpdateStatusHospitalValidated = z.infer<
	typeof updateStatusHospitalSchema.shape.body
>;
