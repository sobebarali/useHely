import { Dispensing, DispensingStatus } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { DispensingLean } from "./shared.dispensing.repository";

const logger = createRepositoryLogger("completeDispensing");

/**
 * Complete dispensing and mark as DISPENSED
 */
export async function completeDispensing({
	tenantId,
	prescriptionId,
	notes,
	patientCounseled,
}: {
	tenantId: string;
	prescriptionId: string;
	notes?: string;
	patientCounseled?: boolean;
}): Promise<DispensingLean | null> {
	try {
		logger.debug({ tenantId, prescriptionId }, "Completing dispensing");

		const updateData: Record<string, unknown> = {
			status: DispensingStatus.DISPENSED,
			completedAt: new Date(),
		};

		if (notes !== undefined) {
			updateData.notes = notes;
		}

		if (patientCounseled !== undefined) {
			updateData.patientCounseled = patientCounseled;
		}

		const dispensing = await Dispensing.findOneAndUpdate(
			{ tenantId, prescriptionId },
			updateData,
			{ new: true },
		).lean();

		logDatabaseOperation(
			logger,
			"findOneAndUpdate",
			"dispensing",
			{ tenantId, prescriptionId },
			dispensing ? { updated: true } : { updated: false },
		);

		return dispensing as DispensingLean | null;
	} catch (error) {
		logError(logger, error, "Failed to complete dispensing");
		throw error;
	}
}
