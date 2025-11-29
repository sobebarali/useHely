import { Hospital, Staff, User } from "@hms/db";
import type { HospitalInfo } from "../validations/hospitals.auth.validation";

/**
 * Find all hospitals where a user is a staff member
 */
export async function findHospitalsForEmail({
	email,
}: {
	email: string;
}): Promise<HospitalInfo[]> {
	// Find user by email
	const user = await User.findOne({ email }).lean();
	if (!user) {
		return [];
	}

	// Find all staff records for this user
	const staffRecords = await Staff.find({
		userId: user._id,
		status: "ACTIVE",
	}).lean();

	if (staffRecords.length === 0) {
		return [];
	}

	// Get unique tenant IDs
	const tenantIds = [...new Set(staffRecords.map((s) => s.tenantId))];

	// Find hospitals
	const hospitals = await Hospital.find({
		_id: { $in: tenantIds },
		status: { $in: ["ACTIVE", "VERIFIED"] },
	})
		.select("_id name status")
		.lean();

	return hospitals.map((h) => ({
		id: String(h._id),
		name: h.name,
		status: h.status,
	}));
}
