import { createFileRoute } from "@tanstack/react-router";
import {
	FAQ,
	Features,
	Footer,
	Header,
	Hero,
	HowItWorks,
	Modules,
	Pricing,
	Security,
} from "@/components/landing";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

function LandingPage() {
	return (
		<div className="min-h-screen bg-background">
			<Header />
			<main>
				<Hero />
				<Features />
				<HowItWorks />
				<Modules />
				<Security />
				<Pricing />
				<FAQ />
			</main>
			<Footer />
		</div>
	);
}
