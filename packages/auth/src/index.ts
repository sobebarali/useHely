import { betterAuth, type BetterAuthOptions } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { polar, checkout, portal } from "@polar-sh/better-auth";
import { polarClient } from "./lib/payments";
import { client } from "@hms/db";

export const auth = betterAuth<BetterAuthOptions>({
	database: mongodbAdapter(client),
	trustedOrigins: [process.env.CORS_ORIGIN || ""],
	emailAndPassword: {
		enabled: true,
	},
	advanced: {
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
	},
	plugins: [
		polar({
			client: polarClient,
			createCustomerOnSignUp: true,
			enableCustomerPortal: true,
			use: [
				checkout({
					products: [
						{
							productId: "your-product-id",
							slug: "pro",
						},
					],
					successUrl: process.env.POLAR_SUCCESS_URL,
					authenticatedUsersOnly: true,
				}),
				portal(),
			],
		}),
	],
});
