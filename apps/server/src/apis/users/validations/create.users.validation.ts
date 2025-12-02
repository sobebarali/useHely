import { z } from "zod";

// Phone number regex: supports international format with optional + prefix
// Allows 7-15 digits as per E.164 standard
const phoneRegex = /^\+?[1-9]\d{6,14}$/;

// Zod schema for runtime validation
export const createUserSchema = z.object({
	body: z.object({
		firstName: z.string().min(1, "First name is required").max(50),
		lastName: z.string().min(1, "Last name is required").max(50),
		email: z.string().email(),
		phone: z
			.string()
			.min(1, "Phone number is required")
			.regex(
				phoneRegex,
				"Invalid phone number format. Use international format (e.g., +1234567890)",
			),
		department: z.string().min(1, "Department is required"),
		roles: z.array(z.string().min(1)).min(1, "At least one role is required"),
		specialization: z.string().optional(),
		shift: z.enum(["MORNING", "EVENING", "NIGHT"]).optional(),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type CreateUserInput = z.infer<typeof createUserSchema.shape.body>;

// Output type - manually defined for response structure
export interface CreateUserOutput {
	id: string;
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	department: string;
	roles: Array<{
		id: string;
		name: string;
	}>;
	status: string;
	message: string;
}
