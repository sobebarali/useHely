import {
	Activity,
	Building2,
	Calendar,
	FileText,
	LayoutDashboard,
	Package,
	Pill,
	Settings2,
	Stethoscope,
	UserCog,
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

// useHely Navigation Data
const navMain = [
	{
		title: "Dashboard",
		url: "/dashboard",
		icon: LayoutDashboard,
		isActive: true,
		items: [
			{
				title: "Overview",
				url: "/dashboard",
			},
			{
				title: "Analytics",
				url: "/dashboard/analytics",
			},
		],
	},
	{
		title: "Patients",
		url: "/dashboard/patients",
		icon: Users,
		items: [
			{
				title: "All Patients",
				url: "/dashboard/patients",
			},
			{
				title: "Register Patient",
				url: "/dashboard/patients/register",
			},
			{
				title: "OPD Queue",
				url: "/dashboard/patients/opd-queue",
			},
		],
	},
	{
		title: "Appointments",
		url: "/dashboard/appointments",
		icon: Calendar,
		items: [
			{
				title: "All Appointments",
				url: "/dashboard/appointments",
			},
			{
				title: "Schedule",
				url: "/dashboard/appointments/schedule",
			},
			{
				title: "Calendar",
				url: "/dashboard/appointments/calendar",
			},
		],
	},
	{
		title: "Doctors",
		url: "/dashboard/doctors",
		icon: Stethoscope,
		items: [
			{
				title: "All Doctors",
				url: "/dashboard/doctors",
			},
			{
				title: "Availability",
				url: "/dashboard/doctors/availability",
			},
		],
	},
	{
		title: "Prescriptions",
		url: "/dashboard/prescriptions",
		icon: FileText,
		items: [
			{
				title: "All Prescriptions",
				url: "/dashboard/prescriptions",
			},
			{
				title: "Create",
				url: "/dashboard/prescriptions/create",
			},
			{
				title: "Templates",
				url: "/dashboard/prescriptions/templates",
			},
		],
	},
	{
		title: "Vitals",
		url: "/dashboard/vitals",
		icon: Activity,
		items: [
			{
				title: "Record Vitals",
				url: "/dashboard/vitals/record",
			},
			{
				title: "History",
				url: "/dashboard/vitals/history",
			},
		],
	},
	{
		title: "Pharmacy",
		url: "/dashboard/pharmacy",
		icon: Pill,
		items: [
			{
				title: "Dispensing",
				url: "/dashboard/pharmacy/dispensing",
			},
			{
				title: "Pending",
				url: "/dashboard/pharmacy/pending",
			},
		],
	},
	{
		title: "Inventory",
		url: "/dashboard/inventory",
		icon: Package,
		items: [
			{
				title: "Stock",
				url: "/dashboard/inventory/stock",
			},
			{
				title: "Low Stock Alerts",
				url: "/dashboard/inventory/alerts",
			},
		],
	},
	{
		title: "Departments",
		url: "/dashboard/departments",
		icon: Building2,
		items: [
			{
				title: "All Departments",
				url: "/dashboard/departments",
			},
			{
				title: "Manage",
				url: "/dashboard/departments/manage",
			},
		],
	},
	{
		title: "Staff",
		url: "/dashboard/staff",
		icon: UserCog,
		items: [
			{
				title: "All Staff",
				url: "/dashboard/staff",
			},
			{
				title: "Add Staff",
				url: "/dashboard/staff/add",
			},
			{
				title: "Roles",
				url: "/dashboard/staff/roles",
			},
		],
	},
	{
		title: "Reports",
		url: "/dashboard/reports",
		icon: FileText,
		items: [
			{
				title: "Patient Reports",
				url: "/dashboard/reports/patients",
			},
			{
				title: "Appointment Reports",
				url: "/dashboard/reports/appointments",
			},
			{
				title: "Revenue Reports",
				url: "/dashboard/reports/revenue",
			},
		],
	},
	{
		title: "Settings",
		url: "/dashboard/settings",
		icon: Settings2,
		items: [
			{
				title: "General",
				url: "/dashboard/settings/general",
			},
			{
				title: "Hospital Profile",
				url: "/dashboard/settings/profile",
			},
			{
				title: "Security",
				url: "/dashboard/settings/security",
			},
			{
				title: "Notifications",
				url: "/dashboard/settings/notifications",
			},
		],
	},
];

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
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<HospitalSwitcher hospital={hospital} />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={navMain} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
