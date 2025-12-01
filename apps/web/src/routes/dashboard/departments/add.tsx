import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
	type DepartmentType,
	useCreateDepartment,
	useDepartments,
} from "@/hooks/use-departments";
import { useUsers } from "@/hooks/use-users";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/departments-client";

export const Route = createFileRoute("/dashboard/departments/add")({
	component: AddDepartmentPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

const createDepartmentSchema = z.object({
	name: z.string().min(1, "Name is required").max(100),
	code: z
		.string()
		.min(2, "Code must be at least 2 characters")
		.max(20)
		.regex(/^[A-Z0-9]+$/, "Code must be uppercase alphanumeric"),
	type: z.string().min(1, "Type is required"),
	description: z.string().max(500),
	parentId: z.string(),
	headId: z.string(),
	location: z.string().max(200),
	contactPhone: z.string().max(20),
	contactEmail: z.string().email().or(z.literal("")),
});

function AddDepartmentPage() {
	const navigate = useNavigate();
	const createDepartmentMutation = useCreateDepartment();

	// Fetch existing departments for parent selection
	const { data: departmentsData } = useDepartments({
		status: "ACTIVE",
		limit: 100,
	});

	// Fetch staff for head selection
	const { data: staffData } = useUsers({
		status: "ACTIVE",
		limit: 100,
	});

	const form = useForm({
		defaultValues: {
			name: "",
			code: "",
			type: "",
			description: "",
			parentId: "",
			headId: "",
			location: "",
			contactPhone: "",
			contactEmail: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await createDepartmentMutation.mutateAsync({
					name: value.name,
					code: value.code,
					type: value.type as DepartmentType,
					description: value.description || undefined,
					parentId: value.parentId || undefined,
					headId: value.headId || undefined,
					location: value.location || undefined,
					contactPhone: value.contactPhone || undefined,
					contactEmail: value.contactEmail || undefined,
				});
				toast.success("Department created successfully");
				navigate({ to: "/dashboard/departments" });
			} catch (error) {
				const apiError = error as ApiError;
				// Handle specific error codes
				if (apiError.code === "CODE_EXISTS") {
					toast.error("Department code already exists");
				} else if (apiError.code === "NAME_EXISTS") {
					toast.error("Department name already exists");
				} else if (apiError.code === "INVALID_HEAD") {
					toast.error("Invalid department head selected");
				} else if (apiError.code === "INVALID_PARENT") {
					toast.error("Invalid parent department selected");
				} else {
					toast.error(apiError.message || "Failed to create department");
				}
			}
		},
		validators: {
			onSubmit: createDepartmentSchema,
		},
	});

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => navigate({ to: "/dashboard/departments" })}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div>
					<h1 className="font-bold text-2xl">Add Department</h1>
					<p className="text-muted-foreground">
						Create a new department in your hospital
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
					{/* Basic Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Building2 className="h-5 w-5" />
								Basic Information
							</CardTitle>
							<CardDescription>
								Enter the department's basic details
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Name */}
							<form.Field name="name">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Name *</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="e.g., Cardiology"
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>

							{/* Code */}
							<form.Field name="code">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Code *</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) =>
												field.handleChange(e.target.value.toUpperCase())
											}
											placeholder="e.g., CARD"
											className="uppercase"
										/>
										<p className="text-muted-foreground text-xs">
											Uppercase alphanumeric code (e.g., CARD, NEURO, ADMIN)
										</p>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>

							{/* Type */}
							<form.Field name="type">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Type *</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
										>
											<SelectTrigger id={field.name}>
												<SelectValue placeholder="Select department type" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="CLINICAL">Clinical</SelectItem>
												<SelectItem value="DIAGNOSTIC">Diagnostic</SelectItem>
												<SelectItem value="SUPPORT">Support</SelectItem>
												<SelectItem value="ADMINISTRATIVE">
													Administrative
												</SelectItem>
												<SelectItem value="EMERGENCY">Emergency</SelectItem>
												<SelectItem value="PHARMACY">Pharmacy</SelectItem>
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

							{/* Description */}
							<form.Field name="description">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Description</Label>
										<Textarea
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Brief description of the department"
											rows={3}
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

					{/* Organization */}
					<Card>
						<CardHeader>
							<CardTitle>Organization</CardTitle>
							<CardDescription>
								Set the department's hierarchy and leadership
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Parent Department */}
							<form.Field name="parentId">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Parent Department</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
										>
											<SelectTrigger id={field.name}>
												<SelectValue placeholder="None (top-level)" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="">None (top-level)</SelectItem>
												{departmentsData?.data.map((dept) => (
													<SelectItem key={dept.id} value={dept.id}>
														{dept.name} ({dept.code})
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<p className="text-muted-foreground text-xs">
											Optional: Select a parent for hierarchical organization
										</p>
									</div>
								)}
							</form.Field>

							{/* Department Head */}
							<form.Field name="headId">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Department Head</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
										>
											<SelectTrigger id={field.name}>
												<SelectValue placeholder="Select department head" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="">No head assigned</SelectItem>
												{staffData?.data.map((staff) => (
													<SelectItem key={staff.id} value={staff.id}>
														{staff.firstName} {staff.lastName}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}
							</form.Field>
						</CardContent>
					</Card>

					{/* Contact Information */}
					<Card className="lg:col-span-2">
						<CardHeader>
							<CardTitle>Contact Information</CardTitle>
							<CardDescription>
								Department location and contact details
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4 sm:grid-cols-3">
							{/* Location */}
							<form.Field name="location">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Location</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="e.g., Building A, Floor 2"
										/>
									</div>
								)}
							</form.Field>

							{/* Phone */}
							<form.Field name="contactPhone">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Contact Phone</Label>
										<Input
											id={field.name}
											name={field.name}
											type="tel"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="e.g., +1 234 567 8900"
										/>
									</div>
								)}
							</form.Field>

							{/* Email */}
							<form.Field name="contactEmail">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Contact Email</Label>
										<Input
											id={field.name}
											name={field.name}
											type="email"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="e.g., cardiology@hospital.com"
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
				</div>

				{/* Actions */}
				<div className="mt-6 flex justify-end gap-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate({ to: "/dashboard/departments" })}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={createDepartmentMutation.isPending}>
						{createDepartmentMutation.isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Building2 className="mr-2 h-4 w-4" />
						)}
						Create Department
					</Button>
				</div>
			</form>
		</div>
	);
}
