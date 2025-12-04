import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
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
import { useRoles } from "@/hooks/use-roles";
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

const createStaffSchema = z.object({
	firstName: z.string().min(1, "First name is required").max(50),
	lastName: z.string().min(1, "Last name is required").max(50),
	email: z.string().email("Invalid email address"),
	phone: z.string().min(1, "Phone number is required"),
	department: z.string().min(1, "Department is required"),
	role: z.string().min(1, "Role is required"),
	specialization: z.string(),
	shift: z.string(),
});

function AddStaffPage() {
	const navigate = useNavigate();
	const createUserMutation = useCreateUser();

	// Fetch departments and roles dynamically
	const { data: departmentsData, isLoading: departmentsLoading } =
		useDepartments({ status: "ACTIVE" });
	const { data: rolesData, isLoading: rolesLoading } = useRoles({
		isActive: true,
	});

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
				toast.success(
					"Staff member created successfully. They will receive an email with login credentials.",
				);
				navigate({ to: "/dashboard/staff" });
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to create staff member");
			}
		},
		validators: {
			onSubmit: createStaffSchema,
		},
	});

	return (
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
						Create a new staff member account
					</p>
				</div>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<div className="grid gap-6 lg:grid-cols-2">
					{/* Personal Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<UserPlus className="h-5 w-5" />
								Personal Information
							</CardTitle>
							<CardDescription>
								Enter the staff member's personal details
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* First Name */}
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
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>

							{/* Last Name */}
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
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>

							{/* Email */}
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
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>

							{/* Phone */}
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
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>
						</CardContent>
					</Card>

					{/* Work Information */}
					<Card>
						<CardHeader>
							<CardTitle>Work Information</CardTitle>
							<CardDescription>
								Assign department, role, and work schedule
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Department */}
							<form.Field name="department">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Department *</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
											disabled={departmentsLoading}
										>
											<SelectTrigger id={field.name}>
												<SelectValue
													placeholder={
														departmentsLoading
															? "Loading..."
															: "Select department"
													}
												/>
											</SelectTrigger>
											<SelectContent>
												{departmentsData?.data.map((dept) => (
													<SelectItem key={dept.id} value={dept.id}>
														{dept.name}
													</SelectItem>
												))}
												{!departmentsLoading &&
													(!departmentsData?.data ||
														departmentsData.data.length === 0) && (
														<div className="px-2 py-1.5 text-muted-foreground text-sm">
															No departments available
														</div>
													)}
											</SelectContent>
										</Select>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>

							{/* Role */}
							<form.Field name="role">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Role *</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
											disabled={rolesLoading}
										>
											<SelectTrigger id={field.name}>
												<SelectValue
													placeholder={
														rolesLoading ? "Loading..." : "Select role"
													}
												/>
											</SelectTrigger>
											<SelectContent>
												{rolesData?.data.map((role) => (
													<SelectItem key={role.id} value={role.id}>
														{role.name}
													</SelectItem>
												))}
												{!rolesLoading &&
													(!rolesData?.data || rolesData.data.length === 0) && (
														<div className="px-2 py-1.5 text-muted-foreground text-sm">
															No roles available
														</div>
													)}
											</SelectContent>
										</Select>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>

							{/* Specialization */}
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
											placeholder="e.g., Cardiac Surgery, Pediatrics"
										/>
										<p className="text-muted-foreground text-xs">
											Optional: Relevant for doctors and specialists
										</p>
									</div>
								)}
							</form.Field>

							{/* Shift */}
							<form.Field name="shift">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Shift</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
										>
											<SelectTrigger id={field.name}>
												<SelectValue placeholder="Select shift (optional)" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="MORNING">
													Morning (6 AM - 2 PM)
												</SelectItem>
												<SelectItem value="EVENING">
													Evening (2 PM - 10 PM)
												</SelectItem>
												<SelectItem value="NIGHT">
													Night (10 PM - 6 AM)
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
								)}
							</form.Field>
						</CardContent>
					</Card>
				</div>

				{/* Info Card */}
				<Card className="mt-6 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
					<CardContent className="pt-6">
						<p className="text-blue-800 text-sm dark:text-blue-200">
							The new staff member will receive an email with their temporary
							login credentials. They will be required to change their password
							on first login.
						</p>
					</CardContent>
				</Card>

				{/* Actions */}
				<div className="mt-6 flex justify-end gap-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate({ to: "/dashboard/staff" })}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={createUserMutation.isPending}>
						{createUserMutation.isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<UserPlus className="mr-2 h-4 w-4" />
						)}
						Create Staff Member
					</Button>
				</div>
			</form>
		</div>
	);
}
