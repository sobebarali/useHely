import { Link } from "@tanstack/react-router";
import {
	Activity,
	ArrowRight,
	BarChart3,
	Building2,
	Calendar,
	FileText,
	Pill,
	Shield,
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

const features = [
	{
		icon: Building2,
		title: "Self-Service Registration",
		description:
			"Register your hospital, clinic, or practice instantly with automatic tenant provisioning and pre-configured admin accounts.",
	},
	{
		icon: Users,
		title: "Patient Lifecycle Management",
		description:
			"Complete OPD & IPD workflows with patient tracking, admission management, and discharge summaries.",
	},
	{
		icon: Calendar,
		title: "Appointment Scheduling",
		description:
			"Doctor queues, appointment scheduling, priority management, and automated reminders.",
	},
	{
		icon: FileText,
		title: "E-Prescriptions",
		description:
			"Digital prescriptions with templates, pharmacy integration, and complete medication tracking.",
	},
	{
		icon: Activity,
		title: "Vital Signs Monitoring",
		description:
			"Record and track patient vitals with configurable thresholds and automated alerts.",
	},
	{
		icon: Pill,
		title: "Pharmacy & Inventory",
		description:
			"Medicine dispensing, stock management, expiry tracking, and reorder alerts.",
	},
	{
		icon: Shield,
		title: "Role-Based Access Control",
		description:
			"6 built-in roles (Admin, Doctor, Nurse, Pharmacist, Receptionist) with granular permissions for complete security.",
	},
	{
		icon: BarChart3,
		title: "Reports & Analytics",
		description:
			"Real-time dashboards, customizable reports, and exportable data in CSV/PDF formats.",
	},
];

export function Features() {
	return (
		<section id="features" className="bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl">
				{/* Header with image */}
				<div className="grid items-center gap-12 lg:grid-cols-2">
					<div>
						<Badge variant="outline" className="mb-4">
							Features
						</Badge>
						<h2 className="font-bold text-3xl tracking-tight sm:text-4xl">
							Everything You Need to Manage Your Practice
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							A comprehensive suite of tools designed for modern healthcare
							operations, from patient registration to pharmacy dispensing.
						</p>
						<div className="mt-6">
							<Button variant="outline" asChild>
								<Link to="/register-hospital">
									Try Free for 3 Months
									<ArrowRight className="ml-2 h-4 w-4" />
								</Link>
							</Button>
						</div>
					</div>
					<div className="relative hidden lg:block">
						<div className="overflow-hidden rounded-2xl shadow-xl">
							<img
								src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop&q=80"
								alt="Doctor using digital tablet for patient management"
								className="h-auto w-full object-cover"
								loading="lazy"
							/>
						</div>
						{/* Floating badge */}
						<div className="-bottom-4 -left-4 absolute rounded-lg border bg-card p-4 shadow-lg">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
									<Shield className="h-5 w-5 text-green-500" />
								</div>
								<div>
									<div className="font-semibold text-sm">HIPAA Ready</div>
									<div className="text-muted-foreground text-xs">
										Enterprise security
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Features Grid */}
				<div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{features.map((feature, index) => (
						<Card
							key={feature.title}
							className="group hover:-translate-y-1 relative border-0 bg-card shadow-sm transition-all hover:shadow-md"
						>
							{/* Feature number */}
							<div className="absolute top-4 right-4 font-bold text-4xl text-muted/20">
								{String(index + 1).padStart(2, "0")}
							</div>
							<CardHeader>
								<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
									<feature.icon className="h-6 w-6 text-primary" />
								</div>
								<CardTitle className="text-lg">{feature.title}</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-sm">
									{feature.description}
								</CardDescription>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Bottom CTA with image */}
				<div className="mt-20 overflow-hidden rounded-2xl bg-card">
					<div className="grid lg:grid-cols-2">
						<div className="p-8 lg:p-12">
							<h3 className="font-bold text-2xl">
								Ready to modernize your practice?
							</h3>
							<p className="mt-4 text-muted-foreground">
								Join healthcare providers who have streamlined their operations
								with our comprehensive management system. Get started in minutes
								with our self-service registration.
							</p>
							<ul className="mt-6 space-y-3">
								{[
									"No credit card required",
									"14-day free trial",
									"Full feature access",
									"Dedicated support",
								].map((item) => (
									<li
										key={item}
										className="flex items-center gap-2 text-muted-foreground text-sm"
									>
										<div className="h-1.5 w-1.5 rounded-full bg-primary" />
										{item}
									</li>
								))}
							</ul>
							<div className="mt-8">
								<Button size="lg" asChild>
									<Link to="/register-hospital">
										Try Free for 3 Months
										<ArrowRight className="ml-2 h-4 w-4" />
									</Link>
								</Button>
							</div>
						</div>
						<div className="relative hidden lg:block">
							<img
								src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=500&fit=crop&q=80"
								alt="Modern hospital reception and waiting area"
								className="h-full w-full object-cover"
								loading="lazy"
							/>
							<div className="absolute inset-0 bg-gradient-to-r from-card via-transparent to-transparent" />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
