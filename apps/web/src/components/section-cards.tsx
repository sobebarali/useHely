import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function SectionCards() {
	return (
		<div className="grid @5xl/main:grid-cols-4 @xl/main:grid-cols-2 grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 dark:*:data-[slot=card]:bg-card">
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Total Patients</CardDescription>
					<CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
						2,847
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							<IconTrendingUp />
							+8.2%
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium">
						+32 new patients this week <IconTrendingUp className="size-4" />
					</div>
					<div className="text-muted-foreground">Compared to last month</div>
				</CardFooter>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Appointments Today</CardDescription>
					<CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
						48
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							<IconTrendingUp />
							+15%
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium">
						12 completed, 36 pending <IconTrendingUp className="size-4" />
					</div>
					<div className="text-muted-foreground">3 cancelled today</div>
				</CardFooter>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>OPD Queue</CardDescription>
					<CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
						24
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							<IconTrendingDown />
							-5%
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium">
						Avg wait time: 18 mins <IconTrendingDown className="size-4" />
					</div>
					<div className="text-muted-foreground">Better than yesterday</div>
				</CardFooter>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Active Staff</CardDescription>
					<CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
						156
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							<IconTrendingUp />
							+2
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium">
						12 doctors on duty <IconTrendingUp className="size-4" />
					</div>
					<div className="text-muted-foreground">8 departments active</div>
				</CardFooter>
			</Card>
		</div>
	);
}
