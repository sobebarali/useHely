import { Calendar, Clock, UserCheck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/use-dashboard";

interface StatCardProps {
	title: string;
	value: number;
	description: string;
	icon: React.ReactNode;
	iconBgClass: string;
	iconColorClass: string;
}

function StatCard({
	title,
	value,
	description,
	icon,
	iconBgClass,
	iconColorClass,
}: StatCardProps) {
	return (
		<Card className="@container/card group relative overflow-hidden transition-all hover:shadow-md">
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="font-medium text-muted-foreground text-sm">
					{title}
				</CardTitle>
				<div
					className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBgClass} transition-transform group-hover:scale-110`}
				>
					<span className={iconColorClass}>{icon}</span>
				</div>
			</CardHeader>
			<CardContent>
				<div className="font-bold text-3xl tabular-nums tracking-tight">
					{value.toLocaleString()}
				</div>
				<p className="mt-1 text-muted-foreground text-xs">{description}</p>
			</CardContent>
			{/* Subtle gradient accent at bottom */}
			<div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 opacity-0 transition-opacity group-hover:opacity-100" />
		</Card>
	);
}

function StatCardSkeleton() {
	return (
		<Card className="@container/card">
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-9 w-9 rounded-lg" />
			</CardHeader>
			<CardContent>
				<Skeleton className="h-8 w-16" />
				<Skeleton className="mt-2 h-3 w-32" />
			</CardContent>
		</Card>
	);
}

export function SectionCards() {
	const { stats, isLoading, error } = useDashboardStats();

	if (error) {
		return (
			<div className="px-4 lg:px-6">
				<div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
					<p className="text-muted-foreground text-sm">
						Failed to load dashboard statistics
					</p>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
				{[1, 2, 3, 4].map((key) => (
					<StatCardSkeleton key={key} />
				))}
			</div>
		);
	}

	const statCards: StatCardProps[] = [
		{
			title: "Total Patients",
			value: stats.totalPatients,
			description:
				stats.totalPatients > 0 ? "Active patients" : "No patients registered",
			icon: <Users className="h-5 w-5" />,
			iconBgClass: "bg-primary/10 dark:bg-primary/20",
			iconColorClass: "text-primary",
		},
		{
			title: "Appointments Today",
			value: stats.appointmentsToday,
			description:
				stats.appointmentsToday > 0
					? "Scheduled for today"
					: "No appointments today",
			icon: <Calendar className="h-5 w-5" />,
			iconBgClass: "bg-chart-2/10 dark:bg-chart-2/20",
			iconColorClass: "text-chart-2",
		},
		{
			title: "OPD Queue",
			value: stats.opdQueue,
			description: stats.opdQueue > 0 ? "Patients waiting" : "Queue is empty",
			icon: <Clock className="h-5 w-5" />,
			iconBgClass: "bg-chart-3/10 dark:bg-chart-3/20",
			iconColorClass: "text-chart-3",
		},
		{
			title: "Active Staff",
			value: stats.activeStaff,
			description: stats.activeStaff > 0 ? "Staff on duty" : "No staff active",
			icon: <UserCheck className="h-5 w-5" />,
			iconBgClass: "bg-chart-4/10 dark:bg-chart-4/20",
			iconColorClass: "text-chart-4",
		},
	];

	return (
		<div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
			{statCards.map((card) => (
				<StatCard key={card.title} {...card} />
			))}
		</div>
	);
}
