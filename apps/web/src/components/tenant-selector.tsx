import { useNavigate } from "@tanstack/react-router";
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { useSwitchTenant, useUserTenants } from "@/hooks/use-auth";
import type { UserTenant } from "@/lib/auth-client";

function getTenantStatusLabel(status: string): string {
	switch (status) {
		case "ACTIVE":
			return "Active";
		case "SUSPENDED":
			return "Suspended";
		case "PENDING":
			return "Pending";
		case "INACTIVE":
			return "Inactive";
		default:
			return status;
	}
}

function isTenantAccessible(tenant: UserTenant): boolean {
	// Can only switch to active tenants where staff is also active
	return tenant.status === "ACTIVE" && tenant.staffStatus === "ACTIVE";
}

export function TenantSelector() {
	const { isMobile } = useSidebar();
	const navigate = useNavigate();
	const { data: tenantsData, isLoading, error } = useUserTenants();
	const switchTenantMutation = useSwitchTenant();

	// Don't render if loading or error
	if (isLoading) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton size="lg" className="cursor-default">
						<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
							<Loader2 className="size-4 animate-spin" />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">Loading...</span>
						</div>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	if (error || !tenantsData) {
		return null;
	}

	const { tenants, currentTenantId } = tenantsData;
	const currentTenant = tenants.find((t) => t.id === currentTenantId);

	// Hide selector if user has only one tenant
	if (tenants.length <= 1) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton size="lg" className="cursor-default">
						<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
							<Building2 className="size-4" />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">
								{currentTenant?.name || "Hospital"}
							</span>
							<span className="truncate text-muted-foreground text-xs">
								{currentTenant?.roles.map((r) => r.name).join(", ") || "Member"}
							</span>
						</div>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	const handleTenantSwitch = async (tenantId: string) => {
		if (tenantId === currentTenantId) return;

		const tenant = tenants.find((t) => t.id === tenantId);
		if (!tenant || !isTenantAccessible(tenant)) return;

		try {
			await switchTenantMutation.mutateAsync({ tenantId });
			// Navigate to dashboard after switching tenant
			navigate({ to: "/dashboard" });
		} catch {
			// Error handling is managed by the mutation
		}
	};

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							disabled={switchTenantMutation.isPending}
						>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
								{switchTenantMutation.isPending ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<Building2 className="size-4" />
								)}
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">
									{currentTenant?.name || "Select Hospital"}
								</span>
								<span className="truncate text-muted-foreground text-xs">
									{currentTenant?.roles.map((r) => r.name).join(", ") ||
										"Member"}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-muted-foreground text-xs">
							Your Organizations
						</DropdownMenuLabel>
						{tenants.map((tenant) => {
							const isAccessible = isTenantAccessible(tenant);
							const isCurrent = tenant.id === currentTenantId;

							return (
								<DropdownMenuItem
									key={tenant.id}
									onClick={() => handleTenantSwitch(tenant.id)}
									className="gap-2 p-2"
									disabled={!isAccessible || isCurrent}
								>
									<div className="flex size-6 items-center justify-center rounded-md border">
										<Building2 className="size-3.5 shrink-0" />
									</div>
									<div className="flex flex-1 flex-col">
										<span className="truncate">{tenant.name}</span>
										{!isAccessible && (
											<span className="text-muted-foreground text-xs">
												{getTenantStatusLabel(tenant.status)}
											</span>
										)}
									</div>
									{isCurrent && <Check className="ml-auto size-4" />}
								</DropdownMenuItem>
							);
						})}
						<DropdownMenuSeparator />
						<div className="p-2 text-muted-foreground text-xs">
							{tenants.length} organization{tenants.length !== 1 ? "s" : ""}
						</div>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
