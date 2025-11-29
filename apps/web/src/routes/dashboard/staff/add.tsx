import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import z from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
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
import { useSession } from "@/hooks/use-auth";
import { useCreateUser } from "@/hooks/use-users";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/users-client";

export const Route = createFileRoute("/dashboard/staff/add")({
	component: AddStaffPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function AddStaffPage() {
	const navigate = useNavigate();
	const { data: session, isLoading: sessionLoading } = useSession();
	const createUserMutation = useCreateUser();

	const form = useForm({
		defaultValues: {
			firstName: "",
			lastName: "",
			email: "",
			phone: "",
			department: "",
			role: "",
			specialization: "",
			shift: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await createUserMutation.mutateAsync({
					firstName: value.firstName,
					lastName: value.lastName,
					email: value.email,
					phone: value.phone,
					department: value.department,
					roles: [value.role],
					specialization: value.specialization || undefined,
					shift: value.shift as "MORNING" | "EVENING" | "NIGHT" | undefined,
				});
				toast.success("Staff member created successfully");
				navigate({ to: "/dashboard/staff" });
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to create staff member");
			}
		},
		validators: {
			onSubmit: z.object({
				firstName: z.string().min(1, "First name is required").max(50),
				lastName: z.string().min(1, "Last name is required").max(50),
				email: z.string().email("Invalid email address"),
				phone: z.string().min(1, "Phone number is required"),
				department: z.string().min(1, "Department is required"),
				role: z.string().min(1, "Role is required"),
				specialization: z.string(),
				shift: z.string(),
			}),
		},
	});

	if (sessionLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (!session) return null;

	const user = {
		name: `${session.firstName} ${session.lastName}`.trim() || session.username,
		email: session.email,
		image: undefined,
	};

	const hospital = {
		name: session.hospital?.name || "Unknown Hospital",
		plan: "Pro",
	};

	return (
		<DashboardLayout user={user} hospital={hospital} pageTitle="Add Staff">
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				{/* Header */}
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => navigate({ to: "/dashboard/staff" })}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<h1 className="font-bold text-2xl">Add Staff Member</h1>
						<p className="text-muted-foreground">
							Create a new staff account for your hospital
						</p>
					</div>
				</div>

				{/* Form */}
				<Card className="mx-auto w-full max-w-2xl">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<UserPlus className="h-5 w-5" />
							Staff Information
						</CardTitle>
						<CardDescription>
							Enter the details for the new staff member. They will receive an
							email with their login credentials.
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
							{/* Name Fields */}
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
												<p
													key={error?.message}
													className="text-red-500 text-sm"
												>
													{error?.message}
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
												<p
													key={error?.message}
													className="text-red-500 text-sm"
												>
													{error?.message}
												</p>
											))}
										</div>
									)}
								</form.Field>
							</div>

							{/* Contact Fields */}
							<div className="grid gap-4 sm:grid-cols-2">
								<form.Field name="email">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Email *</Label>
											<Input
												id={field.name}
												name={field.name}
												type="email"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="john.doe@hospital.com"
											/>
											{field.state.meta.errors.map((error) => (
												<p
													key={error?.message}
													className="text-red-500 text-sm"
												>
													{error?.message}
												</p>
											))}
										</div>
									)}
								</form.Field>

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
												<p
													key={error?.message}
													className="text-red-500 text-sm"
												>
													{error?.message}
												</p>
											))}
										</div>
									)}
								</form.Field>
							</div>

							{/* Department & Role */}
							<div className="grid gap-4 sm:grid-cols-2">
								<form.Field name="department">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Department *</Label>
											<Select
												value={field.state.value}
												onValueChange={field.handleChange}
											>
												<SelectTrigger id={field.name}>
													<SelectValue placeholder="Select department" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="emergency">Emergency</SelectItem>
													<SelectItem value="cardiology">Cardiology</SelectItem>
													<SelectItem value="neurology">Neurology</SelectItem>
													<SelectItem value="orthopedics">
														Orthopedics
													</SelectItem>
													<SelectItem value="pediatrics">Pediatrics</SelectItem>
													<SelectItem value="oncology">Oncology</SelectItem>
													<SelectItem value="radiology">Radiology</SelectItem>
													<SelectItem value="pharmacy">Pharmacy</SelectItem>
													<SelectItem value="administration">
														Administration
													</SelectItem>
												</SelectContent>
											</Select>
											{field.state.meta.errors.map((error) => (
												<p
													key={error?.message}
													className="text-red-500 text-sm"
												>
													{error?.message}
												</p>
											))}
										</div>
									)}
								</form.Field>

								<form.Field name="role">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Role *</Label>
											<Select
												value={field.state.value}
												onValueChange={field.handleChange}
											>
												<SelectTrigger id={field.name}>
													<SelectValue placeholder="Select role" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="doctor">Doctor</SelectItem>
													<SelectItem value="nurse">Nurse</SelectItem>
													<SelectItem value="pharmacist">Pharmacist</SelectItem>
													<SelectItem value="receptionist">
														Receptionist
													</SelectItem>
													<SelectItem value="lab_technician">
														Lab Technician
													</SelectItem>
													<SelectItem value="admin">Administrator</SelectItem>
												</SelectContent>
											</Select>
											{field.state.meta.errors.map((error) => (
												<p
													key={error?.message}
													className="text-red-500 text-sm"
												>
													{error?.message}
												</p>
											))}
										</div>
									)}
								</form.Field>
							</div>

							{/* Optional Fields */}
							<div className="grid gap-4 sm:grid-cols-2">
								<form.Field name="specialization">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Specialization</Label>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="e.g., Cardiac Surgery"
											/>
										</div>
									)}
								</form.Field>

								<form.Field name="shift">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Shift</Label>
											<Select
												value={field.state.value}
												onValueChange={field.handleChange}
											>
												<SelectTrigger id={field.name}>
													<SelectValue placeholder="Select shift" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="MORNING">Morning</SelectItem>
													<SelectItem value="EVENING">Evening</SelectItem>
													<SelectItem value="NIGHT">Night</SelectItem>
												</SelectContent>
											</Select>
										</div>
									)}
								</form.Field>
							</div>

							{/* Submit */}
							<div className="flex justify-end gap-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => navigate({ to: "/dashboard/staff" })}
								>
									Cancel
								</Button>
								<form.Subscribe>
									{(state) => (
										<Button
											type="submit"
											disabled={
												!state.canSubmit ||
												state.isSubmitting ||
												createUserMutation.isPending
											}
										>
											{state.isSubmitting || createUserMutation.isPending ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Creating...
												</>
											) : (
												<>
													<UserPlus className="mr-2 h-4 w-4" />
													Create Staff Member
												</>
											)}
										</Button>
									)}
								</form.Subscribe>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	);
}
