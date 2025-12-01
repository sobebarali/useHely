import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";

interface NavItem {
	title: string;
	url: string;
	icon?: LucideIcon;
	items?: {
		title: string;
		url: string;
	}[];
}

export function NavMain({ items }: { items: NavItem[] }) {
	const location = useLocation();
	const currentPath = location.pathname;

	// Check if a path is active (exact match or starts with for nested routes)
	const isPathActive = (path: string) => {
		if (!path) return false;
		// Exact match or current path starts with the item path (for nested routes)
		return currentPath === path || currentPath.startsWith(`${path}/`);
	};

	// Check if any child of a parent item is active
	const hasActiveChild = (item: NavItem) => {
		return item.items?.some((child) => isPathActive(child.url)) ?? false;
	};

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Navigation</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => {
					const hasChildren = item.items && item.items.length > 0;
					const isActive = isPathActive(item.url);
					const childActive = hasActiveChild(item);

					// Items without children render as direct links
					if (!hasChildren) {
						return (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton
									asChild
									isActive={isActive}
									tooltip={item.title}
								>
									<Link to={item.url}>
										{item.icon && <item.icon />}
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						);
					}

					// Items with children render as collapsible
					return (
						<Collapsible
							key={item.title}
							asChild
							defaultOpen={childActive}
							className="group/collapsible"
						>
							<SidebarMenuItem>
								<CollapsibleTrigger asChild>
									<SidebarMenuButton
										tooltip={item.title}
										isActive={isActive || childActive}
									>
										{item.icon && <item.icon />}
										<span>{item.title}</span>
										<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
									</SidebarMenuButton>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<SidebarMenuSub>
										{item.items?.map((subItem) => (
											<SidebarMenuSubItem key={subItem.title}>
												<SidebarMenuSubButton
													asChild
													isActive={isPathActive(subItem.url)}
												>
													<Link to={subItem.url}>
														<span>{subItem.title}</span>
													</Link>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
										))}
									</SidebarMenuSub>
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
