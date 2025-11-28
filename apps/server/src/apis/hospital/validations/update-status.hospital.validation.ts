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

// Zod schema for runtime validation
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

// Input type - inferred from Zod (single source of truth)
export type UpdateStatusInput = z.infer<
	typeof updateStatusHospitalSchema.shape.body
>;

// Output type - manually defined for response structure
export interface UpdateStatusOutput {
	id: string;
	status: string;
	updatedAt: string;
}
