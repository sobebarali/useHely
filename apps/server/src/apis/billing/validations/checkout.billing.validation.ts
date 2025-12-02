import { z } from "zod";

// Checkout validation - for creating checkout links
export const checkoutSchema = z.object({
	query: z.object({
		productId: z.string().optional(),
		plan: z.enum(["STARTER", "PROFESSIONAL"]).optional(),
		cycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
	}),
});

export type CheckoutInput = z.infer<typeof checkoutSchema.shape.query>;

// Checkout response
export interface CheckoutOutput {
	checkoutUrl: string;
	productId: string;
	plan: string;
	cycle: string;
}
