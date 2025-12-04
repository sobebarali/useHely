import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	CalendarPlus,
	ChevronLeft,
	ChevronRight,
	Clock,
	Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	type AppointmentListItem,
	type AppointmentStatus,
	useAppointments,
} from "@/hooks/use-appointments";
import { useDepartments } from "@/hooks/use-departments";
import { useUsers } from "@/hooks/use-users";
import { authClient } from "@/lib/auth-client";
import { normalizeSelectValue, SELECT_ALL_VALUE } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/appointments/calendar")({
	component: AppointmentsCalendarPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function getStatusColor(status: AppointmentStatus): string {
	switch (status) {
		case "SCHEDULED":
			return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
		case "CONFIRMED":
			return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
		case "CHECKED_IN":
			return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
		case "IN_PROGRESS":
			return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
		case "COMPLETED":
			return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
		case "CANCELLED":
			return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
		case "NO_SHOW":
			return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
		default:
			return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
	}
}

function AppointmentsCalendarPage() {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [viewMode, setViewMode] = useState<"week" | "month">("week");
	const [doctorFilter, setDoctorFilter] = useState<string>("");
	const [departmentFilter, setDepartmentFilter] = useState<string>("");

	// Calculate date range based on view mode
	const dateRange = useMemo(() => {
		const start = new Date(currentDate);
		const end = new Date(currentDate);

		if (viewMode === "week") {
			// Get start of week (Sunday)
			const day = start.getDay();
			start.setDate(start.getDate() - day);
			// Clone start date for end calculation
			end.setTime(start.getTime());
			end.setDate(end.getDate() + 6);
		} else {
			// Get start and end of month
			start.setDate(1);
			end.setMonth(end.getMonth() + 1);
			end.setDate(0);
		}

		return {
			startDate: start.toISOString().split("T")[0],
			endDate: end.toISOString().split("T")[0],
		};
	}, [currentDate, viewMode]);

	// Fetch appointments for the date range
	const { data: appointmentsData, isLoading: appointmentsLoading } =
		useAppointments({
			startDate: dateRange.startDate,
			endDate: dateRange.endDate,
			doctorId: normalizeSelectValue(doctorFilter) || undefined,
			departmentId: normalizeSelectValue(departmentFilter) || undefined,
			limit: 100,
		});

	// Fetch filters data
	const { data: doctorsData } = useUsers({
		role: "DOCTOR",
		status: "ACTIVE",
		limit: 100,
	});
	const { data: departmentsData } = useDepartments({ status: "ACTIVE" });

	// Group appointments by date
	const appointmentsByDate = useMemo(() => {
		const grouped: Record<string, AppointmentListItem[]> = {};
		appointmentsData?.data.forEach((apt) => {
			const date = apt.date.split("T")[0];
			if (!grouped[date]) {
				grouped[date] = [];
			}
			grouped[date].push(apt);
		});
		// Sort appointments by time within each day
		for (const date of Object.keys(grouped)) {
			grouped[date].sort((a, b) =>
				a.timeSlot.start.localeCompare(b.timeSlot.start),
			);
		}
		return grouped;
	}, [appointmentsData]);

	// Generate days for the calendar
	const calendarDays = useMemo(() => {
		const days: Date[] = [];
		const start = new Date(dateRange.startDate);
		const end = new Date(dateRange.endDate);

		while (start <= end) {
			days.push(new Date(start));
			start.setDate(start.getDate() + 1);
		}

		return days;
	}, [dateRange]);

	const formatTime = (time: string) => {
		const [hours, minutes] = time.split(":");
		const hour = Number.parseInt(hours, 10);
		const ampm = hour >= 12 ? "PM" : "AM";
		const hour12 = hour % 12 || 12;
		return `${hour12}:${minutes} ${ampm}`;
	};

	const handlePrevious = () => {
		const newDate = new Date(currentDate);
		if (viewMode === "week") {
			newDate.setDate(newDate.getDate() - 7);
		} else {
			newDate.setMonth(newDate.getMonth() - 1);
		}
		setCurrentDate(newDate);
	};

	const handleNext = () => {
		const newDate = new Date(currentDate);
		if (viewMode === "week") {
			newDate.setDate(newDate.getDate() + 7);
		} else {
			newDate.setMonth(newDate.getMonth() + 1);
		}
		setCurrentDate(newDate);
	};

	const handleToday = () => {
		setCurrentDate(new Date());
	};

	const formatMonthYear = (date: Date) => {
		return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
	};

	const isToday = (date: Date) => {
		const today = new Date();
		return date.toDateString() === today.toDateString();
	};

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-2xl">Appointments Calendar</h1>
					<p className="text-muted-foreground">
						View appointments in calendar format
					</p>
				</div>
				<Button asChild>
					<Link to="/dashboard/appointments/schedule">
						<CalendarPlus className="mr-2 h-4 w-4" />
						Schedule Appointment
					</Link>
				</Button>
			</div>

			{/* Controls */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				{/* Navigation */}
				<div className="flex items-center gap-2">
					<Button variant="outline" size="icon" onClick={handlePrevious}>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button variant="outline" onClick={handleToday}>
						Today
					</Button>
					<Button variant="outline" size="icon" onClick={handleNext}>
						<ChevronRight className="h-4 w-4" />
					</Button>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								className="ml-2 font-semibold text-lg hover:bg-muted"
							>
								{formatMonthYear(currentDate)}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={currentDate}
								onSelect={(date) => date && setCurrentDate(date)}
								defaultMonth={currentDate}
								autoFocus
							/>
						</PopoverContent>
					</Popover>
				</div>

				{/* Filters */}
				<div className="flex gap-2">
					<div className="w-32">
						<Label htmlFor="view-mode" className="sr-only">
							View
						</Label>
						<Select
							value={viewMode}
							onValueChange={(v) => setViewMode(v as "week" | "month")}
						>
							<SelectTrigger id="view-mode">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="week">Week</SelectItem>
								<SelectItem value="month">Month</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="w-40">
						<Label htmlFor="doctor-filter" className="sr-only">
							Doctor
						</Label>
						<Select value={doctorFilter} onValueChange={setDoctorFilter}>
							<SelectTrigger id="doctor-filter">
								<SelectValue placeholder="All Doctors" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={SELECT_ALL_VALUE}>All Doctors</SelectItem>
								{doctorsData?.data.map((doctor) => (
									<SelectItem key={doctor.id} value={doctor.id}>
										Dr. {doctor.firstName} {doctor.lastName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="w-40">
						<Label htmlFor="department-filter" className="sr-only">
							Department
						</Label>
						<Select
							value={departmentFilter}
							onValueChange={setDepartmentFilter}
						>
							<SelectTrigger id="department-filter">
								<SelectValue placeholder="All Departments" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={SELECT_ALL_VALUE}>
									All Departments
								</SelectItem>
								{departmentsData?.data.map((dept) => (
									<SelectItem key={dept.id} value={dept.id}>
										{dept.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			{/* Calendar */}
			{appointmentsLoading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-7">
					{calendarDays.map((day) => {
						const dateStr = day.toISOString().split("T")[0];
						const dayAppointments = appointmentsByDate[dateStr] || [];
						const dayOfWeek = day.toLocaleDateString("en-US", {
							weekday: "short",
						});
						const dayNum = day.getDate();

						return (
							<Card
								key={dateStr}
								className={`min-h-[200px] ${isToday(day) ? "ring-2 ring-primary" : ""}`}
							>
								<CardHeader className="p-3 pb-2">
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground text-xs">
											{dayOfWeek}
										</span>
										<span
											className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
												isToday(day) ? "bg-primary text-primary-foreground" : ""
											}`}
										>
											{dayNum}
										</span>
									</div>
								</CardHeader>
								<CardContent className="p-2">
									<div className="space-y-1">
										{dayAppointments.length === 0 ? (
											<p className="py-4 text-center text-muted-foreground text-xs">
												No appointments
											</p>
										) : (
											dayAppointments.slice(0, 4).map((apt) => (
												<Link
													key={apt.id}
													to="/dashboard/appointments/$id"
													params={{ id: apt.id }}
													className={`block rounded p-1.5 text-xs transition-colors hover:opacity-80 ${getStatusColor(apt.status)}`}
												>
													<div className="flex items-center gap-1">
														<Clock className="h-3 w-3" />
														<span>{formatTime(apt.timeSlot.start)}</span>
													</div>
													<div className="mt-0.5 truncate font-medium">
														{apt.patient.firstName} {apt.patient.lastName}
													</div>
												</Link>
											))
										)}
										{dayAppointments.length > 4 && (
											<p className="text-center text-muted-foreground text-xs">
												+{dayAppointments.length - 4} more
											</p>
										)}
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* Legend */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Status Legend</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-3">
						{[
							{ status: "SCHEDULED", label: "Scheduled" },
							{ status: "CONFIRMED", label: "Confirmed" },
							{ status: "CHECKED_IN", label: "Checked In" },
							{ status: "IN_PROGRESS", label: "In Progress" },
							{ status: "COMPLETED", label: "Completed" },
							{ status: "CANCELLED", label: "Cancelled" },
							{ status: "NO_SHOW", label: "No Show" },
						].map(({ status, label }) => (
							<div key={status} className="flex items-center gap-2">
								<div
									className={`h-3 w-3 rounded ${getStatusColor(status as AppointmentStatus)}`}
								/>
								<span className="text-sm">{label}</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
