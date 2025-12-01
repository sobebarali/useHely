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
// Audit Export
export {
	AuditExport,
	AuditExportFormat,
	type AuditExportFormatValue,
	AuditExportStatus,
	type AuditExportStatusValue,
} from "./audit-export.model";
// Audit Log
export {
	AuditAction,
	type AuditActionValue,
	AuditEventCategory,
	type AuditEventCategoryValue,
	AuditEventType,
	type AuditEventTypeValue,
	AuditLog,
} from "./audit-log.model";
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
// Key Rotation
export { KeyRotation } from "./key-rotation.model";
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
// Report
export {
	Report,
	ReportCategory,
	ReportFormat,
	ReportStatus,
	ReportType,
} from "./report.model";
// Role & Permissions
export { Role } from "./role.model";
// Security Event
export {
	SecurityEvent,
	SecurityEventSeverity,
	type SecurityEventSeverityValue,
	SecurityEventType,
	type SecurityEventTypeValue,
} from "./security-event.model";
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
