import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	CheckCircle2,
	Lock,
	ShieldCheck,
	Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { UseHelyLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterHospital } from "@/hooks/use-hospital";
import type { AuthError } from "@/lib/auth-client";

export const Route = createFileRoute("/register-hospital")({
	component: RegisterHospitalPage,
});

const registrationSchema = z.object({
	name: z.string().min(1, "Hospital name is required"),
	address: z.object({
		street: z.string().min(1, "Street address is required"),
		city: z.string().min(1, "City is required"),
		state: z.string().min(1, "State is required"),
		postalCode: z.string().min(1, "Postal code is required"),
		country: z.string().min(1, "Country is required"),
	}),
	contactEmail: z.string().email("Invalid contact email"),
	contactPhone: z.string().min(1, "Contact phone is required"),
	licenseNumber: z.string().min(1, "License number is required"),
	adminEmail: z.string().email("Invalid admin email"),
	adminPhone: z.string().min(1, "Admin phone is required"),
});

function RegisterHospitalPage() {
	const registerMutation = useRegisterHospital();
	const [registrationSuccess, setRegistrationSuccess] = useState(false);
	const [registeredEmail, setRegisteredEmail] = useState("");

	const form = useForm({
		defaultValues: {
			name: "",
			address: {
				street: "",
				city: "",
				state: "",
				postalCode: "",
				country: "",
			},
			contactEmail: "",
			contactPhone: "",
			licenseNumber: "",
			adminEmail: "",
			adminPhone: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await registerMutation.mutateAsync(value);
				setRegisteredEmail(value.adminEmail);
				setRegistrationSuccess(true);
				toast.success("Hospital registered successfully!");
			} catch (error) {
				const authError = error as AuthError;
				toast.error(authError.message || "Registration failed");
			}
		},
		validators: {
			onSubmit: registrationSchema,
		},
	});

	if (registrationSuccess) {
		return (
			<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/50 p-4">
				{/* Background decorations */}
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute top-1/4 right-0 h-96 w-96 translate-x-1/2 rounded-full bg-green-500/10 blur-3xl" />
					<div className="-translate-x-1/2 absolute bottom-0 left-0 h-96 w-96 translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
				</div>

				<Card className="relative w-full max-w-md border-green-500/20 bg-card/80 backdrop-blur-sm">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
							<CheckCircle2 className="h-10 w-10 text-green-500" />
						</div>
						<h1 className="font-bold text-2xl">Registration Successful!</h1>
					</CardHeader>
					<CardContent className="space-y-4 text-center">
						<p className="text-muted-foreground">
							We've sent a verification email to{" "}
							<span className="font-medium text-foreground">
								{registeredEmail}
							</span>
						</p>
						<p className="text-muted-foreground text-sm">
							Please check your inbox and click the verification link to
							activate your hospital account. The link will expire in 24 hours.
						</p>
						<div className="rounded-lg border bg-muted/50 p-4">
							<p className="font-medium text-sm">What happens next?</p>
							<ul className="mt-2 space-y-1 text-left text-muted-foreground text-sm">
								<li className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-green-500" />
									Verify your email address
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-green-500" />
									Receive your admin login credentials
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-green-500" />
									Sign in to set up your hospital
								</li>
							</ul>
						</div>
						<Button asChild className="w-full">
							<Link to="/login">Go to Login</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/50">
			{/* Background decorations */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute top-1/4 right-0 h-96 w-96 translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
				<div className="-translate-x-1/2 absolute bottom-0 left-0 h-96 w-96 translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
			</div>

			<div className="relative grid min-h-screen lg:grid-cols-2">
				{/* Left Column - Image & Features (Hidden on mobile) */}
				<div className="relative hidden lg:block">
					{/* Full height image */}
					<div className="absolute inset-0">
						<img
							src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=1600&fit=crop&q=80"
							alt="Modern hospital building exterior"
							className="h-full w-full object-cover"
						/>
						{/* Dark overlay */}
						<div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
						<div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
					</div>

					{/* Content overlay */}
					<div className="relative flex h-full flex-col justify-center p-12">
						<Link
							to="/"
							className="mb-8 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to Home
						</Link>

						<div className="mb-8 flex items-center gap-3">
							<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 backdrop-blur-sm">
								<UseHelyLogo className="h-6 w-6 text-primary" />
							</div>
							<span className="font-bold text-xl">useHely</span>
						</div>

						<h1 className="mb-4 font-bold text-4xl leading-tight">
							Join thousands of hospitals on our platform
						</h1>
						<p className="mb-8 max-w-md text-lg text-muted-foreground">
							Register your hospital today and get access to a complete
							management system with enterprise-grade security.
						</p>

						{/* Feature cards */}
						<div className="space-y-4">
							{[
								{
									icon: ShieldCheck,
									title: "Enterprise Security",
									desc: "HIPAA-ready with end-to-end encryption",
								},
								{
									icon: Users,
									title: "Role-Based Access",
									desc: "6 pre-defined roles with customizable permissions",
								},
								{
									icon: Lock,
									title: "Data Isolation",
									desc: "Complete tenant isolation for your data",
								},
							].map((feature) => (
								<div
									key={feature.title}
									className="flex items-start gap-4 rounded-xl border border-border/50 bg-card/30 p-4 backdrop-blur-sm"
								>
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
										<feature.icon className="h-5 w-5 text-primary" />
									</div>
									<div>
										<h3 className="font-semibold">{feature.title}</h3>
										<p className="text-muted-foreground text-sm">
											{feature.desc}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Right Column - Registration Form */}
				<div className="flex flex-col overflow-y-auto px-4 py-8 lg:px-12">
					{/* Mobile header */}
					<div className="mb-6 lg:hidden">
						<Button variant="ghost" size="sm" asChild className="mb-4">
							<Link to="/">
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to Home
							</Link>
						</Button>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
								<UseHelyLogo className="h-5 w-5 text-primary" />
							</div>
							<div>
								<h1 className="font-bold text-xl">Register Your Hospital</h1>
								<p className="text-muted-foreground text-sm">
									Join the useHely platform
								</p>
							</div>
						</div>
					</div>

					{/* Desktop header */}
					<div className="mb-8 hidden lg:block">
						<h2 className="font-bold text-2xl">Create your account</h2>
						<p className="text-muted-foreground">
							Fill in your hospital details to get started
						</p>
					</div>

					{/* Registration Form */}
					<Card className="border-border/50 bg-card/50 backdrop-blur-sm">
						<CardContent className="pt-6">
							<form
								onSubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									form.handleSubmit();
								}}
								className="space-y-6"
							>
								{/* Hospital Information */}
								<div className="space-y-4">
									<h3 className="font-semibold">Hospital Information</h3>

									<form.Field name="name">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Hospital Name *</Label>
												<Input
													id={field.name}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													placeholder="City General Hospital"
													className="bg-background/50"
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

									<form.Field name="licenseNumber">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>License Number *</Label>
												<Input
													id={field.name}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													placeholder="MED-2024-001234"
													className="bg-background/50"
												/>
												<p className="text-muted-foreground text-xs">
													Your official hospital license number
												</p>
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

									<div className="grid gap-4 sm:grid-cols-2">
										<form.Field name="contactEmail">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Contact Email *</Label>
													<Input
														id={field.name}
														type="email"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="info@hospital.com"
														className="bg-background/50"
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

										<form.Field name="contactPhone">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Contact Phone *</Label>
													<Input
														id={field.name}
														type="tel"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="+1-555-0100"
														className="bg-background/50"
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
								</div>

								{/* Address */}
								<div className="space-y-4">
									<h3 className="font-semibold">Address</h3>

									<form.Field name="address.street">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Street Address *</Label>
												<Input
													id={field.name}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													placeholder="123 Main Street"
													className="bg-background/50"
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

									<div className="grid gap-4 sm:grid-cols-2">
										<form.Field name="address.city">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>City *</Label>
													<Input
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="New York"
														className="bg-background/50"
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

										<form.Field name="address.state">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>State/Province *</Label>
													<Input
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="NY"
														className="bg-background/50"
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

									<div className="grid gap-4 sm:grid-cols-2">
										<form.Field name="address.postalCode">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Postal Code *</Label>
													<Input
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="10001"
														className="bg-background/50"
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

										<form.Field name="address.country">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Country *</Label>
													<Input
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="USA"
														className="bg-background/50"
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
								</div>

								{/* Admin Account */}
								<div className="space-y-4">
									<h3 className="font-semibold">Administrator Account</h3>
									<p className="text-muted-foreground text-sm">
										This will be the primary administrator for your hospital
									</p>

									<div className="grid gap-4 sm:grid-cols-2">
										<form.Field name="adminEmail">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Admin Email *</Label>
													<Input
														id={field.name}
														type="email"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="admin@hospital.com"
														className="bg-background/50"
													/>
													<p className="text-muted-foreground text-xs">
														Verification link will be sent here
													</p>
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

										<form.Field name="adminPhone">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Admin Phone *</Label>
													<Input
														id={field.name}
														type="tel"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="+1-555-0101"
														className="bg-background/50"
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
								</div>

								{/* Submit */}
								<div className="border-t pt-6">
									<form.Subscribe>
										{(state) => (
											<Button
												type="submit"
												className="w-full"
												size="lg"
												disabled={
													!state.canSubmit ||
													state.isSubmitting ||
													registerMutation.isPending
												}
											>
												{state.isSubmitting || registerMutation.isPending
													? "Registering..."
													: "Register Hospital"}
											</Button>
										)}
									</form.Subscribe>

									<p className="mt-4 text-center text-muted-foreground text-sm">
										Already have an account?{" "}
										<Link
											to="/login"
											className="text-primary underline-offset-4 hover:underline"
										>
											Sign in
										</Link>
									</p>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
