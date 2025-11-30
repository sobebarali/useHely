import { useForm } from "@tanstack/react-form";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import z from "zod";
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
import { useDepartments } from "@/hooks/use-departments";
import { useRegisterPatient } from "@/hooks/use-patients";
import { useUsers } from "@/hooks/use-users";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/patients-client";

export const Route = createFileRoute("/dashboard/patients/register")({
	component: RegisterPatientPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

const registerPatientSchema = z.object({
	firstName: z.string().min(1, "First name is required").max(50),
	lastName: z.string().min(1, "Last name is required").max(50),
	dateOfBirth: z.string().min(1, "Date of birth is required"),
	gender: z.string().min(1, "Gender is required"),
	bloodGroup: z.string(),
	phone: z.string().min(1, "Phone number is required"),
	email: z.string(),
	patientType: z.string().min(1, "Patient type is required"),
	department: z.string(),
	assignedDoctor: z.string(),
	street: z.string().min(1, "Street is required"),
	city: z.string().min(1, "City is required"),
	state: z.string().min(1, "State is required"),
	postalCode: z.string().min(1, "Postal code is required"),
	country: z.string().min(1, "Country is required"),
	emergencyName: z.string().min(1, "Emergency contact name is required"),
	emergencyRelationship: z.string().min(1, "Relationship is required"),
	emergencyPhone: z.string().min(1, "Emergency contact phone is required"),
});

function RegisterPatientPage() {
	const navigate = useNavigate();
	const registerPatientMutation = useRegisterPatient();

	// Fetch departments for selection
	const { data: departmentsData } = useDepartments({
		status: "ACTIVE",
		limit: 100,
	});

	// Fetch doctors (staff with DOCTOR role)
	const { data: doctorsData } = useUsers({
		role: "DOCTOR",
		status: "ACTIVE",
		limit: 100,
	});

	const form = useForm({
		defaultValues: {
			firstName: "",
			lastName: "",
			dateOfBirth: "",
			gender: "",
			bloodGroup: "",
			phone: "",
			email: "",
			patientType: "",
			department: "",
			assignedDoctor: "",
			street: "",
			city: "",
			state: "",
			postalCode: "",
			country: "",
			emergencyName: "",
			emergencyRelationship: "",
			emergencyPhone: "",
		},
		onSubmit: async ({ value }) => {
			try {
				const result = await registerPatientMutation.mutateAsync({
					firstName: value.firstName,
					lastName: value.lastName,
					dateOfBirth: new Date(value.dateOfBirth).toISOString(),
					gender: value.gender as "MALE" | "FEMALE" | "OTHER",
					bloodGroup: value.bloodGroup
						? (value.bloodGroup as
								| "A+"
								| "A-"
								| "B+"
								| "B-"
								| "AB+"
								| "AB-"
								| "O+"
								| "O-")
						: undefined,
					phone: value.phone,
					email: value.email || undefined,
					patientType: value.patientType as "OPD" | "IPD",
					department: value.department || undefined,
					assignedDoctor: value.assignedDoctor || undefined,
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
				});
				toast.success("Patient registered successfully");
				navigate({ to: "/dashboard/patients/$id", params: { id: result.id } });
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to register patient");
			}
		},
		validators: {
			onSubmit: registerPatientSchema,
		},
	});

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="outline" size="icon" asChild>
					<Link to="/dashboard/patients">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div>
					<h1 className="font-bold text-2xl">Register New Patient</h1>
					<p className="text-muted-foreground">
						Enter the patient details to register them in the system
					</p>
				</div>
			</div>

			{/* Form */}
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="grid gap-6 lg:grid-cols-2"
			>
				{/* Basic Information */}
				<Card>
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
						<CardDescription>
							Patient's personal and demographic details
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<form.Field name="firstName">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>First Name *</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="John"
										/>
										{field.state.meta.errors.map((error) => (
											<p key={String(error)} className="text-red-500 text-sm">
												{String(error)}
											</p>
										))}
									</div>
								)}
							</form.Field>

							<form.Field name="lastName">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Last Name *</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Doe"
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

						<div className="grid gap-4 sm:grid-cols-2">
							<form.Field name="dateOfBirth">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Date of Birth *</Label>
										<Input
											id={field.name}
											name={field.name}
											type="date"
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

							<form.Field name="gender">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Gender *</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
										>
											<SelectTrigger id={field.name}>
												<SelectValue placeholder="Select gender" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="MALE">Male</SelectItem>
												<SelectItem value="FEMALE">Female</SelectItem>
												<SelectItem value="OTHER">Other</SelectItem>
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

						<div className="grid gap-4 sm:grid-cols-2">
							<form.Field name="bloodGroup">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Blood Group</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
										>
											<SelectTrigger id={field.name}>
												<SelectValue placeholder="Select blood group" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="A+">A+</SelectItem>
												<SelectItem value="A-">A-</SelectItem>
												<SelectItem value="B+">B+</SelectItem>
												<SelectItem value="B-">B-</SelectItem>
												<SelectItem value="AB+">AB+</SelectItem>
												<SelectItem value="AB-">AB-</SelectItem>
												<SelectItem value="O+">O+</SelectItem>
												<SelectItem value="O-">O-</SelectItem>
											</SelectContent>
										</Select>
									</div>
								)}
							</form.Field>

							<form.Field name="patientType">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Patient Type *</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
										>
											<SelectTrigger id={field.name}>
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
					</CardContent>
				</Card>

				{/* Contact Information */}
				<Card>
					<CardHeader>
						<CardTitle>Contact Information</CardTitle>
						<CardDescription>
							Patient's contact details for communication
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
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
											placeholder="+1 (555) 123-4567"
										/>
										{field.state.meta.errors.map((error) => (
											<p key={String(error)} className="text-red-500 text-sm">
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
											placeholder="john.doe@example.com"
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

						<div className="grid gap-4 sm:grid-cols-2">
							<form.Field name="department">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Department</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
										>
											<SelectTrigger id={field.name}>
												<SelectValue placeholder="Select department" />
											</SelectTrigger>
											<SelectContent>
												{departmentsData?.data.map((dept) => (
													<SelectItem key={dept.id} value={dept.id}>
														{dept.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}
							</form.Field>

							<form.Field name="assignedDoctor">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Assigned Doctor</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
										>
											<SelectTrigger id={field.name}>
												<SelectValue placeholder="Select doctor" />
											</SelectTrigger>
											<SelectContent>
												{doctorsData?.data.map((doctor) => (
													<SelectItem key={doctor.id} value={doctor.id}>
														Dr. {doctor.firstName} {doctor.lastName}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}
							</form.Field>
						</div>
					</CardContent>
				</Card>

				{/* Address */}
				<Card>
					<CardHeader>
						<CardTitle>Address</CardTitle>
						<CardDescription>Patient's residential address</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
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
										placeholder="123 Main St"
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
											placeholder="New York"
										/>
										{field.state.meta.errors.map((error) => (
											<p key={String(error)} className="text-red-500 text-sm">
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
											placeholder="NY"
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
											placeholder="10001"
										/>
										{field.state.meta.errors.map((error) => (
											<p key={String(error)} className="text-red-500 text-sm">
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
											placeholder="USA"
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
					</CardContent>
				</Card>

				{/* Emergency Contact */}
				<Card>
					<CardHeader>
						<CardTitle>Emergency Contact</CardTitle>
						<CardDescription>
							Contact person in case of emergency
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
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
											placeholder="Jane Doe"
										/>
										{field.state.meta.errors.map((error) => (
											<p key={String(error)} className="text-red-500 text-sm">
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
											placeholder="Spouse"
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
										placeholder="+1 (555) 987-6543"
									/>
									{field.state.meta.errors.map((error) => (
										<p key={String(error)} className="text-red-500 text-sm">
											{String(error)}
										</p>
									))}
								</div>
							)}
						</form.Field>
					</CardContent>
				</Card>

				{/* Submit Button */}
				<div className="flex justify-end gap-4 lg:col-span-2">
					<Button type="button" variant="outline" asChild>
						<Link to="/dashboard/patients">Cancel</Link>
					</Button>
					<form.Subscribe>
						{(state) => (
							<Button
								type="submit"
								disabled={
									!state.canSubmit ||
									state.isSubmitting ||
									registerPatientMutation.isPending
								}
							>
								{state.isSubmitting || registerPatientMutation.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Registering...
									</>
								) : (
									<>
										<UserPlus className="mr-2 h-4 w-4" />
										Register Patient
									</>
								)}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</form>
		</div>
	);
}
