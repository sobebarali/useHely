import { useForm } from "@tanstack/react-form";
import {
	createFileRoute,
	redirect,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import {
	ArrowLeft,
	Calendar,
	Droplets,
	Loader2,
	MapPin,
	Phone,
	Save,
	User,
	Users,
} from "lucide-react";
import { toast } from "sonner";
import z from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { usePatient, useUpdatePatient } from "@/hooks/use-patients";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/patients-client";

export const Route = createFileRoute("/dashboard/patients/$id")({
	component: PatientDetailPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function PatientDetailPage() {
	const navigate = useNavigate();
	const { id } = useParams({ from: "/dashboard/patients/$id" });
	const { data: patient, isLoading: patientLoading } = usePatient(id);

	const updatePatientMutation = useUpdatePatient();

	const form = useForm({
		defaultValues: {
			phone: patient?.phone || "",
			email: patient?.email || "",
			patientType: patient?.patientType || "",
			// Address
			street: patient?.address?.street || "",
			city: patient?.address?.city || "",
			state: patient?.address?.state || "",
			postalCode: patient?.address?.postalCode || "",
			country: patient?.address?.country || "",
			// Emergency Contact
			emergencyName: patient?.emergencyContact?.name || "",
			emergencyRelationship: patient?.emergencyContact?.relationship || "",
			emergencyPhone: patient?.emergencyContact?.phone || "",
		},
		onSubmit: async ({ value }) => {
			try {
				await updatePatientMutation.mutateAsync({
					id,
					data: {
						phone: value.phone,
						email: value.email || undefined,
						patientType: value.patientType as "OPD" | "IPD",
						address: {
							street: value.street,
							city: value.city,
							state: value.state,
							postalCode: value.postalCode,
							country: value.country,
						},
						emergencyContact: {
							name: value.emergencyName,
							relationship: value.emergencyRelationship,
							phone: value.emergencyPhone,
						},
					},
				});
				toast.success("Patient updated successfully");
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to update patient");
			}
		},
		validators: {
			onSubmit: z.object({
				phone: z.string().min(1, "Phone number is required"),
				email: z.string(),
				patientType: z.string().min(1, "Patient type is required"),
				street: z.string().min(1, "Street is required"),
				city: z.string().min(1, "City is required"),
				state: z.string().min(1, "State is required"),
				postalCode: z.string().min(1, "Postal code is required"),
				country: z.string().min(1, "Country is required"),
				emergencyName: z.string().min(1, "Emergency contact name is required"),
				emergencyRelationship: z.string().min(1, "Relationship is required"),
				emergencyPhone: z
					.string()
					.min(1, "Emergency contact phone is required"),
			}),
		},
	});

	// Update form when patient data loads
	if (patient && !form.state.values.phone && patient.phone) {
		form.reset({
			phone: patient.phone,
			email: patient.email || "",
			patientType: patient.patientType,
			street: patient.address?.street || "",
			city: patient.address?.city || "",
			state: patient.address?.state || "",
			postalCode: patient.address?.postalCode || "",
			country: patient.address?.country || "",
			emergencyName: patient.emergencyContact?.name || "",
			emergencyRelationship: patient.emergencyContact?.relationship || "",
			emergencyPhone: patient.emergencyContact?.phone || "",
		});
	}

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	if (patientLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (!patient) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 p-8">
				<h2 className="font-semibold text-xl">Patient not found</h2>
				<Button onClick={() => navigate({ to: "/dashboard/patients" })}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Patients List
				</Button>
			</div>
		);
	}

	const statusVariant =
		patient.status === "ACTIVE"
			? "default"
			: patient.status === "DISCHARGED"
				? "secondary"
				: patient.status === "COMPLETED"
					? "outline"
					: "destructive";

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => navigate({ to: "/dashboard/patients" })}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<div className="flex items-center gap-2">
							<h1 className="font-bold text-2xl">
								{patient.firstName} {patient.lastName}
							</h1>
							<Badge variant={statusVariant}>{patient.status}</Badge>
							<Badge
								variant={
									patient.patientType === "IPD" ? "default" : "secondary"
								}
							>
								{patient.patientType}
							</Badge>
						</div>
						<p className="text-muted-foreground">{patient.patientId}</p>
					</div>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Patient Info Card - Editable */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<User className="h-5 w-5" />
							Patient Information
						</CardTitle>
						<CardDescription>
							Update patient contact and address details
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								form.handleSubmit();
							}}
							className="space-y-6"
						>
							{/* Contact Information */}
							<div className="space-y-4">
								<h3 className="font-medium text-sm">Contact Information</h3>
								<div className="grid gap-4 sm:grid-cols-2">
									<form.Field name="phone">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Phone *</Label>
												<Input
													id={field.name}
													name={field.name}
													type="tel"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												{field.state.meta.errors.map((error) => (
													<p
														key={String(error)}
														className="text-red-500 text-sm"
													>
														{String(error)}
													</p>
												))}
											</div>
										)}
									</form.Field>

									<form.Field name="email">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Email</Label>
												<Input
													id={field.name}
													name={field.name}
													type="email"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												{field.state.meta.errors.map((error) => (
													<p
														key={String(error)}
														className="text-red-500 text-sm"
													>
														{String(error)}
													</p>
												))}
											</div>
										)}
									</form.Field>
								</div>

								<form.Field name="patientType">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Patient Type *</Label>
											<Select
												value={field.state.value}
												onValueChange={field.handleChange}
											>
												<SelectTrigger id={field.name} className="w-48">
													<SelectValue placeholder="Select type" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="OPD">OPD (Outpatient)</SelectItem>
													<SelectItem value="IPD">IPD (Inpatient)</SelectItem>
												</SelectContent>
											</Select>
											{field.state.meta.errors.map((error) => (
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</form.Field>
							</div>

							<Separator />

							{/* Address */}
							<div className="space-y-4">
								<h3 className="font-medium text-sm">Address</h3>
								<form.Field name="street">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Street Address *</Label>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
											{field.state.meta.errors.map((error) => (
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</form.Field>

								<div className="grid gap-4 sm:grid-cols-2">
									<form.Field name="city">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>City *</Label>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												{field.state.meta.errors.map((error) => (
													<p
														key={String(error)}
														className="text-red-500 text-sm"
													>
														{String(error)}
													</p>
												))}
											</div>
										)}
									</form.Field>

									<form.Field name="state">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>State *</Label>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												{field.state.meta.errors.map((error) => (
													<p
														key={String(error)}
														className="text-red-500 text-sm"
													>
														{String(error)}
													</p>
												))}
											</div>
										)}
									</form.Field>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<form.Field name="postalCode">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Postal Code *</Label>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												{field.state.meta.errors.map((error) => (
													<p
														key={String(error)}
														className="text-red-500 text-sm"
													>
														{String(error)}
													</p>
												))}
											</div>
										)}
									</form.Field>

									<form.Field name="country">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Country *</Label>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												{field.state.meta.errors.map((error) => (
													<p
														key={String(error)}
														className="text-red-500 text-sm"
													>
														{String(error)}
													</p>
												))}
											</div>
										)}
									</form.Field>
								</div>
							</div>

							<Separator />

							{/* Emergency Contact */}
							<div className="space-y-4">
								<h3 className="font-medium text-sm">Emergency Contact</h3>
								<div className="grid gap-4 sm:grid-cols-2">
									<form.Field name="emergencyName">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Name *</Label>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												{field.state.meta.errors.map((error) => (
													<p
														key={String(error)}
														className="text-red-500 text-sm"
													>
														{String(error)}
													</p>
												))}
											</div>
										)}
									</form.Field>

									<form.Field name="emergencyRelationship">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Relationship *</Label>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												{field.state.meta.errors.map((error) => (
													<p
														key={String(error)}
														className="text-red-500 text-sm"
													>
														{String(error)}
													</p>
												))}
											</div>
										)}
									</form.Field>
								</div>

								<form.Field name="emergencyPhone">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Phone *</Label>
											<Input
												id={field.name}
												name={field.name}
												type="tel"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												className="max-w-xs"
											/>
											{field.state.meta.errors.map((error) => (
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</form.Field>
							</div>

							{/* Submit */}
							<div className="flex justify-end">
								<form.Subscribe>
									{(state) => (
										<Button
											type="submit"
											disabled={
												!state.canSubmit ||
												state.isSubmitting ||
												updatePatientMutation.isPending
											}
										>
											{state.isSubmitting || updatePatientMutation.isPending ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Saving...
												</>
											) : (
												<>
													<Save className="mr-2 h-4 w-4" />
													Save Changes
												</>
											)}
										</Button>
									)}
								</form.Subscribe>
							</div>
						</form>
					</CardContent>
				</Card>

				{/* Patient Details Card - Read Only */}
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Patient Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center gap-2">
								<User className="h-4 w-4 text-muted-foreground" />
								<div>
									<Label className="text-muted-foreground text-xs">
										Gender
									</Label>
									<p className="font-medium">{patient.gender}</p>
								</div>
							</div>
							<Separator />
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4 text-muted-foreground" />
								<div>
									<Label className="text-muted-foreground text-xs">
										Date of Birth
									</Label>
									<p className="font-medium">
										{formatDate(patient.dateOfBirth)}
									</p>
									<p className="text-muted-foreground text-sm">
										{patient.age} years old
									</p>
								</div>
							</div>
							<Separator />
							{patient.bloodGroup && (
								<>
									<div className="flex items-center gap-2">
										<Droplets className="h-4 w-4 text-muted-foreground" />
										<div>
											<Label className="text-muted-foreground text-xs">
												Blood Group
											</Label>
											<p className="font-medium">{patient.bloodGroup}</p>
										</div>
									</div>
									<Separator />
								</>
							)}
							<div className="flex items-center gap-2">
								<Phone className="h-4 w-4 text-muted-foreground" />
								<div>
									<Label className="text-muted-foreground text-xs">Phone</Label>
									<p className="font-medium">{patient.phone}</p>
								</div>
							</div>
							{patient.email && (
								<>
									<Separator />
									<div>
										<Label className="text-muted-foreground text-xs">
											Email
										</Label>
										<p className="font-medium">{patient.email}</p>
									</div>
								</>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<MapPin className="h-4 w-4" />
								Address
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm">
								{patient.address?.street}
								<br />
								{patient.address?.city}, {patient.address?.state}{" "}
								{patient.address?.postalCode}
								<br />
								{patient.address?.country}
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Users className="h-4 w-4" />
								Emergency Contact
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<div>
								<Label className="text-muted-foreground text-xs">Name</Label>
								<p className="font-medium">{patient.emergencyContact?.name}</p>
							</div>
							<div>
								<Label className="text-muted-foreground text-xs">
									Relationship
								</Label>
								<p className="font-medium">
									{patient.emergencyContact?.relationship}
								</p>
							</div>
							<div>
								<Label className="text-muted-foreground text-xs">Phone</Label>
								<p className="font-medium">{patient.emergencyContact?.phone}</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>System Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label className="text-muted-foreground text-xs">
									Created At
								</Label>
								<p className="font-medium">{formatDate(patient.createdAt)}</p>
							</div>
							<Separator />
							<div>
								<Label className="text-muted-foreground text-xs">
									Last Updated
								</Label>
								<p className="font-medium">{formatDate(patient.updatedAt)}</p>
							</div>
							{patient.department && (
								<>
									<Separator />
									<div>
										<Label className="text-muted-foreground text-xs">
											Department
										</Label>
										<p className="font-medium">{patient.department}</p>
									</div>
								</>
							)}
							{patient.assignedDoctor && (
								<>
									<Separator />
									<div>
										<Label className="text-muted-foreground text-xs">
											Assigned Doctor
										</Label>
										<p className="font-medium">
											Dr. {patient.assignedDoctor.firstName}{" "}
											{patient.assignedDoctor.lastName}
											{patient.assignedDoctor.specialization && (
												<span className="text-muted-foreground text-sm">
													{" "}
													({patient.assignedDoctor.specialization})
												</span>
											)}
										</p>
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
