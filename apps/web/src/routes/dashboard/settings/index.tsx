import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/settings/")({
	component: SettingsIndexPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
		// Redirect to security settings by default
		throw redirect({ to: "/dashboard/settings/security" });
	},
});

function SettingsIndexPage() {
	return null;
}
