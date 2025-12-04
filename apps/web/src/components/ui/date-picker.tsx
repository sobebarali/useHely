"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
	/** The selected date value */
	value?: Date;
	/** Callback when date changes */
	onChange?: (date: Date | undefined) => void;
	/** Placeholder text when no date is selected */
	placeholder?: string;
	/** Date format string (date-fns format) */
	dateFormat?: string;
	/** Minimum selectable date */
	minDate?: Date;
	/** Maximum selectable date */
	maxDate?: Date;
	/** Specific dates to disable */
	disabledDates?: Date[];
	/** Whether the date picker is disabled */
	disabled?: boolean;
	/** Additional class names for the trigger button */
	className?: string;
	/** Alignment of the popover */
	align?: "start" | "center" | "end";
}

export function DatePicker({
	value,
	onChange,
	placeholder = "Select date",
	dateFormat = "PPP",
	minDate,
	maxDate,
	disabledDates = [],
	disabled = false,
	className,
	align = "start",
}: DatePickerProps) {
	const [open, setOpen] = useState(false);

	const handleSelect = (date: Date | undefined) => {
		onChange?.(date);
		setOpen(false);
	};

	// Build disabled matcher for react-day-picker
	const disabledMatcher: Matcher[] = [...disabledDates];

	if (minDate) {
		disabledMatcher.push({ before: minDate });
	}

	if (maxDate) {
		disabledMatcher.push({ after: maxDate });
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					disabled={disabled}
					className={cn(
						"w-full justify-start text-left font-normal",
						!value && "text-muted-foreground",
						className,
					)}
					onKeyDown={(e) => {
						if (e.key === "ArrowDown") {
							e.preventDefault();
							setOpen(true);
						}
					}}
				>
					<CalendarIcon className="mr-2 size-4" />
					{value ? format(value, dateFormat) : placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align={align}>
				<Calendar
					mode="single"
					selected={value}
					onSelect={handleSelect}
					disabled={disabledMatcher.length > 0 ? disabledMatcher : undefined}
					defaultMonth={value || minDate}
					autoFocus
				/>
			</PopoverContent>
		</Popover>
	);
}

export interface DateRangePickerProps {
	/** The selected date range value */
	value?: { from: Date | undefined; to: Date | undefined };
	/** Callback when date range changes */
	onChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
	/** Placeholder text when no date is selected */
	placeholder?: string;
	/** Date format string (date-fns format) */
	dateFormat?: string;
	/** Minimum selectable date */
	minDate?: Date;
	/** Maximum selectable date */
	maxDate?: Date;
	/** Whether the date picker is disabled */
	disabled?: boolean;
	/** Additional class names for the trigger button */
	className?: string;
	/** Alignment of the popover */
	align?: "start" | "center" | "end";
	/** Number of months to display */
	numberOfMonths?: number;
}

export function DateRangePicker({
	value,
	onChange,
	placeholder = "Select date range",
	dateFormat = "MMM d, yyyy",
	minDate,
	maxDate,
	disabled = false,
	className,
	align = "start",
	numberOfMonths = 2,
}: DateRangePickerProps) {
	const [open, setOpen] = useState(false);

	const handleSelect = (
		range: { from: Date | undefined; to?: Date | undefined } | undefined,
	) => {
		onChange?.({
			from: range?.from,
			to: range?.to,
		});
	};

	// Build disabled matcher for react-day-picker
	const disabledMatcher: Matcher[] = [];

	if (minDate) {
		disabledMatcher.push({ before: minDate });
	}

	if (maxDate) {
		disabledMatcher.push({ after: maxDate });
	}

	const formatRange = () => {
		if (!value?.from) return placeholder;
		if (!value.to) return format(value.from, dateFormat);
		return `${format(value.from, dateFormat)} - ${format(value.to, dateFormat)}`;
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					disabled={disabled}
					className={cn(
						"w-full justify-start text-left font-normal",
						!value?.from && "text-muted-foreground",
						className,
					)}
				>
					<CalendarIcon className="mr-2 size-4" />
					{formatRange()}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align={align}>
				<Calendar
					mode="range"
					selected={value}
					onSelect={handleSelect}
					disabled={disabledMatcher.length > 0 ? disabledMatcher : undefined}
					defaultMonth={value?.from || minDate}
					numberOfMonths={numberOfMonths}
					autoFocus
				/>
			</PopoverContent>
		</Popover>
	);
}
