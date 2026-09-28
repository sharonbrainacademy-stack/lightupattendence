export type NetworkType = 'MTN' | 'Glo' | 'Airtel' | '9Mobile' | 'Other';

export type PurposeCategory = 
  | 'Widow Support' 
  | 'Youth Outreach' 
  | 'Elderly Care' 
  | 'Visitor' 
  | 'Special Project' 
  | 'Pastor / Minister Care' 
  | 'Emergency Blessing' 
  | string;

export type UserRole = 'Admin' | 'Minister' | 'Auditor';

export interface AirtimeRecord {
  id: string;
  receiptNo: string; // e.g. LU-20260920-A8F2
  beneficiaryName: string;
  phoneNumber: string;
  network: NetworkType;
  amount: number;
  purpose: PurposeCategory;
  distributionDate: string; // YYYY-MM-DD or ISO string
  distributionTime?: string; // HH:mm
  distributedBy: string; // Name of Minister or Volunteer
  notes?: string;
  evidenceUrl?: string; // Base64 data URL or uploaded image URL
  evidenceName?: string;
  evidenceType?: 'image' | 'pdf' | 'text';
  status: 'Verified' | 'Pending Evidence' | 'Archived';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: 'CREATE' | 'EDIT' | 'DELETE' | 'EXPORT' | 'LOGIN' | 'BACKUP_RESTORE';
  details: string;
  recordId?: string;
}

export interface Beneficiary {
  id: string;
  fullName: string;
  phoneNumber: string;
  network: NetworkType;
  category: PurposeCategory;
  defaultAmount: number;
  notes?: string;
  zoomName?: string; // Zoom screen name e.g. "Juliet's iPhone" or "J. Imasuem"
  whatsappName?: string; // WhatsApp chat display name e.g. "Sister Juliet AGL"
  aliases?: string[]; // Extra aliases e.g. ["Becky Zoom", "Mrs J Imasuem"]
  totalReceivedAmount?: number;
  totalTransfersCount?: number;
  lastDisbursedDate?: string;
  createdAt: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface AttendanceRecordItem {
  beneficiaryId: string;
  fullName: string;
  phoneNumber: string;
  category: PurposeCategory;
  status: AttendanceStatus;
  checkInTime?: string;
  notes?: string;
}

export interface AttendanceSession {
  id: string;
  serviceName: string;
  serviceType: 'Daily Morning Devotional' | 'Sunday Service' | 'Mid-Week Service' | 'Night Vigil' | 'Special Revival' | 'Youth Fellowship' | 'Ministers Meeting' | 'Other';
  serviceDate: string; // YYYY-MM-DD
  recordedBy: string;
  notes?: string;
  records: AttendanceRecordItem[];
  createdAt: string;
  updatedAt: string;
}

export interface BulkMessageLog {
  id: string;
  timestamp: string;
  sender: string;
  channel: 'WhatsApp' | 'SMS' | 'Copy List' | 'VTPass SMS';
  recipientCount: number;
  messageText: string;
  audienceCategory: string;
}
