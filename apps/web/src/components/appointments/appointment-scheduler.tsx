"use client";

import { format, startOfDay } from "date-fns";
import { Clock, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface TimeSlot {
	start: string;
	end: string;
	available: boolean;
}

export interface AppointmentSchedulerProps {
	/** Currently selected date */
	selectedDate?: Date;
	/** Currently selected time slot */
	selectedTimeSlot?: { start: string; end: string };
	/** Callback when date changes */
	onDateChange?: (date: Date | undefined) => void;
	/** Callback when time slot is selected */
	onTimeSlotChange?: (slot: { start: string; end: string } | undefined) => void;
	/** Available time slots for the selected date */
	timeSlots?: TimeSlot[];
	/** Loading state for time slots */
	isLoadingSlots?: boolean;
	/** Dates that are fully booked (shown with strikethrough) */
	bookedDates?: Date[];
	/** Dates that are disabled (not selectable) */
	disabledDates?: Date[];
	/** Minimum selectable date (defaults to today) */
	minDate?: Date;
	/** Maximum selectable date */
	maxDate?: Date;
	/** Whether the scheduler is disabled */
	disabled?: boolean;
	/** Additional class names */
	className?: string;
}

function formatTime(time: string) {
	const [hours, minutes] = time.split(":");
	const hour = Number.parseInt(hours, 10);
	const ampm = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 || 12;
	return `${hour12}:${minutes} ${ampm}`;
}

export function AppointmentScheduler({
	selectedDate,
	selectedTimeSlot,
	onDateChange,
	onTimeSlotChange,
	timeSlots = [],
	isLoadingSlots = false,
	bookedDates = [],
	disabledDates = [],
	minDate = startOfDay(new Date()),
	maxDate,
	disabled = false,
	className,
}: AppointmentSchedulerProps) {
	const [month, setMonth] = useState<Date>(selectedDate || new Date());

	// Filter to only available slots
	const availableSlots = useMemo(
		() => timeSlots.filter((slot) => slot.available),
		[timeSlots],
	);

	// Build modifiers for booked dates
	const bookedDatesNormalized = useMemo(
		() => bookedDates.map((d) => startOfDay(d)),
		[bookedDates],
	);

	// Check if a slot is selected
	const isSlotSelected = (slot: TimeSlot) => {
		return (
			selectedTimeSlot?.start === slot.start &&
			selectedTimeSlot?.end === slot.end
		);
	};

	const handleDateSelect = (date: Date | undefined) => {
		onDateChange?.(date);
		// Reset time slot when date changes
		onTimeSlotChange?.(undefined);
	};

	const handleTimeSlotSelect = (slot: TimeSlot) => {
		onTimeSlotChange?.({ start: slot.start, end: slot.end });
	};

	// Build disabled matcher
	const disabledMatcher = useMemo((): Matcher[] => {
		const matchers: Matcher[] = [...disabledDates];

		if (minDate) {
			matchers.push({ before: minDate });
		}

		if (maxDate) {
			matchers.push({ after: maxDate });
		}

		return matchers;
	}, [disabledDates, minDate, maxDate]);

	return (
		<Card className={cn("gap-0 p-0", className)}>
			<CardContent className="relative p-0 md:pr-52">
				<div className="p-4 md:p-6">
					<Calendar
						mode="single"
						selected={selectedDate}
						onSelect={handleDateSelect}
						month={month}
						onMonthChange={setMonth}
						disabled={
							disabled
								? true
								: disabledMatcher.length > 0
									? disabledMatcher
									: undefined
						}
						showOutsideDays={false}
						modifiers={{
							booked: bookedDatesNormalized,
						}}
						modifiersClassNames={{
							booked: "[&>button]:line-through opacity-70",
						}}
						className="bg-transparent p-0 [--cell-size:--spacing(10)] md:[--cell-size:--spacing(11)]"
						formatters={{
							formatWeekdayName: (date) => {
								return date.toLocaleString("en-US", { weekday: "short" });
							},
						}}
					/>
				</div>

				{/* Time Slots Panel */}
				<div className="no-scrollbar inset-y-0 right-0 flex max-h-72 w-full scroll-pb-6 flex-col gap-4 overflow-y-auto border-t p-4 md:absolute md:max-h-none md:w-52 md:border-t-0 md:border-l md:p-6">
					{!selectedDate ? (
						<div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
							<Clock className="size-8 opacity-50" />
							<p className="text-sm">Select a date to view available slots</p>
						</div>
					) : isLoadingSlots ? (
						<div className="flex h-full items-center justify-center">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					) : availableSlots.length > 0 ? (
						<div className="grid gap-2">
							{availableSlots.map((slot) => (
								<Button
									key={slot.start}
									variant={isSlotSelected(slot) ? "default" : "outline"}
									onClick={() => handleTimeSlotSelect(slot)}
									className="w-full shadow-none"
									disabled={disabled}
								>
									{formatTime(slot.start)}
								</Button>
							))}
						</div>
					) : (
						<div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
							<Clock className="size-8 opacity-50" />
							<p className="text-sm">No available slots for this date</p>
						</div>
					)}
				</div>
			</CardContent>

			{/* Footer with selection summary */}
			<CardFooter className="!py-4 flex flex-col gap-4 border-t px-4 md:flex-row md:px-6">
				<div className="text-sm">
					{selectedDate && selectedTimeSlot ? (
						<>
							Your appointment is scheduled for{" "}
							<span className="font-medium">
								{format(selectedDate, "EEEE, MMMM d, yyyy")}
							</span>{" "}
							at{" "}
							<span className="font-medium">
								{formatTime(selectedTimeSlot.start)}
							</span>
							.
						</>
					) : selectedDate ? (
						<>
							Selected date:{" "}
							<span className="font-medium">
								{format(selectedDate, "EEEE, MMMM d, yyyy")}
							</span>
							. Please select a time slot.
						</>
					) : (
						<>Select a date and time for your appointment.</>
					)}
				</div>
			</CardFooter>
		</Card>
	);
}

/**
 * Compact version of the scheduler for use in forms
 * Shows calendar inline without the time slots panel
 */
export interface CompactDatePickerProps {
	/** Currently selected date */
	value?: Date;
	/** Callback when date changes */
	onChange?: (date: Date | undefined) => void;
	/** Dates that are fully booked (shown with strikethrough) */
	bookedDates?: Date[];
	/** Minimum selectable date (defaults to today) */
	minDate?: Date;
	/** Maximum selectable date */
	maxDate?: Date;
	/** Whether the picker is disabled */
	disabled?: boolean;
	/** Additional class names */
	className?: string;
	/** Show "Today" button */
	showTodayButton?: boolean;
}

export function CompactDatePicker({
	value,
	onChange,
	bookedDates = [],
	minDate = startOfDay(new Date()),
	maxDate,
	disabled = false,
	className,
	showTodayButton = true,
}: CompactDatePickerProps) {
	const [month, setMonth] = useState<Date>(value || new Date());

	const bookedDatesNormalized = useMemo(
		() => bookedDates.map((d) => startOfDay(d)),
		[bookedDates],
	);

	const handleTodayClick = () => {
		const today = new Date();
		setMonth(today);
		onChange?.(today);
	};

	// Build disabled matcher
	const disabledMatcher = useMemo((): Matcher[] => {
		const matchers: Matcher[] = [];

		if (minDate) {
			matchers.push({ before: minDate });
		}

		if (maxDate) {
			matchers.push({ after: maxDate });
		}

		return matchers;
	}, [minDate, maxDate]);

	return (
		<Card className={cn("w-fit py-4", className)}>
			{showTodayButton && (
				<div className="flex justify-end px-4 pb-2">
					<Button
						size="sm"
						variant="outline"
						onClick={handleTodayClick}
						disabled={disabled}
					>
						Today
					</Button>
				</div>
			)}
			<CardContent className="px-4">
				<Calendar
					mode="single"
					selected={value}
					onSelect={onChange}
					month={month}
					onMonthChange={setMonth}
					disabled={
						disabled
							? true
							: disabledMatcher.length > 0
								? disabledMatcher
								: undefined
					}
					modifiers={{
						booked: bookedDatesNormalized,
					}}
					modifiersClassNames={{
						booked: "[&>button]:line-through opacity-70",
					}}
					className="bg-transparent p-0"
				/>
			</CardContent>
		</Card>
	);
}
