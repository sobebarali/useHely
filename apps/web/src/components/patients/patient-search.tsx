import { Loader2, Search, User, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	type SearchPatientResult,
	useSearchPatients,
} from "@/hooks/use-patients";

export interface PatientSearchProps {
	onSelect: (patient: SearchPatientResult) => void;
	placeholder?: string;
	searchType?: "id" | "name" | "phone" | "email";
	disabled?: boolean;
	className?: string;
}

export function PatientSearch({
	onSelect,
	placeholder = "Search patients by name, phone, or ID...",
	searchType,
	disabled = false,
	className = "",
}: PatientSearchProps) {
	const [query, setQuery] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);

	// Debounce the search query
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(query);
		}, 300);
		return () => clearTimeout(timer);
	}, [query]);

	// Handle click outside to close dropdown
	const handleClickOutside = useCallback((event: MouseEvent) => {
		if (
			containerRef.current &&
			!containerRef.current.contains(event.target as Node)
		) {
			setIsOpen(false);
		}
	}, []);

	// Handle escape key to close dropdown
	const handleKeyDown = useCallback((event: KeyboardEvent) => {
		if (event.key === "Escape") {
			setIsOpen(false);
		}
	}, []);

	useEffect(() => {
		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleKeyDown);
			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
				document.removeEventListener("keydown", handleKeyDown);
			};
		}
	}, [isOpen, handleClickOutside, handleKeyDown]);

	const { data: results, isLoading } = useSearchPatients({
		q: debouncedQuery,
		type: searchType,
		limit: 10,
	});

	const handleSelect = (patient: SearchPatientResult) => {
		onSelect(patient);
		setQuery("");
		setIsOpen(false);
	};

	const handleClear = () => {
		setQuery("");
		setDebouncedQuery("");
		setIsOpen(false);
	};

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			<div className="relative">
				<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder={placeholder}
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setIsOpen(true);
					}}
					onFocus={() => query.length >= 2 && setIsOpen(true)}
					disabled={disabled}
					className="pr-9 pl-9"
				/>
				{query && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="-translate-y-1/2 absolute top-1/2 right-1 h-6 w-6"
						onClick={handleClear}
					>
						<X className="h-3 w-3" />
					</Button>
				)}
			</div>

			{/* Dropdown results */}
			{isOpen && query.length >= 2 && (
				<div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-80 overflow-auto rounded-md border bg-popover p-1 shadow-md">
					{isLoading ? (
						<div className="flex items-center justify-center py-6">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					) : results && results.length > 0 ? (
						<div className="space-y-1">
							{results.map((patient) => (
								<button
									key={patient.id}
									type="button"
									className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
									onClick={() => handleSelect(patient)}
								>
									<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
										<User className="h-4 w-4 text-primary" />
									</div>
									<div className="flex-1 overflow-hidden">
										<div className="flex items-center gap-2">
											<span className="font-medium">
												{patient.firstName} {patient.lastName}
											</span>
											<Badge variant="outline" className="text-xs">
												{patient.patientType}
											</Badge>
										</div>
										<div className="flex items-center gap-2 text-muted-foreground text-xs">
											<span>{patient.patientId}</span>
											<span>|</span>
											<span>{patient.phone}</span>
										</div>
									</div>
									<Badge
										variant={
											patient.status === "ACTIVE" ? "default" : "secondary"
										}
										className="text-xs"
									>
										{patient.status}
									</Badge>
								</button>
							))}
						</div>
					) : (
						<div className="py-6 text-center text-muted-foreground text-sm">
							No patients found
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default PatientSearch;
