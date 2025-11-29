import { createFileRoute, redirect } from "@tanstack/react-router";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DashboardLayout } from "@/components/dashboard-layout";
import { SectionCards } from "@/components/section-cards";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({
				to: "/login",
				throw: true,
			});
		}
		return { session };
	},
});

function RouteComponent() {
	const { session } = Route.useRouteContext();

	const user = {
		name: session.data?.user.name || "User",
		email: session.data?.user.email || "",
		image: session.data?.user.image,
	};

	const hospital = {
		name: "City General Hospital",
		plan: "Pro",
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
