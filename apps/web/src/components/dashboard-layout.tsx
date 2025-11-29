import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface DashboardLayoutProps {
	children: ReactNode;
	user: {
		name: string;
		email: string;
		image?: string | null;
	};
	hospital?: {
		name: string;
		plan: string;
	};
	pageTitle?: string;
}

export function DashboardLayout({
	children,
	user,
	hospital,
	pageTitle = "Dashboard",
}: DashboardLayoutProps) {
	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			<AppSidebar user={user} hospital={hospital} />
			<SidebarInset>
				<SiteHeader title={pageTitle} />
				<div className="flex flex-1 flex-col">
					<div className="@container/main flex flex-1 flex-col gap-2">
						{children}
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
