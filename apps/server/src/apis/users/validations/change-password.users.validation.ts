import { z } from "zod";

// Password policy regex: min 8 chars, uppercase, lowercase, number, special char
const passwordRegex =
	/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Zod schema for runtime validation
export const changePasswordSchema = z.object({
	body: z
		.object({
			currentPassword: z.string().min(1, "Current password is required"),
			newPassword: z
				.string()
				.min(8, "Password must be at least 8 characters")
				.regex(
					passwordRegex,
					"Password must contain uppercase, lowercase, number, and special character",
				),
			confirmPassword: z.string().min(1, "Password confirmation is required"),
		})
		.refine((data) => data.newPassword === data.confirmPassword, {
			message: "Passwords do not match",
			path: ["confirmPassword"],
		}),
});

// Input type - inferred from Zod (single source of truth)
export type ChangePasswordInput = z.infer<
	typeof changePasswordSchema.shape.body
>;

// Output type - manually defined for response structure
export interface ChangePasswordOutput {
	message: string;
}
