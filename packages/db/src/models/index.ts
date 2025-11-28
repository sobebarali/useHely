// Auth models (Better-Auth)

// Admission
export {
	Admission,
	AdmissionStatus,
	DischargeType,
} from "./admission.model";
// Appointment
export {
	Appointment,
	AppointmentPriority,
	AppointmentStatus,
	AppointmentType,
} from "./appointment.model";
export { Account, Session, User, Verification } from "./auth.model";
// Counter
export { Counter, CounterType } from "./counter.model";
// Department
export {
	Department,
	DepartmentStatus,
	DepartmentType,
} from "./department.model";
// Dispensing
export {
	Dispensing,
	DispensingStatus,
	MedicineDispensingStatus,
} from "./dispensing.model";
// Hospital/Tenant
export { Hospital, HospitalStatus } from "./hospital.model";
// Inventory
export {
	Inventory,
	InventoryTransaction,
	TransactionType,
} from "./inventory.model";
// Medicine
export { Medicine, MedicineCategory, MedicineType } from "./medicine.model";
// Patient
export { Gender, Patient, PatientStatus, PatientType } from "./patient.model";
// Prescription
export {
	Prescription,
	PrescriptionStatus,
	PrescriptionTemplate,
} from "./prescription.model";
// Role & Permissions
export { Role } from "./role.model";
// Staff
export { Staff, StaffShift, StaffStatus } from "./staff.model";
// Vitals
export {
	AlertSeverity,
	GlucoseTiming,
	GlucoseUnit,
	HeightUnit,
	TemperatureUnit,
	Vitals,
	WeightUnit,
} from "./vitals.model";
