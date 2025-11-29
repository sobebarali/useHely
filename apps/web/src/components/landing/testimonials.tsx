import { Quote, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
	{
		quote:
			"useHely transformed how we manage patient flow. The OPD queue system alone saved us hours every day. Our staff can now focus on patient care instead of paperwork.",
		author: "Dr. Sarah Chen",
		role: "Medical Director",
		hospital: "City General Hospital",
		image:
			"https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&q=80",
		rating: 5,
	},
	{
		quote:
			"The multi-tenant architecture was exactly what we needed for our hospital chain. Each facility operates independently while we maintain centralized oversight.",
		author: "Michael Roberts",
		role: "IT Director",
		hospital: "HealthCare Partners Network",
		image:
			"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&q=80",
		rating: 5,
	},
	{
		quote:
			"From registration to discharge, every workflow is streamlined. The pharmacy integration eliminated prescription errors and improved medication safety.",
		author: "Dr. Emily Watson",
		role: "Chief Pharmacist",
		hospital: "Memorial Medical Center",
		image:
			"https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=100&h=100&fit=crop&q=80",
		rating: 5,
	},
	{
		quote:
			"Setting up was incredibly fast. We were operational within a day, and the role-based access control means everyone sees exactly what they need.",
		author: "James Liu",
		role: "Hospital Administrator",
		hospital: "Sunrise Community Hospital",
		image:
			"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80",
		rating: 5,
	},
];

const stats = [
	{ value: "50+", label: "Hospitals" },
	{ value: "100K+", label: "Patients Managed" },
	{ value: "99.9%", label: "Uptime" },
	{ value: "4.9/5", label: "Satisfaction" },
];

export function Testimonials() {
	return (
		<section className="px-4 py-20 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl">
				<div className="text-center">
					<Badge variant="outline" className="mb-4">
						Testimonials
					</Badge>
					<h2 className="font-bold text-3xl tracking-tight sm:text-4xl">
						Trusted by Healthcare Leaders
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
						See what healthcare professionals are saying about transforming
						their hospital operations with useHely.
					</p>
				</div>

				{/* Stats */}
				<div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
					{stats.map((stat) => (
						<div
							key={stat.label}
							className="rounded-xl border bg-card p-6 text-center shadow-sm"
						>
							<div className="font-bold text-3xl text-primary">
								{stat.value}
							</div>
							<div className="mt-1 text-muted-foreground text-sm">
								{stat.label}
							</div>
						</div>
					))}
				</div>

				{/* Testimonials Grid */}
				<div className="mt-12 grid gap-6 md:grid-cols-2">
					{testimonials.map((testimonial) => (
						<Card
							key={testimonial.author}
							className="group relative overflow-hidden border-0 shadow-sm transition-all hover:shadow-md"
						>
							<CardContent className="p-6">
								{/* Quote icon */}
								<Quote className="absolute top-4 right-4 h-8 w-8 text-muted/20" />

								{/* Rating */}
								<div className="mb-4 flex gap-1">
									{Array.from({ length: testimonial.rating }).map((_, i) => (
										<Star
											key={`star-${testimonial.author}-${i}`}
											className="h-4 w-4 fill-yellow-400 text-yellow-400"
										/>
									))}
								</div>

								{/* Quote */}
								<blockquote className="text-foreground">
									"{testimonial.quote}"
								</blockquote>

								{/* Author */}
								<div className="mt-6 flex items-center gap-4">
									<img
										src={testimonial.image}
										alt={testimonial.author}
										className="h-12 w-12 rounded-full object-cover"
										loading="lazy"
									/>
									<div>
										<div className="font-semibold">{testimonial.author}</div>
										<div className="text-muted-foreground text-sm">
											{testimonial.role}
										</div>
										<div className="text-muted-foreground text-xs">
											{testimonial.hospital}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Logos section */}
				<div className="mt-16 text-center">
					<p className="text-muted-foreground text-sm">
						Trusted by leading healthcare institutions
					</p>
					<div className="mt-8 flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale">
						{[
							"City General",
							"HealthCare Partners",
							"Memorial Medical",
							"Sunrise Community",
							"Metro Health",
						].map((name) => (
							<div
								key={name}
								className="flex h-12 items-center rounded-lg bg-muted px-6 font-semibold text-muted-foreground"
							>
								{name}
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
