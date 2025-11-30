import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/admin/security")({
	component: SecurityAdminLayout,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
		// TODO: Add permission check for SECURITY:READ or SECURITY:MANAGE
	},
});

function SecurityAdminLayout() {
	return <Outlet />;
}
