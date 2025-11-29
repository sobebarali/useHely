import { createFileRoute, redirect } from "@tanstack/react-router";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DashboardLayout } from "@/components/dashboard-layout";
import Loader from "@/components/loader";
import { SectionCards } from "@/components/section-cards";
import { useSession } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	beforeLoad: async () => {
		// Check if user is authenticated
		if (!authClient.isAuthenticated()) {
			throw redirect({
				to: "/login",
			});
		}
	},
});

function RouteComponent() {
	const { data: session, isLoading } = useSession();

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader />
			</div>
		);
	}

	if (!session) {
		// This shouldn't happen due to beforeLoad, but handle gracefully
		return null;
	}

	const user = {
		name: `${session.firstName} ${session.lastName}`.trim() || session.username,
		email: session.email,
		image: undefined,
	};

	const hospital = {
		name: session.hospital?.name || "Unknown Hospital",
		plan: "Pro", // TODO: Add plan info to hospital model
	};

	return (
		<DashboardLayout user={user} hospital={hospital} pageTitle="Dashboard">
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<SectionCards />
				<div className="px-4 lg:px-6">
					<ChartAreaInteractive />
				</div>
			</div>
		</DashboardLayout>
	);
}
