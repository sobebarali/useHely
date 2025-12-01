import { AlertTriangle, Bell, ClipboardList } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuickStats } from "@/hooks/use-dashboard";

interface SiteHeaderProps {
	title?: string;
}

export function SiteHeader({ title = "Dashboard" }: SiteHeaderProps) {
	const { data: quickStats, isLoading } = useQuickStats();

	const totalCount =
		(quickStats?.notifications || 0) +
		(quickStats?.pendingTasks || 0) +
		(quickStats?.alerts || 0);

	return (
		<header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
			<div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="mx-2 data-[orientation=vertical]:h-4"
				/>
				<h1 className="font-medium text-base">{title}</h1>
				<div className="ml-auto flex items-center gap-2">
					{/* Quick Stats Dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="relative h-8 w-8">
								<Bell className="h-4 w-4" />
								{isLoading ? (
									<Skeleton className="-top-1 -right-1 absolute h-4 w-4 rounded-full" />
								) : totalCount > 0 ? (
									<Badge
										variant="destructive"
										className="-top-1 -right-1 absolute flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]"
									>
										{totalCount > 99 ? "99+" : totalCount}
									</Badge>
								) : null}
								<span className="sr-only">Quick Stats</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-72" align="end">
							<DropdownMenuLabel>Quick Stats</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{isLoading ? (
								<div className="space-y-2 p-2">
									<Skeleton className="h-8 w-full" />
									<Skeleton className="h-8 w-full" />
									<Skeleton className="h-8 w-full" />
								</div>
							) : (
								<div className="space-y-2 p-2">
									<div className="flex items-center justify-between rounded-md bg-muted p-2">
										<div className="flex items-center gap-2">
											<Bell className="h-4 w-4 text-muted-foreground" />
											<span className="text-sm">Notifications</span>
										</div>
										<Badge variant="secondary">
											{quickStats?.notifications || 0}
										</Badge>
									</div>
									<div className="flex items-center justify-between rounded-md bg-muted p-2">
										<div className="flex items-center gap-2">
											<ClipboardList className="h-4 w-4 text-muted-foreground" />
											<span className="text-sm">Pending Tasks</span>
										</div>
										<Badge
											variant={
												quickStats?.pendingTasks ? "default" : "secondary"
											}
										>
											{quickStats?.pendingTasks || 0}
										</Badge>
									</div>
									<div className="flex items-center justify-between rounded-md bg-muted p-2">
										<div className="flex items-center gap-2">
											<AlertTriangle className="h-4 w-4 text-muted-foreground" />
											<span className="text-sm">Alerts</span>
										</div>
										<Badge
											variant={quickStats?.alerts ? "destructive" : "secondary"}
										>
											{quickStats?.alerts || 0}
										</Badge>
									</div>
								</div>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}
