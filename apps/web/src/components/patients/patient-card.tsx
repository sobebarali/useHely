import { Link } from "@tanstack/react-router";
import { Calendar, Mail, Phone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type {
	PatientDetails,
	PatientListItem,
	SearchPatientResult,
} from "@/hooks/use-patients";

type PatientData = PatientDetails | PatientListItem | SearchPatientResult;

export interface PatientCardProps {
	patient: PatientData;
	variant?: "default" | "compact" | "minimal";
	showActions?: boolean;
	onSelect?: (patient: PatientData) => void;
	className?: string;
}

function isPatientDetails(patient: PatientData): patient is PatientDetails {
	return "age" in patient;
}

function isPatientListItem(patient: PatientData): patient is PatientListItem {
	return "dateOfBirth" in patient && !("age" in patient);
}

function formatDate(dateString: string) {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function calculateAge(dateOfBirth: string) {
	const today = new Date();
	const birthDate = new Date(dateOfBirth);
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();
	if (
		monthDiff < 0 ||
		(monthDiff === 0 && today.getDate() < birthDate.getDate())
	) {
		age--;
	}
	return age;
}

function MinimalCardContent({
	patient,
	statusVariant,
}: {
	patient: PatientData;
	statusVariant: "default" | "secondary" | "outline" | "destructive";
}) {
	return (
		<>
			<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
				<User className="h-5 w-5 text-primary" />
			</div>
			<div className="flex-1">
				<div className="font-medium">
					{patient.firstName} {patient.lastName}
				</div>
				<div className="text-muted-foreground text-sm">{patient.patientId}</div>
			</div>
			<Badge variant={statusVariant}>{patient.status}</Badge>
		</>
	);
}

export function PatientCard({
	patient,
	variant = "default",
	showActions = true,
	onSelect,
	className = "",
}: PatientCardProps) {
	const statusVariant =
		patient.status === "ACTIVE"
			? "default"
			: patient.status === "DISCHARGED"
				? "secondary"
				: patient.status === "COMPLETED"
					? "outline"
					: "destructive";

	if (variant === "minimal") {
		if (onSelect) {
			return (
				<button
					type="button"
					className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent ${className}`}
					onClick={() => onSelect(patient)}
				>
					<MinimalCardContent patient={patient} statusVariant={statusVariant} />
				</button>
			);
		}
		return (
			<div
				className={`flex items-center gap-3 rounded-lg border p-3 ${className}`}
			>
				<MinimalCardContent patient={patient} statusVariant={statusVariant} />
			</div>
		);
	}

	if (variant === "compact") {
		return (
			<Card className={className}>
				<CardContent className="flex items-center gap-4 p-4">
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
						<User className="h-6 w-6 text-primary" />
					</div>
					<div className="flex-1">
						<div className="flex items-center gap-2">
							<span className="font-semibold">
								{patient.firstName} {patient.lastName}
							</span>
							<Badge variant="outline">{patient.patientType}</Badge>
							<Badge variant={statusVariant}>{patient.status}</Badge>
						</div>
						<div className="flex items-center gap-4 text-muted-foreground text-sm">
							<span>{patient.patientId}</span>
							<span className="flex items-center gap-1">
								<Phone className="h-3 w-3" />
								{patient.phone}
							</span>
							{"email" in patient && patient.email && (
								<span className="flex items-center gap-1">
									<Mail className="h-3 w-3" />
									{patient.email}
								</span>
							)}
						</div>
					</div>
					{showActions && (
						<Button variant="outline" size="sm" asChild>
							<Link to="/dashboard/patients/$id" params={{ id: patient.id }}>
								View
							</Link>
						</Button>
					)}
				</CardContent>
			</Card>
		);
	}

	// Default variant
	return (
		<Card className={className}>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
							<User className="h-6 w-6 text-primary" />
						</div>
						<div>
							<h3 className="font-semibold text-lg">
								{patient.firstName} {patient.lastName}
							</h3>
							<p className="text-muted-foreground text-sm">
								{patient.patientId}
							</p>
						</div>
					</div>
					<div className="flex gap-2">
						<Badge variant="outline">{patient.patientType}</Badge>
						<Badge variant={statusVariant}>{patient.status}</Badge>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid gap-3 text-sm sm:grid-cols-2">
					{(isPatientDetails(patient) || isPatientListItem(patient)) && (
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4 text-muted-foreground" />
							<span>
								{formatDate(patient.dateOfBirth)}
								{isPatientDetails(patient) && ` (${patient.age} years)`}
								{isPatientListItem(patient) &&
									` (${calculateAge(patient.dateOfBirth)} years)`}
							</span>
						</div>
					)}
					{"gender" in patient && (
						<div className="flex items-center gap-2">
							<User className="h-4 w-4 text-muted-foreground" />
							<span>{patient.gender}</span>
						</div>
					)}
					<div className="flex items-center gap-2">
						<Phone className="h-4 w-4 text-muted-foreground" />
						<span>{patient.phone}</span>
					</div>
					{"email" in patient && patient.email && (
						<div className="flex items-center gap-2">
							<Mail className="h-4 w-4 text-muted-foreground" />
							<span>{patient.email}</span>
						</div>
					)}
				</div>
				{showActions && (
					<div className="flex justify-end pt-2">
						<Button variant="outline" size="sm" asChild>
							<Link to="/dashboard/patients/$id" params={{ id: patient.id }}>
								View Details
							</Link>
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default PatientCard;
