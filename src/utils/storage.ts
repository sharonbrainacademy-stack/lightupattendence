import { AirtimeRecord, AuditLog, UserRole, Beneficiary, AttendanceSession, BulkMessageLog, MinistryGroup } from '../types';
import { INITIAL_SAMPLE_RECORDS, INITIAL_AUDIT_LOGS, INITIAL_REGISTERED_BENEFICIARIES } from './sampleData';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

/**
 * Recursively cleans JS objects before passing to Firestore setDoc/addDoc
 * by removing any keys whose value is undefined, which Firestore rejects with error:
 * Unsupported field value: undefined
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

const RECORDS_KEY = 'lu_prayer_house_airtime_records_v1';
const AUDIT_LOGS_KEY = 'lu_prayer_house_audit_logs_v1';
const BENEFICIARIES_KEY = 'lu_prayer_house_beneficiaries_esther_benin_v3';
const ATTENDANCE_KEY = 'lu_prayer_house_attendance_v1';
const BULK_MSG_KEY = 'lu_prayer_house_bulk_msg_v1';
const ADMIN_PASS_KEY = 'lu_prayer_house_admin_pass_v1';
const USER_ROLE_KEY = 'lu_prayer_house_user_role_v1';
const USER_NAME_KEY = 'lu_prayer_house_user_name_v1';
const ACTIVE_GROUP_KEY = 'lu_prayer_house_active_group_v1';
const GROUP_PASSWORDS_KEY = 'lu_prayer_house_group_passwords_v1';

let isSeedingBeneficiaries = false;
let isSeedingAttendance = false;
let isSeedingRecords = false;

function getInitialSampleAttendanceSessions(): AttendanceSession[] {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const prev3Days = new Date(today);
  prev3Days.setDate(today.getDate() - 3);
  const prev3DaysStr = prev3Days.toISOString().split('T')[0];

  return [
    {
      id: `att-sample-today`,
      serviceName: 'Daily Morning Devotional Prayers',
      serviceType: 'Daily Morning Devotional',
      serviceDate: todayStr,
      recordedBy: 'Bro Stephen',
      notes: '05:00 AM WAT Daily Morning Devotional Prayers & covenant blessing for Esther Group members.',
      records: INITIAL_REGISTERED_BENEFICIARIES.filter(b => b.category === 'Esther Group Benin').map((b, idx) => ({
        beneficiaryId: b.id,
        fullName: b.fullName,
        phoneNumber: b.phoneNumber,
        category: b.category,
        status: idx % 11 === 0 ? 'Late' : idx % 9 === 0 ? 'Absent' : 'Present',
        checkInTime: '05:02'
      })),
      createdAt: today.toISOString(),
      updatedAt: today.toISOString()
    },
    {
      id: `att-sample-yesterday`,
      serviceName: 'Daily Morning Devotional Prayers',
      serviceType: 'Daily Morning Devotional',
      serviceDate: yesterdayStr,
      recordedBy: 'Bro Stephen',
      notes: 'Glorious morning revival session. Attendance taken at 05:15 AM WAT.',
      records: INITIAL_REGISTERED_BENEFICIARIES.filter(b => b.category === 'Esther Group Benin').map((b, idx) => ({
        beneficiaryId: b.id,
        fullName: b.fullName,
        phoneNumber: b.phoneNumber,
        category: b.category,
        status: idx % 7 === 0 ? 'Absent' : idx % 12 === 0 ? 'Late' : 'Present',
        checkInTime: '05:05'
      })),
      createdAt: yesterday.toISOString(),
      updatedAt: yesterday.toISOString()
    },
    {
      id: `att-sample-prev3`,
      serviceName: 'Special Revival Fellowship',
      serviceType: 'Special Revival',
      serviceDate: prev3DaysStr,
      recordedBy: 'Bro Stephen',
      notes: 'Special miracle & revival service with full Esther Group Benin turnout.',
      records: INITIAL_REGISTERED_BENEFICIARIES.filter(b => b.category === 'Esther Group Benin').map((b, idx) => ({
        beneficiaryId: b.id,
        fullName: b.fullName,
        phoneNumber: b.phoneNumber,
        category: b.category,
        status: idx % 15 === 0 ? 'Absent' : 'Present',
        checkInTime: '05:00'
      })),
      createdAt: prev3Days.toISOString(),
      updatedAt: prev3Days.toISOString()
    }
  ];
}

// ================= REAL-TIME FIRESTORE SUBSCRIPTIONS =================

export function subscribeToBeneficiaries(callback: (list: Beneficiary[]) => void) {
  const colRef = collection(db, 'beneficiaries');
  return onSnapshot(colRef, (snapshot) => {
    if (snapshot.empty && !isSeedingBeneficiaries) {
      isSeedingBeneficiaries = true;
      const localList = getBeneficiaries();
      const initialList = localList.length > 0 ? localList : INITIAL_REGISTERED_BENEFICIARIES;
      initialList.forEach(b => {
        setDoc(doc(db, 'beneficiaries', b.id), sanitizeForFirestore(b)).catch(err => handleFirestoreError(err, OperationType.WRITE, `beneficiaries/${b.id}`));
      });
      saveBeneficiaries(initialList);
      callback(initialList);
      return;
    }

    const list: Beneficiary[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Beneficiary);
    });

    if (list.length > 0) {
      // Purge and delete unauthorized Peace Group members from Firestore
      const peaceMembers = list.filter(b => b.category === 'Peace Group' || b.id.startsWith('pgm-') || b.notes?.toLowerCase().includes('peace'));
      if (peaceMembers.length > 0) {
        peaceMembers.forEach(b => {
          deleteDoc(doc(db, 'beneficiaries', b.id)).catch(() => {});
        });
      }

      // Keep only authentic Esther Group Benin members
      const cleanList = list.filter(b => b.category !== 'Peace Group' && !b.id.startsWith('pgm-') && !b.notes?.toLowerCase().includes('peace'));

      // Merge any locally added beneficiaries not yet present in Firestore snapshot
      try {
        const rawLocal = localStorage.getItem(BENEFICIARIES_KEY);
        if (rawLocal) {
          const localList: Beneficiary[] = JSON.parse(rawLocal);
          localList
            .filter(b => b.category !== 'Peace Group' && !b.id.startsWith('pgm-'))
            .forEach(localB => {
              if (!cleanList.some(item => item.id === localB.id)) {
                setDoc(doc(db, 'beneficiaries', localB.id), sanitizeForFirestore(localB)).catch(() => {});
                cleanList.push(localB);
              }
            });
        }
      } catch (e) {
        console.warn('Local merge exception ignored', e);
      }

      // Sort beneficiaries alphabetically by full name for a stable, predictable order
      cleanList.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      saveBeneficiaries(cleanList);
      callback(cleanList);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'beneficiaries');
  });
}

export function subscribeToAttendanceSessions(callback: (list: AttendanceSession[]) => void) {
  const colRef = collection(db, 'attendanceSessions');
  return onSnapshot(colRef, (snapshot) => {
    if (snapshot.empty && !isSeedingAttendance) {
      isSeedingAttendance = true;
      const initialSessions = getInitialSampleAttendanceSessions();
      initialSessions.forEach(s => {
        setDoc(doc(db, 'attendanceSessions', s.id), sanitizeForFirestore(s)).catch(err => handleFirestoreError(err, OperationType.WRITE, `attendanceSessions/${s.id}`));
      });
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(initialSessions));
      callback(initialSessions);
      return;
    }

    const list: AttendanceSession[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as AttendanceSession);
    });

    if (list.length > 0) {
      // Purge any unauthorized Peace Group attendance sessions from Firestore
      const peaceSessions = list.filter(s =>
        s.id === 'att-sample-peace-today' ||
        s.serviceName?.toLowerCase().includes('peace group') ||
        s.notes?.toLowerCase().includes('peace group')
      );
      if (peaceSessions.length > 0) {
        peaceSessions.forEach(s => {
          deleteDoc(doc(db, 'attendanceSessions', s.id)).catch(() => {});
        });
      }

      // Keep only Esther Group sessions and filter out peace records from within sessions
      const cleanSessions = list
        .filter(s => s.id !== 'att-sample-peace-today' && !s.serviceName?.toLowerCase().includes('peace group'))
        .map(s => ({
          ...s,
          records: (s.records || []).filter(r => r.category !== 'Peace Group' && !r.beneficiaryId?.startsWith('pgm-'))
        }));

      cleanSessions.sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(cleanSessions));
      callback(cleanSessions);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'attendanceSessions');
  });
}

export function subscribeToRecords(callback: (list: AirtimeRecord[]) => void) {
  const colRef = collection(db, 'airtimeRecords');
  return onSnapshot(colRef, (snapshot) => {
    if (snapshot.empty && !isSeedingRecords) {
      isSeedingRecords = true;
      INITIAL_SAMPLE_RECORDS.forEach(r => {
        setDoc(doc(db, 'airtimeRecords', r.id), sanitizeForFirestore(r)).catch(err => handleFirestoreError(err, OperationType.WRITE, `airtimeRecords/${r.id}`));
      });
      saveRecords(INITIAL_SAMPLE_RECORDS);
      callback(INITIAL_SAMPLE_RECORDS);
      return;
    }

    const list: AirtimeRecord[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as AirtimeRecord);
    });

    if (list.length > 0) {
      // Purge Peace Group records from Firestore
      const peaceRecords = list.filter(r => r.purpose === 'Peace Group' || r.id.startsWith('rec-pg-') || r.purpose?.toLowerCase().includes('peace'));
      if (peaceRecords.length > 0) {
        peaceRecords.forEach(r => {
          deleteDoc(doc(db, 'airtimeRecords', r.id)).catch(() => {});
        });
      }

      const cleanRecords = list.filter(r => r.purpose !== 'Peace Group' && !r.id.startsWith('rec-pg-') && !r.purpose?.toLowerCase().includes('peace'));
      cleanRecords.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      saveRecords(cleanRecords);
      callback(cleanRecords);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'airtimeRecords');
  });
}

export function subscribeToAuditLogs(callback: (list: AuditLog[]) => void) {
  const colRef = collection(db, 'auditLogs');
  return onSnapshot(colRef, (snapshot) => {
    const list: AuditLog[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as AuditLog);
    });
    if (list.length > 0) {
      list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(list));
      callback(list);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'auditLogs');
  });
}

export function subscribeToBulkLogs(callback: (list: BulkMessageLog[]) => void) {
  const colRef = collection(db, 'bulkMessageLogs');
  return onSnapshot(colRef, (snapshot) => {
    const list: BulkMessageLog[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as BulkMessageLog);
    });
    if (list.length > 0) {
      list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      localStorage.setItem(BULK_MSG_KEY, JSON.stringify(list));
      callback(list);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'bulkMessageLogs');
  });
}

// ================= BENEFICIARY METHODS =================

export function getBeneficiaries(): Beneficiary[] {
  try {
    const raw = localStorage.getItem(BENEFICIARIES_KEY);
    if (!raw) {
      localStorage.setItem(BENEFICIARIES_KEY, JSON.stringify(INITIAL_REGISTERED_BENEFICIARIES));
      return INITIAL_REGISTERED_BENEFICIARIES;
    }
    const parsed: Beneficiary[] = JSON.parse(raw);
    // Purge any unauthorized Peace Group members from stored list
    const clean = parsed.filter(b => b.category !== 'Peace Group' && !b.id.startsWith('pgm-') && !b.notes?.toLowerCase().includes('peace'));
    if (clean.length !== parsed.length) {
      localStorage.setItem(BENEFICIARIES_KEY, JSON.stringify(clean));
      parsed
        .filter(b => b.category === 'Peace Group' || b.id.startsWith('pgm-'))
        .forEach(b => {
          deleteDoc(doc(db, 'beneficiaries', b.id)).catch(() => {});
        });
    }
    return clean;
  } catch (err) {
    console.error('Error reading beneficiaries:', err);
    return INITIAL_REGISTERED_BENEFICIARIES;
  }
}

export function saveBeneficiaries(beneficiaries: Beneficiary[]): void {
  try {
    localStorage.setItem(BENEFICIARIES_KEY, JSON.stringify(beneficiaries));
  } catch (err) {
    console.error('Error saving beneficiaries:', err);
  }
}

export function addBeneficiary(b: Beneficiary, user: string, role: UserRole): Beneficiary[] {
  const current = getBeneficiaries();
  const updated = [b, ...current];
  saveBeneficiaries(updated);

  // Sync to Firestore
  setDoc(doc(db, 'beneficiaries', b.id), sanitizeForFirestore(b)).catch(err => handleFirestoreError(err, OperationType.WRITE, `beneficiaries/${b.id}`));

  addAuditLog({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user,
    role,
    action: 'CREATE',
    details: `Registered new beneficiary: ${b.fullName} (${b.phoneNumber}, ${b.network} - ${b.category})`
  });

  return updated;
}

export function updateBeneficiary(b: Beneficiary, user: string, role: UserRole): Beneficiary[] {
  const current = getBeneficiaries();
  const idx = current.findIndex(item => item.id === b.id);
  const oldB = idx !== -1 ? current[idx] : null;
  
  const updated = idx !== -1 ? [...current] : [b, ...current];
  if (idx !== -1) {
    updated[idx] = b;
  }
  saveBeneficiaries(updated);

  // Sync to Firestore
  setDoc(doc(db, 'beneficiaries', b.id), sanitizeForFirestore(b)).catch(err => {
    console.error('Firestore update error for beneficiary:', err);
    handleFirestoreError(err, OperationType.WRITE, `beneficiaries/${b.id}`);
  });

  // Propagate name/phone/category update to existing Attendance Sessions in real time
  try {
    const sessions = getAttendanceSessions();
    let sessionsChanged = false;
    const updatedSessions = sessions.map(s => {
      let recsChanged = false;
      const updatedRecords = (s.records || []).map(rec => {
        const bPhoneClean = (b.phoneNumber || '').replace(/\s+/g, '');
        const recPhoneClean = (rec.phoneNumber || '').replace(/\s+/g, '');
        const recNameClean = (rec.fullName || '').toLowerCase().trim();
        const oldNameClean = (oldB?.fullName || '').toLowerCase().trim();

        const isMatch = (rec.beneficiaryId && rec.beneficiaryId === b.id) ||
                        (bPhoneClean && recPhoneClean && recPhoneClean === bPhoneClean) ||
                        (oldNameClean && recNameClean && recNameClean === oldNameClean);
        if (isMatch) {
          recsChanged = true;
          return {
            ...rec,
            fullName: b.fullName,
            phoneNumber: b.phoneNumber,
            category: b.category,
          };
        }
        return rec;
      });
      if (recsChanged) {
        sessionsChanged = true;
        const newS = { ...s, records: updatedRecords, updatedAt: new Date().toISOString() };
        setDoc(doc(db, 'attendanceSessions', s.id), sanitizeForFirestore(newS)).catch(err => {
          console.error('Firestore update error for attendance session:', err);
        });
        return newS;
      }
      return s;
    });

    if (sessionsChanged) {
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updatedSessions));
    }
  } catch (e) {
    console.error('Error propagating beneficiary update to attendance:', e);
  }

  // Propagate name/phone update to existing Airtime Records in real time
  try {
    const records = getStoredRecords();
    let recordsChanged = false;
    const updatedRecords = records.map(rec => {
      const bPhoneClean = (b.phoneNumber || '').replace(/\s+/g, '');
      const recPhoneClean = (rec.phoneNumber || '').replace(/\s+/g, '');
      const recNameClean = (rec.beneficiaryName || '').toLowerCase().trim();
      const oldNameClean = (oldB?.fullName || '').toLowerCase().trim();

      const isMatch = (bPhoneClean && recPhoneClean && recPhoneClean === bPhoneClean) ||
                      (oldNameClean && recNameClean && recNameClean === oldNameClean);
      if (isMatch) {
        recordsChanged = true;
        const newR = {
          ...rec,
          beneficiaryName: b.fullName,
          phoneNumber: b.phoneNumber,
          purpose: b.category,
          network: b.network,
          updatedAt: new Date().toISOString()
        };
        setDoc(doc(db, 'airtimeRecords', rec.id), sanitizeForFirestore(newR)).catch(err => {
          console.error('Firestore update error for airtime record:', err);
        });
        return newR;
      }
      return rec;
    });

    if (recordsChanged) {
      saveRecords(updatedRecords);
    }
  } catch (e) {
    console.error('Error propagating beneficiary update to records:', e);
  }

  addAuditLog({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user,
    role,
    action: 'EDIT',
    details: `Updated beneficiary profile for: ${b.fullName}`
  });

  return updated;
}

export function deleteBeneficiary(id: string, user: string, role: UserRole): Beneficiary[] {
  const current = getBeneficiaries();
  const target = current.find(item => item.id === id);
  const updated = current.filter(item => item.id !== id);
  saveBeneficiaries(updated);

  // Sync delete to Firestore
  deleteDoc(doc(db, 'beneficiaries', id)).catch(err => handleFirestoreError(err, OperationType.DELETE, `beneficiaries/${id}`));

  if (target) {
    addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user,
      role,
      action: 'DELETE',
      details: `Removed beneficiary profile: ${target.fullName}`
    });
  }

  return updated;
}

// ================= ATTENDANCE METHODS =================

export function getAttendanceSessions(): AttendanceSession[] {
  try {
    const raw = localStorage.getItem(ATTENDANCE_KEY);
    if (!raw) {
      const sampleSessions = getInitialSampleAttendanceSessions();
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(sampleSessions));
      return sampleSessions;
    }
    const parsed: AttendanceSession[] = JSON.parse(raw);
    const cleanSessions = parsed
      .filter(s => s.id !== 'att-sample-peace-today' && !s.serviceName?.toLowerCase().includes('peace group'))
      .map(s => ({
        ...s,
        records: (s.records || []).filter(r => r.category !== 'Peace Group' && !r.beneficiaryId?.startsWith('pgm-'))
      }));

    if (cleanSessions.length !== parsed.length) {
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(cleanSessions));
      deleteDoc(doc(db, 'attendanceSessions', 'att-sample-peace-today')).catch(() => {});
    }
    return cleanSessions;
  } catch (err) {
    console.error('Error reading attendance sessions:', err);
    return [];
  }
}

export function saveAttendanceSession(session: AttendanceSession, user: string, role: UserRole): AttendanceSession[] {
  const current = getAttendanceSessions();
  const index = current.findIndex(s => s.id === session.id);
  let updated: AttendanceSession[];

  if (index !== -1) {
    updated = [...current];
    updated[index] = {
      ...session,
      updatedAt: new Date().toISOString()
    };
  } else {
    updated = [session, ...current];
  }

  saveAttendanceSessionToLocalAndFirestore(session, updated);

  const presentCount = session.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const totalCount = session.records.length;

  addAuditLog({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user,
    role,
    action: index !== -1 ? 'EDIT' : 'CREATE',
    details: `Recorded attendance for ${session.serviceName} (${session.serviceDate}): ${presentCount}/${totalCount} Present`
  });

  return updated;
}

function saveAttendanceSessionToLocalAndFirestore(session: AttendanceSession, updatedList: AttendanceSession[]) {
  try {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updatedList));
  } catch (err) {
    console.error('Error saving attendance session:', err);
  }

  setDoc(doc(db, 'attendanceSessions', session.id), sanitizeForFirestore(session)).catch(err => handleFirestoreError(err, OperationType.WRITE, `attendanceSessions/${session.id}`));
}

export function deleteAttendanceSession(id: string, user: string, role: UserRole): AttendanceSession[] {
  const current = getAttendanceSessions();
  const target = current.find(s => s.id === id);
  const updated = current.filter(s => s.id !== id);

  try {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error deleting attendance session:', err);
  }

  deleteDoc(doc(db, 'attendanceSessions', id)).catch(err => handleFirestoreError(err, OperationType.DELETE, `attendanceSessions/${id}`));

  if (target) {
    addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user,
      role,
      action: 'DELETE',
      details: `Deleted attendance session record for ${target.serviceName} (${target.serviceDate})`
    });
  }

  return updated;
}

// ================= AIRTIME RECORD METHODS =================

export function getStoredRecords(): AirtimeRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(INITIAL_SAMPLE_RECORDS));
      return INITIAL_SAMPLE_RECORDS;
    }
    const parsed: AirtimeRecord[] = JSON.parse(raw);
    const clean = parsed.filter(r => r.purpose !== 'Peace Group' && !r.id.startsWith('rec-pg-') && !r.purpose?.toLowerCase().includes('peace'));
    if (clean.length !== parsed.length) {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(clean));
      parsed
        .filter(r => r.purpose === 'Peace Group' || r.id.startsWith('rec-pg-'))
        .forEach(r => {
          deleteDoc(doc(db, 'airtimeRecords', r.id)).catch(() => {});
        });
    }
    return clean;
  } catch (err) {
    console.error('Error reading stored records:', err);
    return INITIAL_SAMPLE_RECORDS;
  }
}

export function saveRecords(records: AirtimeRecord[]): void {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Error saving records:', err);
  }
}

export function addRecord(record: AirtimeRecord, user: string, role: UserRole): AirtimeRecord[] {
  const current = getStoredRecords();
  const updated = [record, ...current];
  saveRecords(updated);

  setDoc(doc(db, 'airtimeRecords', record.id), sanitizeForFirestore(record)).catch(err => handleFirestoreError(err, OperationType.WRITE, `airtimeRecords/${record.id}`));

  addAuditLog({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user,
    role,
    action: 'CREATE',
    details: `Added distribution of ₦${record.amount} (${record.network}) to ${record.beneficiaryName} - ${record.purpose}`,
    recordId: record.id
  });

  return updated;
}

export function updateRecord(updatedRecord: AirtimeRecord, user: string, role: UserRole): AirtimeRecord[] {
  const current = getStoredRecords();
  const index = current.findIndex(r => r.id === updatedRecord.id);
  if (index === -1) return current;

  const newRecords = [...current];
  newRecords[index] = {
    ...updatedRecord,
    updatedAt: new Date().toISOString()
  };
  saveRecords(newRecords);

  setDoc(doc(db, 'airtimeRecords', updatedRecord.id), sanitizeForFirestore(newRecords[index])).catch(err => handleFirestoreError(err, OperationType.WRITE, `airtimeRecords/${updatedRecord.id}`));

  addAuditLog({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user,
    role,
    action: 'EDIT',
    details: `Updated details for ${updatedRecord.beneficiaryName} (${updatedRecord.receiptNo})`,
    recordId: updatedRecord.id
  });

  return newRecords;
}

export function deleteRecord(recordId: string, user: string, role: UserRole): AirtimeRecord[] {
  const current = getStoredRecords();
  const target = current.find(r => r.id === recordId);
  const updated = current.filter(r => r.id !== recordId);
  saveRecords(updated);

  deleteDoc(doc(db, 'airtimeRecords', recordId)).catch(err => handleFirestoreError(err, OperationType.DELETE, `airtimeRecords/${recordId}`));

  if (target) {
    addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user,
      role,
      action: 'DELETE',
      details: `Deleted record LU Receipt: ${target.receiptNo} (Beneficiary: ${target.beneficiaryName}, ₦${target.amount})`,
      recordId
    });
  }

  return updated;
}

// ================= AUDIT & BULK MSG METHODS =================

export function getAuditLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_KEY);
    if (!raw) {
      localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading audit logs:', err);
    return INITIAL_AUDIT_LOGS;
  }
}

export function addAuditLog(log: AuditLog): void {
  try {
    const current = getAuditLogs();
    const updated = [log, ...current];
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error adding audit log:', err);
  }

  setDoc(doc(db, 'auditLogs', log.id), sanitizeForFirestore(log)).catch(err => handleFirestoreError(err, OperationType.WRITE, `auditLogs/${log.id}`));
}

export function getBulkMessageLogs(): BulkMessageLog[] {
  try {
    const raw = localStorage.getItem(BULK_MSG_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading bulk message logs:', err);
    return [];
  }
}

export function addBulkMessageLog(log: BulkMessageLog): void {
  try {
    const current = getBulkMessageLogs();
    const updated = [log, ...current];
    localStorage.setItem(BULK_MSG_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving bulk message log:', err);
  }

  setDoc(doc(db, 'bulkMessageLogs', log.id), sanitizeForFirestore(log)).catch(err => handleFirestoreError(err, OperationType.WRITE, `bulkMessageLogs/${log.id}`));
}

export function getAdminPassword(): string {
  return localStorage.getItem(ADMIN_PASS_KEY) || 'lightup2026';
}

export function setAdminPassword(newPass: string): void {
  localStorage.setItem(ADMIN_PASS_KEY, newPass);
}

export function getActiveGroup(): MinistryGroup {
  const stored = localStorage.getItem(ACTIVE_GROUP_KEY);
  if (stored === 'Peace Group' || stored === 'Esther Group') {
    return stored as MinistryGroup;
  }
  return 'Esther Group';
}

export function setActiveGroup(group: MinistryGroup): void {
  localStorage.setItem(ACTIVE_GROUP_KEY, group);
}

export function getGroupPasswords(): { estherPassword: string; peacePassword: string } {
  try {
    const stored = localStorage.getItem(GROUP_PASSWORDS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        estherPassword: parsed.estherPassword || 'esther2026',
        peacePassword: parsed.peacePassword || 'peace2026',
      };
    }
  } catch (e) {
    console.error('Error reading group passwords', e);
  }
  return {
    estherPassword: 'esther2026',
    peacePassword: 'peace2026',
  };
}

export function setGroupPasswords(passwords: { estherPassword?: string; peacePassword?: string }): void {
  const current = getGroupPasswords();
  const updated = {
    estherPassword: passwords.estherPassword ? passwords.estherPassword.trim() : current.estherPassword,
    peacePassword: passwords.peacePassword ? passwords.peacePassword.trim() : current.peacePassword,
  };
  localStorage.setItem(GROUP_PASSWORDS_KEY, JSON.stringify(updated));
}

export function verifyGroupSwitchPassword(targetGroup: MinistryGroup, inputPass: string): boolean {
  const trimmed = inputPass.trim();
  if (!trimmed) return false;
  const adminPass = getAdminPassword();
  const groupPasses = getGroupPasswords();
  const targetPass = targetGroup === 'Peace Group' ? groupPasses.peacePassword : groupPasses.estherPassword;

  // Verify against target group password, or master admin password (including default)
  return trimmed === targetPass || trimmed === adminPass || trimmed === 'lightup2026';
}

export function getCurrentUserRole(): UserRole {
  return (localStorage.getItem(USER_ROLE_KEY) as UserRole) || 'Admin';
}

export function setCurrentUserRole(role: UserRole): void {
  localStorage.setItem(USER_ROLE_KEY, role);
}

export function getCurrentUserName(): string {
  const stored = localStorage.getItem(USER_NAME_KEY);
  if (!stored || stored.includes('David') || stored.includes('Pastor David')) {
    localStorage.setItem(USER_NAME_KEY, 'Bro Stephen');
    return 'Bro Stephen';
  }
  return stored;
}

export function setCurrentUserName(name: string): void {
  localStorage.setItem(USER_NAME_KEY, name);
}

export function exportBackupJSON(): string {
  const data = {
    app: 'LIGHT UP PRAYER HOUSE - FAMILY OUTREACH',
    exportedAt: new Date().toISOString(),
    records: getStoredRecords(),
    beneficiaries: getBeneficiaries(),
    attendanceSessions: getAttendanceSessions(),
    auditLogs: getAuditLogs()
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupJSON(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && Array.isArray(parsed.records)) {
      saveRecords(parsed.records);
      if (Array.isArray(parsed.beneficiaries)) {
        saveBeneficiaries(parsed.beneficiaries);
        parsed.beneficiaries.forEach((b: Beneficiary) => setDoc(doc(db, 'beneficiaries', b.id), sanitizeForFirestore(b)));
      }
      if (Array.isArray(parsed.attendanceSessions)) {
        localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(parsed.attendanceSessions));
        parsed.attendanceSessions.forEach((s: AttendanceSession) => setDoc(doc(db, 'attendanceSessions', s.id), sanitizeForFirestore(s)));
      }
      if (Array.isArray(parsed.auditLogs)) {
        localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(parsed.auditLogs));
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('Invalid backup file:', err);
    return false;
  }
}

export function disburseAirtimeOneClick(
  b: Beneficiary,
  amount: number,
  ministerName: string,
  userRole: UserRole,
  receiptNo: string,
  evidenceSvgUrl?: string
): { updatedRecords: AirtimeRecord[]; updatedBeneficiaries: Beneficiary[]; newRecord: AirtimeRecord } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newRecord: AirtimeRecord = {
    id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    receiptNo,
    beneficiaryName: b.fullName,
    phoneNumber: b.phoneNumber,
    network: b.network,
    amount,
    purpose: b.category,
    distributionDate: todayStr,
    distributionTime: timeStr,
    distributedBy: ministerName || 'Ministry Volunteer',
    notes: `⚡ 1-Click Airtime Dispatch to registered beneficiary (${b.notes || 'Outreach Member'})`,
    evidenceUrl: evidenceSvgUrl,
    evidenceName: `1click_transfer_${receiptNo}.png`,
    evidenceType: 'image',
    status: 'Verified',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const updatedRecords = addRecord(newRecord, ministerName, userRole);

  const beneficiaries = getBeneficiaries();
  const bIndex = beneficiaries.findIndex(item => item.id === b.id || item.fullName.toLowerCase() === b.fullName.toLowerCase());
  
  if (bIndex !== -1) {
    const targetB = beneficiaries[bIndex];
    const updatedB = {
      ...targetB,
      totalReceivedAmount: (targetB.totalReceivedAmount || 0) + amount,
      totalTransfersCount: (targetB.totalTransfersCount || 0) + 1,
      lastDisbursedDate: todayStr
    };
    beneficiaries[bIndex] = updatedB;
    saveBeneficiaries(beneficiaries);
    setDoc(doc(db, 'beneficiaries', updatedB.id), sanitizeForFirestore(updatedB)).catch(err => handleFirestoreError(err, OperationType.WRITE, `beneficiaries/${updatedB.id}`));
  }

  return {
    updatedRecords,
    updatedBeneficiaries: beneficiaries,
    newRecord
  };
}

/**
 * Permanently purge all unauthorized Peace Group members and reset ministry to Esther Group
 */
export function purgePeaceGroupAndResetToEsther(): Beneficiary[] {
  try {
    // 1. Reset active group in localStorage
    localStorage.setItem(ACTIVE_GROUP_KEY, 'Esther Group');

    // 2. Clean beneficiaries & reset to official 108 Esther Group members
    localStorage.removeItem('lightup_attendance_draft_Esther Group');
    localStorage.removeItem('lightup_attendance_draft_Peace Group');
    
    // Always enforce the exact official Esther Group roster (108 members)
    const cleanList = INITIAL_REGISTERED_BENEFICIARIES;
    localStorage.setItem(BENEFICIARIES_KEY, JSON.stringify(cleanList));

    // 3. Clean attendance sessions
    const rawAtt = localStorage.getItem(ATTENDANCE_KEY);
    if (rawAtt) {
      const attList: AttendanceSession[] = JSON.parse(rawAtt);
      const cleanAtt = attList
        .filter(s => s.id !== 'att-sample-peace-today' && !s.serviceName?.toLowerCase().includes('peace group'))
        .map(s => ({
          ...s,
          records: (s.records || []).filter(r => r.category !== 'Peace Group' && !r.beneficiaryId?.startsWith('pgm-'))
        }));
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(cleanAtt));
      deleteDoc(doc(db, 'attendanceSessions', 'att-sample-peace-today')).catch(() => {});
    }

    // 4. Clean airtime records
    const rawRec = localStorage.getItem(RECORDS_KEY);
    if (rawRec) {
      const recList: AirtimeRecord[] = JSON.parse(rawRec);
      const cleanRec = recList.filter(r => r.purpose !== 'Peace Group' && !r.id.startsWith('rec-pg-') && !r.purpose?.toLowerCase().includes('peace'));
      localStorage.setItem(RECORDS_KEY, JSON.stringify(cleanRec));
      recList.filter(r => r.purpose === 'Peace Group' || r.id.startsWith('rec-pg-')).forEach(r => {
        deleteDoc(doc(db, 'airtimeRecords', r.id)).catch(() => {});
      });
    }

    return cleanList;
  } catch (err) {
    console.error('Error during peace group purge:', err);
    return getBeneficiaries();
  }
}

/**
 * Force clear all browser caches, unregister service workers, and hard reload the web application
 */
export async function forceHardRefreshApp(): Promise<void> {
  purgePeaceGroupAndResetToEsther();
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) {
    console.warn('Cache clear error:', e);
  }

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
  } catch (e) {
    console.warn('Service worker unregister error:', e);
  }

  // Force clean reload
  window.location.reload();
}

