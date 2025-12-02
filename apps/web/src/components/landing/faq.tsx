import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const faqs = [
	{
		question: "How long does it take to set up?",
		answer:
			"Setup takes just minutes. Register your organization, and you're ready to go. Clinics and solo practices are activated instantly, while hospitals verify via email. The system automatically provisions roles, departments, and your admin account.",
	},
	{
		question: "Can I import existing patient data?",
		answer:
			"Yes, we provide data import tools for migrating existing patient records. Our API also allows for custom integrations with your existing systems. Contact us at info@usehely.com for large-scale migrations.",
	},
	{
		question: "What happens to my data if I cancel?",
		answer:
			"Your data remains available for 30 days after cancellation. You can export all data in CSV/PDF formats before that period ends. After 30 days, data is permanently deleted per our retention policy.",
	},
	{
		question: "Is there API access for custom integrations?",
		answer:
			"Yes, Professional and Enterprise plans include full REST API access with comprehensive documentation. You can integrate with lab systems, billing software, and other healthcare tools.",
	},
	{
		question: "How are backups handled?",
		answer:
			"We perform automated daily backups with point-in-time recovery. Data is encrypted at rest and stored across multiple availability zones for redundancy.",
	},
	{
		question: "Can multiple organizations use the same platform?",
		answer:
			"Absolutely. Our multi-tenant architecture allows healthcare networks to manage hospitals, clinics, and practices from a single platform while maintaining complete data isolation between facilities.",
	},
	{
		question: "What compliance standards do you follow?",
		answer:
			"We build with HIPAA considerations in mind and implement industry-standard security practices including encryption, audit logging, and role-based access control. Contact us at info@usehely.com for detailed compliance documentation.",
	},
	{
		question: "Do you offer training and onboarding?",
		answer:
			"Yes, all plans include access to our documentation and video tutorials. Professional plans get priority support, and Enterprise plans include dedicated onboarding sessions and training.",
	},
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="border-b">
			<button
				type="button"
				className="flex w-full items-center justify-between py-4 text-left"
				onClick={() => setIsOpen(!isOpen)}
			>
				<span className="font-medium">{question}</span>
				<ChevronDown
					className={cn(
						"h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
						isOpen && "rotate-180",
					)}
				/>
			</button>
			<div
				className={cn(
					"grid transition-all duration-200",
					isOpen ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr]",
				)}
			>
				<div className="overflow-hidden">
					<p className="text-muted-foreground">{answer}</p>
				</div>
			</div>
		</div>
	);
}

export function FAQ() {
	return (
		<section className="px-4 py-20 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-3xl">
				<div className="text-center">
					<Badge variant="outline" className="mb-4">
						FAQ
					</Badge>
					<h2 className="font-bold text-3xl tracking-tight sm:text-4xl">
						Frequently Asked Questions
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
						Everything you need to know about useHely.
					</p>
				</div>

				<div className="mt-12">
					{faqs.map((faq) => (
						<FAQItem key={faq.question} {...faq} />
					))}
				</div>
			</div>
		</section>
	);
}
