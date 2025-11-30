import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/use-dashboard";

export function SectionCards() {
	const { stats, isLoading, error } = useDashboardStats();

	if (error) {
		return (
			<div className="px-4 lg:px-6">
				<div className="py-8 text-center">
					<p className="text-muted-foreground">Failed to load dashboard data</p>
				</div>
			</div>
		);
	}

	if (isLoading) {
		const skeletonCards = [
			"total-patients-skeleton",
			"appointments-today-skeleton",
			"opd-queue-skeleton",
			"active-staff-skeleton",
		];
		return (
			<div className="grid @5xl/main:grid-cols-4 @xl/main:grid-cols-2 grid-cols-1 gap-4 px-4 lg:px-6">
				{skeletonCards.map((key) => (
					<Card key={key} className="@container/card">
						<CardHeader>
							<CardDescription>
								<Skeleton className="h-4 w-24" />
							</CardDescription>
							<CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
								<Skeleton className="h-8 w-16" />
							</CardTitle>
						</CardHeader>
						<CardFooter className="flex-col items-start gap-1.5 text-sm">
							<Skeleton className="h-3 w-32" />
						</CardFooter>
					</Card>
				))}
			</div>
		);
	}

	return (
		<div className="grid @5xl/main:grid-cols-4 @xl/main:grid-cols-2 grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 dark:*:data-[slot=card]:bg-card">
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Total Patients</CardDescription>
					<CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
						{stats.totalPatients.toLocaleString()}
					</CardTitle>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="text-muted-foreground">
						{stats.totalPatients > 0
							? "Active patients"
							: "No patients registered"}
					</div>
				</CardFooter>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Appointments Today</CardDescription>
					<CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
						{stats.appointmentsToday.toLocaleString()}
					</CardTitle>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="text-muted-foreground">
						{stats.appointmentsToday > 0
							? "Scheduled for today"
							: "No appointments today"}
					</div>
				</CardFooter>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>OPD Queue</CardDescription>
					<CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
						{stats.opdQueue.toLocaleString()}
					</CardTitle>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="text-muted-foreground">
						{stats.opdQueue > 0 ? "Patients waiting" : "Queue is empty"}
					</div>
				</CardFooter>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Active Staff</CardDescription>
					<CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
						{stats.activeStaff.toLocaleString()}
					</CardTitle>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="text-muted-foreground">
						{stats.activeStaff > 0 ? "Staff on duty" : "No staff active"}
					</div>
				</CardFooter>
			</Card>
		</div>
	);
}
