import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export const description = "Patient and appointment trends";

export function ChartAreaInteractive() {
	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle>Patient & Appointment Trends</CardTitle>
				<CardDescription>
					<span className="@[540px]/card:block hidden">
						New patient registrations and appointments over time
					</span>
					<span className="@[540px]/card:hidden">Activity trends</span>
				</CardDescription>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				<div className="flex h-[250px] w-full items-center justify-center rounded-lg border border-dashed">
					<p className="text-muted-foreground text-sm">No data available</p>
				</div>
			</CardContent>
		</Card>
	);
}
