import { Building2, ChevronsUpDown } from "lucide-react";

import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

export function HospitalSwitcher({
	hospital,
}: {
	hospital?: {
		name: string;
		plan: string;
	};
}) {
	const hospitalName = hospital?.name || "Hospital";
	const hospitalPlan = hospital?.plan || "Free";

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton
					size="lg"
					className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
						<Building2 className="size-4" />
					</div>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-medium">{hospitalName}</span>
						<span className="truncate text-xs">{hospitalPlan}</span>
					</div>
					<ChevronsUpDown className="ml-auto" />
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
