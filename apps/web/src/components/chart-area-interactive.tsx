import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";

export const description = "Patient and appointment trends";

// HMS-specific chart data - Patient registrations and appointments
const chartData = [
	{ date: "2024-04-01", patients: 12, appointments: 45 },
	{ date: "2024-04-02", patients: 8, appointments: 52 },
	{ date: "2024-04-03", patients: 15, appointments: 48 },
	{ date: "2024-04-04", patients: 10, appointments: 55 },
	{ date: "2024-04-05", patients: 18, appointments: 62 },
	{ date: "2024-04-06", patients: 6, appointments: 28 },
	{ date: "2024-04-07", patients: 4, appointments: 22 },
	{ date: "2024-04-08", patients: 14, appointments: 58 },
	{ date: "2024-04-09", patients: 11, appointments: 50 },
	{ date: "2024-04-10", patients: 16, appointments: 54 },
	{ date: "2024-04-11", patients: 13, appointments: 60 },
	{ date: "2024-04-12", patients: 9, appointments: 47 },
	{ date: "2024-04-13", patients: 5, appointments: 25 },
	{ date: "2024-04-14", patients: 3, appointments: 18 },
	{ date: "2024-04-15", patients: 17, appointments: 65 },
	{ date: "2024-04-16", patients: 12, appointments: 52 },
	{ date: "2024-04-17", patients: 14, appointments: 58 },
	{ date: "2024-04-18", patients: 10, appointments: 49 },
	{ date: "2024-04-19", patients: 8, appointments: 44 },
	{ date: "2024-04-20", patients: 4, appointments: 20 },
	{ date: "2024-04-21", patients: 2, appointments: 15 },
	{ date: "2024-04-22", patients: 15, appointments: 62 },
	{ date: "2024-04-23", patients: 11, appointments: 55 },
	{ date: "2024-04-24", patients: 13, appointments: 58 },
	{ date: "2024-04-25", patients: 16, appointments: 64 },
	{ date: "2024-04-26", patients: 9, appointments: 48 },
	{ date: "2024-04-27", patients: 6, appointments: 30 },
	{ date: "2024-04-28", patients: 3, appointments: 16 },
	{ date: "2024-04-29", patients: 18, appointments: 68 },
	{ date: "2024-04-30", patients: 14, appointments: 56 },
	{ date: "2024-05-01", patients: 12, appointments: 50 },
	{ date: "2024-05-02", patients: 10, appointments: 52 },
	{ date: "2024-05-03", patients: 15, appointments: 58 },
	{ date: "2024-05-04", patients: 7, appointments: 32 },
	{ date: "2024-05-05", patients: 4, appointments: 18 },
	{ date: "2024-05-06", patients: 16, appointments: 62 },
	{ date: "2024-05-07", patients: 13, appointments: 55 },
	{ date: "2024-05-08", patients: 11, appointments: 48 },
	{ date: "2024-05-09", patients: 14, appointments: 54 },
	{ date: "2024-05-10", patients: 9, appointments: 46 },
	{ date: "2024-05-11", patients: 5, appointments: 24 },
	{ date: "2024-05-12", patients: 3, appointments: 14 },
	{ date: "2024-05-13", patients: 17, appointments: 66 },
	{ date: "2024-05-14", patients: 12, appointments: 58 },
	{ date: "2024-05-15", patients: 15, appointments: 62 },
	{ date: "2024-05-16", patients: 10, appointments: 50 },
	{ date: "2024-05-17", patients: 8, appointments: 44 },
	{ date: "2024-05-18", patients: 6, appointments: 28 },
	{ date: "2024-05-19", patients: 2, appointments: 12 },
	{ date: "2024-05-20", patients: 14, appointments: 60 },
	{ date: "2024-05-21", patients: 11, appointments: 52 },
	{ date: "2024-05-22", patients: 13, appointments: 56 },
	{ date: "2024-05-23", patients: 16, appointments: 64 },
	{ date: "2024-05-24", patients: 9, appointments: 48 },
	{ date: "2024-05-25", patients: 5, appointments: 22 },
	{ date: "2024-05-26", patients: 3, appointments: 16 },
	{ date: "2024-05-27", patients: 18, appointments: 70 },
	{ date: "2024-05-28", patients: 14, appointments: 58 },
	{ date: "2024-05-29", patients: 12, appointments: 54 },
	{ date: "2024-05-30", patients: 10, appointments: 50 },
	{ date: "2024-05-31", patients: 8, appointments: 42 },
	{ date: "2024-06-01", patients: 4, appointments: 20 },
	{ date: "2024-06-02", patients: 2, appointments: 14 },
	{ date: "2024-06-03", patients: 15, appointments: 62 },
	{ date: "2024-06-04", patients: 13, appointments: 56 },
	{ date: "2024-06-05", patients: 11, appointments: 52 },
	{ date: "2024-06-06", patients: 16, appointments: 66 },
	{ date: "2024-06-07", patients: 9, appointments: 48 },
	{ date: "2024-06-08", patients: 6, appointments: 26 },
	{ date: "2024-06-09", patients: 3, appointments: 18 },
	{ date: "2024-06-10", patients: 17, appointments: 68 },
	{ date: "2024-06-11", patients: 14, appointments: 60 },
	{ date: "2024-06-12", patients: 12, appointments: 54 },
	{ date: "2024-06-13", patients: 10, appointments: 50 },
	{ date: "2024-06-14", patients: 8, appointments: 44 },
	{ date: "2024-06-15", patients: 5, appointments: 24 },
	{ date: "2024-06-16", patients: 2, appointments: 12 },
	{ date: "2024-06-17", patients: 16, appointments: 64 },
	{ date: "2024-06-18", patients: 13, appointments: 58 },
	{ date: "2024-06-19", patients: 11, appointments: 52 },
	{ date: "2024-06-20", patients: 15, appointments: 62 },
	{ date: "2024-06-21", patients: 9, appointments: 46 },
	{ date: "2024-06-22", patients: 6, appointments: 28 },
	{ date: "2024-06-23", patients: 3, appointments: 16 },
	{ date: "2024-06-24", patients: 18, appointments: 72 },
	{ date: "2024-06-25", patients: 14, appointments: 60 },
	{ date: "2024-06-26", patients: 12, appointments: 56 },
	{ date: "2024-06-27", patients: 10, appointments: 52 },
	{ date: "2024-06-28", patients: 8, appointments: 46 },
	{ date: "2024-06-29", patients: 5, appointments: 22 },
	{ date: "2024-06-30", patients: 4, appointments: 18 },
];

const chartConfig = {
	activity: {
		label: "Activity",
	},
	patients: {
		label: "New Patients",
		color: "var(--primary)",
	},
	appointments: {
		label: "Appointments",
		color: "var(--primary)",
	},
} satisfies ChartConfig;

export function ChartAreaInteractive() {
	const isMobile = useIsMobile();
	const [timeRange, setTimeRange] = React.useState("90d");

	React.useEffect(() => {
		if (isMobile) {
			setTimeRange("7d");
		}
	}, [isMobile]);

	const filteredData = chartData.filter((item) => {
		const date = new Date(item.date);
		const referenceDate = new Date("2024-06-30");
		let daysToSubtract = 90;
		if (timeRange === "30d") {
			daysToSubtract = 30;
		} else if (timeRange === "7d") {
			daysToSubtract = 7;
		}
		const startDate = new Date(referenceDate);
		startDate.setDate(startDate.getDate() - daysToSubtract);
		return date >= startDate;
	});

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
				<CardAction>
					<ToggleGroup
						type="single"
						value={timeRange}
						onValueChange={setTimeRange}
						variant="outline"
						className="*:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex hidden"
					>
						<ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
						<ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
						<ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
					</ToggleGroup>
					<Select value={timeRange} onValueChange={setTimeRange}>
						<SelectTrigger
							className="flex @[767px]/card:hidden w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
							size="sm"
							aria-label="Select a value"
						>
							<SelectValue placeholder="Last 3 months" />
						</SelectTrigger>
						<SelectContent className="rounded-xl">
							<SelectItem value="90d" className="rounded-lg">
								Last 3 months
							</SelectItem>
							<SelectItem value="30d" className="rounded-lg">
								Last 30 days
							</SelectItem>
							<SelectItem value="7d" className="rounded-lg">
								Last 7 days
							</SelectItem>
						</SelectContent>
					</Select>
				</CardAction>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[250px] w-full"
				>
					<AreaChart data={filteredData}>
						<defs>
							<linearGradient id="fillPatients" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-patients)"
									stopOpacity={1.0}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-patients)"
									stopOpacity={0.1}
								/>
							</linearGradient>
							<linearGradient id="fillAppointments" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-appointments)"
									stopOpacity={0.8}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-appointments)"
									stopOpacity={0.1}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="date"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={32}
							tickFormatter={(value) => {
								const date = new Date(value);
								return date.toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
								});
							}}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									labelFormatter={(value) => {
										return new Date(value).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
										});
									}}
									indicator="dot"
								/>
							}
						/>
						<Area
							dataKey="appointments"
							type="natural"
							fill="url(#fillAppointments)"
							stroke="var(--color-appointments)"
							stackId="a"
						/>
						<Area
							dataKey="patients"
							type="natural"
							fill="url(#fillPatients)"
							stroke="var(--color-patients)"
							stackId="a"
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
