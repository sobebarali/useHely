/**
 * Role-specific Dashboard Components
 *
 * Components for different user roles based on dashboard API responses
 */

import {
	Activity,
	AlertTriangle,
	BedDouble,
	Calendar,
	ClipboardList,
	Clock,
	Phone,
	Pill,
	TrendingUp,
	UserCheck,
	UserPlus,
	Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/use-dashboard";
import type {
	DoctorDashboardOutput,
	NurseDashboardOutput,
	PharmacistDashboardOutput,
	ReceptionistDashboardOutput,
} from "@/lib/dashboard-client";

// Doctor Dashboard Component
export function DoctorDashboard() {
	const { data: dashboardData, isLoading, error } = useDashboard();

	if (isLoading) return <DoctorDashboardSkeleton />;
	if (error || !dashboardData) return <DashboardError />;

	const data = dashboardData as DoctorDashboardOutput;

	return (
		<div className="space-y-6">
			{/* Today's Overview */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Total Appointments
						</CardTitle>
						<Calendar className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{data.today.totalAppointments}
						</div>
						<p className="text-muted-foreground text-xs">
							{data.today.completed} completed, {data.today.remaining} remaining
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Current Patient
						</CardTitle>
						<UserCheck className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{data.today.currentPatient
								? data.today.currentPatient.name
								: "None"}
						</div>
						<p className="text-muted-foreground text-xs">
							{data.today.currentPatient
								? `ID: ${data.today.currentPatient.patientId}`
								: "No active consultation"}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Next Patient</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{data.today.nextPatient ? data.today.nextPatient.name : "None"}
						</div>
						<p className="text-muted-foreground text-xs">
							{data.today.nextPatient
								? `ID: ${data.today.nextPatient.patientId}`
								: "No next appointment"}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Prescriptions Today
						</CardTitle>
						<Pill className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{data.prescriptions.issuedToday}
						</div>
						<p className="text-muted-foreground text-xs">
							{data.prescriptions.pendingDispensing} pending dispensing
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Queue Status */}
			<Card>
				<CardHeader>
					<CardTitle>Queue Status</CardTitle>
					<CardDescription>Current patient queue</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="font-medium text-sm">Waiting Patients</span>
							<Badge variant="secondary">{data.queue.waiting}</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span className="font-medium text-sm">Average Wait Time</span>
							<Badge variant="outline">{data.queue.averageWait} min</Badge>
						</div>
						{data.queue.current.length > 0 && (
							<div className="space-y-2">
								<span className="font-medium text-sm">
									Currently Being Seen:
								</span>
								{data.queue.current.map((patient) => (
									<div
										key={`queue-${patient.queueNumber}`}
										className="flex items-center justify-between rounded bg-muted p-2"
									>
										<span className="text-sm">
											#{patient.queueNumber} {patient.patientName}
										</span>
										<Badge
											variant={
												patient.status === "IN_PROGRESS"
													? "default"
													: "secondary"
											}
										>
											{patient.status}
										</Badge>
									</div>
								))}
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Recent Patients */}
			<Card>
				<CardHeader>
					<CardTitle>Recent Patients</CardTitle>
					<CardDescription>Patients you've seen recently</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{data.patients.recentPatients.map((patient) => (
							<div
								key={patient.id}
								className="flex items-center justify-between"
							>
								<div>
									<p className="font-medium">{patient.name}</p>
									<p className="text-muted-foreground text-sm">
										Last visit:{" "}
										{new Date(patient.lastVisit).toLocaleDateString()}
									</p>
								</div>
								<Button variant="outline" size="sm">
									View Details
								</Button>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// Nurse Dashboard Component
export function NurseDashboard() {
	const { data: dashboardData, isLoading, error } = useDashboard();

	if (isLoading) return <NurseDashboardSkeleton />;
	if (error || !dashboardData) return <DashboardError />;

	const data = dashboardData as NurseDashboardOutput;

	return (
		<div className="space-y-6">
			{/* Ward Overview */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Ward: {data.ward.name}
						</CardTitle>
						<BedDouble className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{data.ward.occupiedBeds}/{data.ward.totalBeds}
						</div>
						<p className="text-muted-foreground text-xs">
							{data.ward.availableBeds} beds available
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Assigned Patients
						</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{data.patients.assigned}</div>
						<p className="text-muted-foreground text-xs">
							{data.patients.critical} critical
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Vitals Today</CardTitle>
						<Activity className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{data.vitals.recordedToday}
						</div>
						<p className="text-muted-foreground text-xs">
							{data.vitals.pendingRecording} pending recording
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Pending Tasks</CardTitle>
						<ClipboardList className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{data.tasks.pending}</div>
						<p className="text-muted-foreground text-xs">
							{data.tasks.medicationDue.length} medications due
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Critical Patients */}
			{data.patients.needsAttention.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-destructive" />
							Patients Needing Attention
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{data.patients.needsAttention.map((patient) => (
								<div
									key={patient.patientId}
									className="flex items-center justify-between rounded border border-destructive/20 bg-destructive/10 p-3"
								>
									<div>
										<p className="font-medium">{patient.patientName}</p>
										<p className="text-muted-foreground text-sm">
											{patient.reason}
										</p>
									</div>
									<Button size="sm" variant="destructive">
										Attend Now
									</Button>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Abnormal Vitals */}
			{data.vitals.abnormal.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Abnormal Vitals</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{data.vitals.abnormal.map((vital) => (
								<div
									key={`${vital.patientId}-${vital.parameter}`}
									className="flex items-center justify-between rounded border border-orange-200 bg-orange-50 p-3"
								>
									<div>
										<p className="font-medium">{vital.patientName}</p>
										<p className="text-muted-foreground text-sm">
											{vital.parameter}: {vital.value} ({vital.severity})
										</p>
									</div>
									<Badge variant="destructive">{vital.severity}</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// Pharmacist Dashboard Component
export function PharmacistDashboard() {
	const { data: dashboardData, isLoading, error } = useDashboard();

	if (isLoading) return <PharmacistDashboardSkeleton />;
	if (error || !dashboardData) return <DashboardError />;

	const data = dashboardData as PharmacistDashboardOutput;

	return (
		<div className="space-y-6">
			{/* Queue Overview */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Pending Prescriptions
						</CardTitle>
						<Pill className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{data.queue.pending}</div>
						<p className="text-muted-foreground text-xs">
							{data.queue.urgent} urgent
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">In Progress</CardTitle>
						<Activity className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{data.queue.inProgress}</div>
						<p className="text-muted-foreground text-xs">
							{data.queue.averageWait} min avg wait
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Completed Today
						</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{data.dispensing.completedToday}
						</div>
						<p className="text-muted-foreground text-xs">
							{data.dispensing.totalToday} total today
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Out of Stock</CardTitle>
						<AlertTriangle className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{data.inventory.outOfStock}
						</div>
						<p className="text-muted-foreground text-xs">
							{data.inventory.lowStock.length} low stock items
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Next Prescription */}
			{data.queue.nextPrescription && (
				<Card>
					<CardHeader>
						<CardTitle>Next Prescription</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">
									{data.queue.nextPrescription.patientName}
								</p>
								<p className="text-muted-foreground text-sm">
									Priority: {data.queue.nextPrescription.priority}
								</p>
							</div>
							<Button>Start Dispensing</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Low Stock Alerts */}
			{data.inventory.lowStock.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Low Stock Alerts</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{data.inventory.lowStock.map((item) => (
								<div
									key={item.medicineId}
									className="flex items-center justify-between rounded border border-orange-200 bg-orange-50 p-3"
								>
									<div>
										<p className="font-medium">{item.name}</p>
										<p className="text-muted-foreground text-sm">
											Current: {item.currentStock} | Reorder at:{" "}
											{item.reorderLevel}
										</p>
									</div>
									<Button size="sm" variant="outline">
										Reorder
									</Button>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// Receptionist Dashboard Component
export function ReceptionistDashboard() {
	const { data: dashboardData, isLoading, error } = useDashboard();

	if (isLoading) return <ReceptionistDashboardSkeleton />;
	if (error || !dashboardData) return <DashboardError />;

	const data = dashboardData as ReceptionistDashboardOutput;

	return (
		<div className="space-y-6">
			{/* Today's Overview */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Registrations Today
						</CardTitle>
						<UserPlus className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{data.registrations.today}</div>
						<p className="text-muted-foreground text-xs">
							{data.registrations.pending} pending
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Appointments</CardTitle>
						<Calendar className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{data.appointments.todayTotal}
						</div>
						<p className="text-muted-foreground text-xs">
							{data.appointments.checkedIn} checked in
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Queue Status</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{data.queue.totalWaiting}</div>
						<p className="text-muted-foreground text-xs">
							{data.queue.averageWait} min avg wait
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Check-ins</CardTitle>
						<Phone className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{data.checkIns.completedToday}
						</div>
						<p className="text-muted-foreground text-xs">
							{data.checkIns.pending.length} pending
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Pending Check-ins */}
			{data.checkIns.pending.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Pending Check-ins</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{data.checkIns.pending.map((appointment) => (
								<div
									key={appointment.id}
									className="flex items-center justify-between"
								>
									<div>
										<p className="font-medium">{appointment.patientName}</p>
										<p className="text-muted-foreground text-sm">
											Scheduled:{" "}
											{new Date(appointment.scheduledTime).toLocaleTimeString()}
										</p>
									</div>
									<Button size="sm">Check In</Button>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Upcoming Appointments */}
			<Card>
				<CardHeader>
					<CardTitle>Upcoming Appointments</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{data.appointments.upcoming.map((appointment) => (
							<div
								key={appointment.id}
								className="flex items-center justify-between"
							>
								<div>
									<p className="font-medium">{appointment.patientName}</p>
									<p className="text-muted-foreground text-sm">
										Dr. {appointment.doctorName} •{" "}
										{new Date(appointment.time).toLocaleTimeString()}
									</p>
								</div>
								<Button variant="outline" size="sm">
									View Details
								</Button>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// Error Component
function DashboardError() {
	return (
		<Card>
			<CardContent className="flex h-32 items-center justify-center">
				<p className="text-muted-foreground">Failed to load dashboard data</p>
			</CardContent>
		</Card>
	);
}

// Skeleton Components
function DoctorDashboardSkeleton() {
	const statCards = [
		"total-appointments-skeleton",
		"completed-skeleton",
		"remaining-skeleton",
		"pending-followups-skeleton",
	];
	const contentCards = ["current-patient-skeleton", "today-schedule-skeleton"];

	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{statCards.map((key) => (
					<Card key={key}>
						<CardHeader className="pb-2">
							<Skeleton className="h-4 w-20" />
						</CardHeader>
						<CardContent>
							<Skeleton className="mb-2 h-8 w-16" />
							<Skeleton className="h-3 w-24" />
						</CardContent>
					</Card>
				))}
			</div>
			{contentCards.map((key) => (
				<Card key={key}>
					<CardHeader>
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-4 w-48" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-20 w-full" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function NurseDashboardSkeleton() {
	return <DoctorDashboardSkeleton />;
}

function PharmacistDashboardSkeleton() {
	return <DoctorDashboardSkeleton />;
}

function ReceptionistDashboardSkeleton() {
	return <DoctorDashboardSkeleton />;
}
