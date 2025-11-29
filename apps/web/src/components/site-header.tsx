import { Bell } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface SiteHeaderProps {
	title?: string;
}

export function SiteHeader({ title = "Dashboard" }: SiteHeaderProps) {
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
					<Button variant="ghost" size="icon" className="h-8 w-8">
						<Bell className="h-4 w-4" />
						<span className="sr-only">Notifications</span>
					</Button>
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}
