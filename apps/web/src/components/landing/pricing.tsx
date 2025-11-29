import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const plans = [
	{
		name: "Starter",
		description: "Perfect for small clinics and practices",
		price: "$99",
		period: "/month",
		popular: false,
		features: [
			"Up to 5 staff users",
			"1,000 patients",
			"OPD management",
			"Basic reporting",
			"Email support",
			"Standard SLA",
		],
	},
	{
		name: "Professional",
		description: "For mid-size hospitals with full operations",
		price: "$299",
		period: "/month",
		popular: true,
		features: [
			"Up to 50 staff users",
			"Unlimited patients",
			"OPD + IPD management",
			"Pharmacy & inventory",
			"Advanced analytics",
			"Priority support",
			"API access",
			"Custom roles",
		],
	},
	{
		name: "Enterprise",
		description: "For hospital chains and large institutions",
		price: "Custom",
		period: "",
		popular: false,
		features: [
			"Unlimited users",
			"Unlimited patients",
			"Multi-location support",
			"Custom integrations",
			"Dedicated account manager",
			"24/7 phone support",
			"SLA guarantee",
			"On-premise option",
			"Training & onboarding",
		],
	},
];

export function Pricing() {
	return (
		<section id="pricing" className="bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl">
				<div className="text-center">
					<Badge variant="outline" className="mb-4">
						Pricing
					</Badge>
					<h2 className="font-bold text-3xl tracking-tight sm:text-4xl">
						Plans That Scale With You
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
						Start small and upgrade as your hospital grows. All plans include
						core HMS features.
					</p>
				</div>

				<div className="mt-12 grid gap-8 lg:grid-cols-3">
					{plans.map((plan) => (
						<Card
							key={plan.name}
							className={`relative flex flex-col ${
								plan.popular
									? "border-primary shadow-lg ring-1 ring-primary"
									: "border-0 shadow-sm"
							}`}
						>
							{plan.popular && (
								<Badge className="-translate-y-1/2 absolute top-0 right-4">
									Most Popular
								</Badge>
							)}

							<CardHeader>
								<CardTitle className="text-xl">{plan.name}</CardTitle>
								<CardDescription>{plan.description}</CardDescription>
							</CardHeader>

							<CardContent className="flex-1">
								<div className="mb-6">
									<span className="font-bold text-4xl">{plan.price}</span>
									<span className="text-muted-foreground">{plan.period}</span>
								</div>

								<ul className="space-y-3">
									{plan.features.map((feature) => (
										<li key={feature} className="flex items-start gap-2">
											<Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
											<span className="text-muted-foreground text-sm">
												{feature}
											</span>
										</li>
									))}
								</ul>
							</CardContent>

							<CardFooter>
								<Button
									className="w-full"
									variant={plan.popular ? "default" : "outline"}
									asChild
								>
									<Link to="/login">
										{plan.name === "Enterprise"
											? "Contact Sales"
											: "Get Started"}
									</Link>
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>

				<p className="mt-8 text-center text-muted-foreground text-sm">
					All plans include a 14-day free trial. No credit card required.
				</p>
			</div>
		</section>
	);
}
