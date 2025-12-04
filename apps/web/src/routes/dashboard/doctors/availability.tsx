import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Clock, Loader2, Stethoscope } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useDoctorAvailability } from "@/hooks/use-appointments";
import { useUsers } from "@/hooks/use-users";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/doctors/availability")({
	component: DoctorAvailabilityPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function DoctorAvailabilityPage() {
	const [selectedDoctor, setSelectedDoctor] = useState<string>("");
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(
		new Date(),
	);

	// Fetch doctors
	const { data: doctorsData, isLoading: doctorsLoading } = useUsers({
		role: "DOCTOR",
		status: "ACTIVE",
		limit: 100,
	});

	// Format date for API call
	const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

	// Fetch availability for selected doctor and date
	const { data: availabilityData, isLoading: availabilityLoading } =
		useDoctorAvailability(selectedDoctor, formattedDate);

	// Separate available and booked slots
	const { availableSlots, bookedSlots } = useMemo(() => {
		const slots = availabilityData?.slots || [];
		return {
			availableSlots: slots.filter((slot) => slot.available),
			bookedSlots: slots.filter((slot) => !slot.available),
		};
	}, [availabilityData?.slots]);

	const formatTime = (time: string) => {
		const [hours, minutes] = time.split(":");
		const hour = Number.parseInt(hours, 10);
		const ampm = hour >= 12 ? "PM" : "AM";
		const hour12 = hour % 12 || 12;
		return `${hour12}:${minutes} ${ampm}`;
	};

	const formatDateDisplay = (date: Date | undefined) => {
		if (!date) return "";
		return date.toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const selectedDoctorInfo = doctorsData?.data.find(
		(d) => d.id === selectedDoctor,
	);

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link to="/dashboard/doctors">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div>
					<h1 className="font-bold text-2xl">Doctor Availability</h1>
					<p className="text-muted-foreground">
						View and manage doctor schedules and available time slots
					</p>
				</div>
			</div>

			{/* Controls */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
				<div className="flex-1 space-y-2">
					<Label htmlFor="doctor-select">Select Doctor</Label>
					<Select
						value={selectedDoctor}
						onValueChange={setSelectedDoctor}
						disabled={doctorsLoading}
					>
						<SelectTrigger id="doctor-select" className="w-full sm:w-80">
							<SelectValue
								placeholder={
									doctorsLoading ? "Loading doctors..." : "Select a doctor"
								}
							/>
						</SelectTrigger>
						<SelectContent>
							{doctorsData?.data.map((doctor) => (
								<SelectItem key={doctor.id} value={doctor.id}>
									Dr. {doctor.firstName} {doctor.lastName} - {doctor.department}
								</SelectItem>
							))}
							{!doctorsLoading && doctorsData?.data.length === 0 && (
								<div className="px-2 py-1.5 text-muted-foreground text-sm">
									No doctors available
								</div>
							)}
						</SelectContent>
					</Select>
				</div>

				{/* Date Picker */}
				<div className="space-y-2">
					<Label>Select Date</Label>
					<DatePicker
						value={selectedDate}
						onChange={setSelectedDate}
						placeholder="Pick a date"
					/>
				</div>
			</div>

			{/* Date Display */}
			<div className="flex items-center gap-2 text-lg">
				<Calendar className="h-5 w-5 text-muted-foreground" />
				<span className="font-medium">{formatDateDisplay(selectedDate)}</span>
			</div>

			{/* Content */}
			{!selectedDoctor ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Stethoscope className="mb-4 h-12 w-12 text-muted-foreground" />
						<h3 className="mb-2 font-semibold text-lg">
							Select a Doctor to View Availability
						</h3>
						<p className="text-center text-muted-foreground">
							Choose a doctor from the dropdown above to see their available
							time slots
						</p>
					</CardContent>
				</Card>
			) : availabilityLoading ? (
				<Card>
					<CardContent className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin" />
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-6 lg:grid-cols-3">
					{/* Doctor Info Card */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Stethoscope className="h-5 w-5" />
								Doctor Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{selectedDoctorInfo && (
								<>
									<div>
										<p className="font-medium text-lg">
											Dr. {selectedDoctorInfo.firstName}{" "}
											{selectedDoctorInfo.lastName}
										</p>
										<p className="text-muted-foreground">
											{selectedDoctorInfo.email}
										</p>
									</div>
									<div>
										<p className="text-muted-foreground text-sm">Department</p>
										<p className="font-medium">
											{selectedDoctorInfo.department}
										</p>
									</div>
									<div>
										<p className="text-muted-foreground text-sm">Status</p>
										<Badge
											variant={
												selectedDoctorInfo.status === "ACTIVE"
													? "default"
													: "secondary"
											}
										>
											{selectedDoctorInfo.status}
										</Badge>
									</div>
								</>
							)}
						</CardContent>
					</Card>

					{/* Availability Slots */}
					<Card className="lg:col-span-2">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Clock className="h-5 w-5" />
								Available Time Slots
							</CardTitle>
							<CardDescription>
								{availableSlots.length} slots available for scheduling
							</CardDescription>
						</CardHeader>
						<CardContent>
							{availableSlots.length > 0 ? (
								<div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
									{availableSlots.map((slot, index) => (
										<div
											key={`${slot.start}-${slot.end}-${index}`}
											className="flex items-center justify-between rounded-lg border bg-green-50 p-3 dark:bg-green-950"
										>
											<div className="flex items-center gap-2">
												<Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
												<span className="font-medium text-sm">
													{formatTime(slot.start)} - {formatTime(slot.end)}
												</span>
											</div>
											<Badge
												variant="outline"
												className="border-green-600 text-green-600 dark:border-green-400 dark:text-green-400"
											>
												Available
											</Badge>
										</div>
									))}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
									<h3 className="mb-2 font-semibold">No Available Slots</h3>
									<p className="text-muted-foreground">
										There are no available time slots for this doctor on the
										selected date.
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Booked Slots Summary */}
					<Card className="lg:col-span-3">
						<CardHeader>
							<CardTitle>Schedule Summary</CardTitle>
							<CardDescription>
								Overview of the doctor's schedule for the day
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 sm:grid-cols-3">
								<div className="rounded-lg bg-muted p-4 text-center">
									<p className="font-bold text-2xl text-primary">
										{availableSlots.length}
									</p>
									<p className="text-muted-foreground text-sm">
										Available Slots
									</p>
								</div>
								<div className="rounded-lg bg-muted p-4 text-center">
									<p className="font-bold text-2xl text-orange-600">
										{bookedSlots.length}
									</p>
									<p className="text-muted-foreground text-sm">Booked Slots</p>
								</div>
								<div className="rounded-lg bg-muted p-4 text-center">
									<p className="font-bold text-2xl">
										{availableSlots.length + bookedSlots.length}
									</p>
									<p className="text-muted-foreground text-sm">Total Slots</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
