import {
	Activity,
	Building2,
	Calendar,
	FileText,
	LayoutDashboard,
	type LucideIcon,
	Package,
	Pill,
	Settings2,
	Stethoscope,
	Users,
} from "lucide-react";
import type * as React from "react";
import { HospitalSwitcher } from "@/components/hospital-switcher";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";
import { useMenu } from "@/hooks/use-menu";

// Icon mapping from server icon names to Lucide icons
const iconMap: Record<string, LucideIcon> = {
	dashboard: LayoutDashboard,
	people: Users,
	medical_services: Stethoscope,
	medication: Pill,
	schedule: Calendar,
	vital_signs: Activity,
	local_pharmacy: Pill,
	inventory: Package,
	queue: Users,
	business: Building2,
	assignment: FileText,
	settings: Settings2,
};

// Convert server menu items to NavMain format
function convertMenuItems(
	menuItems: Array<{
		id: string;
		label: string;
		icon: string;
		path?: string;
		children?: Array<{
			id: string;
			label: string;
			path: string;
		}>;
	}>,
) {
	return menuItems.map((item) => ({
		title: item.label,
		url: item.path || "",
		icon: iconMap[item.icon] || LayoutDashboard,
		isActive: false, // Will be determined by current route
		items: item.children?.map((child) => ({
			title: child.label,
			url: child.path,
		})),
	}));
}

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
	user: {
		name: string;
		email: string;
		image?: string | null;
	};
	hospital?: {
		name: string;
		plan: string;
	};
}

export function AppSidebar({ user, hospital, ...props }: AppSidebarProps) {
	const { data: menuData, isLoading, error } = useMenu();

	// Show loading state while menu is being fetched
	if (isLoading) {
		return (
			<Sidebar collapsible="icon" {...props}>
				<SidebarHeader>
					<HospitalSwitcher hospital={hospital} />
				</SidebarHeader>
				<SidebarContent>
					<div className="p-4">
						<div className="animate-pulse space-y-2">
							{Array.from({ length: 5 }).map(() => (
								<div key={Math.random()} className="h-8 rounded bg-muted" />
							))}
						</div>
					</div>
				</SidebarContent>
				<SidebarFooter>
					<NavUser user={user} />
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>
		);
	}

	// Show error state if menu fails to load
	if (error || !menuData) {
		return (
			<Sidebar collapsible="icon" {...props}>
				<SidebarHeader>
					<HospitalSwitcher hospital={hospital} />
				</SidebarHeader>
				<SidebarContent>
					<div className="p-4">
						<p className="text-destructive text-sm">
							Failed to load menu. Please refresh the page.
						</p>
					</div>
				</SidebarContent>
				<SidebarFooter>
					<NavUser user={user} />
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>
		);
	}

	const navItems = convertMenuItems(menuData.menu);

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<HospitalSwitcher hospital={hospital} />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={navItems} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
