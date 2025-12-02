import { Link } from "@tanstack/react-router";
import {
	Activity,
	ArrowRight,
	Building2,
	Calendar,
	CheckCircle2,
	FileText,
	Pill,
	Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Hero() {
	return (
		<section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 px-4 pt-16 pb-20 sm:px-6 lg:px-8">
			{/* Background decoration */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="-translate-y-1/2 absolute top-1/4 right-0 translate-x-1/2 transform">
					<div className="h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
				</div>
				<div className="-translate-x-1/2 absolute bottom-0 left-0 translate-y-1/2 transform">
					<div className="h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
				</div>
			</div>

			<div className="relative mx-auto max-w-7xl">
				{/* Main Hero Content - Two Column Layout */}
				<div className="grid items-center gap-12 lg:grid-cols-2">
					{/* Left Column - Text Content */}
					<div className="text-center lg:text-left">
						<Badge variant="secondary" className="mb-6">
							Try Free for 3 Months
						</Badge>

						<h1 className="font-bold text-4xl tracking-tight sm:text-5xl lg:text-6xl">
							Complete Healthcare Operations.{" "}
							<span className="text-primary">One Platform.</span>
						</h1>

						<p className="mt-6 max-w-xl text-lg text-muted-foreground">
							Everything you need to run your hospital, clinic, or practice.
							Manage patients, appointments, prescriptions, and pharmacy — all
							in one secure place.
						</p>

						{/* Feature highlights */}
						<div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
							{[
								"Self-service registration",
								"OPD & IPD workflows",
								"Staff permission controls",
							].map((feature) => (
								<div
									key={feature}
									className="flex items-center gap-2 text-muted-foreground text-sm"
								>
									<CheckCircle2 className="h-4 w-4 text-green-500" />
									{feature}
								</div>
							))}
						</div>

						<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
							<Button size="lg" asChild>
								<Link to="/register-hospital">
									Try Free for 3 Months
									<ArrowRight className="ml-2 h-4 w-4" />
								</Link>
							</Button>
							<Button variant="outline" size="lg" asChild>
								<a href="#features">View Features</a>
							</Button>
						</div>
					</div>

					{/* Right Column - Hero Image */}
					<div className="relative">
						<div className="relative overflow-hidden rounded-2xl shadow-2xl">
							<img
								src="https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=600&fit=crop&q=80"
								alt="Medical professionals using digital healthcare technology"
								className="h-auto w-full object-cover"
								loading="eager"
							/>
							{/* Overlay gradient */}
							<div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

							{/* Floating stats card */}
							<div className="absolute right-4 bottom-4 left-4 rounded-xl border bg-card/95 p-4 backdrop-blur-sm sm:left-auto sm:w-64">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
										<Activity className="h-5 w-5 text-green-500" />
									</div>
									<div>
										<div className="font-semibold text-sm">Live Dashboard</div>
										<div className="text-muted-foreground text-xs">
											Real-time patient monitoring
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Stats Section */}
				<div className="mt-20 grid grid-cols-2 gap-8 sm:grid-cols-4">
					{[
						{ value: "6+", label: "Built-in Staff Roles" },
						{ value: "100%", label: "Complete Privacy" },
						{
							value: "Outpatient + Inpatient",
							label: "Full Patient Lifecycle",
						},
						{ value: "Healthcare", label: "Security Standards" },
					].map((stat) => (
						<div key={stat.label} className="flex flex-col items-center">
							<div className="font-bold text-3xl text-primary">
								{stat.value}
							</div>
							<div className="text-muted-foreground text-sm">{stat.label}</div>
						</div>
					))}
				</div>

				{/* Floating module icons */}
				<div className="mt-16 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
					{[
						{ icon: Building2, label: "Organizations" },
						{ icon: Users, label: "Patients" },
						{ icon: Calendar, label: "Appointments" },
						{ icon: FileText, label: "Prescriptions" },
						{ icon: Activity, label: "Vitals" },
						{ icon: Pill, label: "Pharmacy" },
					].map((item) => (
						<div
							key={item.label}
							className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 shadow-sm transition-all hover:scale-105 hover:shadow-md"
						>
							<item.icon className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
							<span className="font-medium text-sm">{item.label}</span>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
