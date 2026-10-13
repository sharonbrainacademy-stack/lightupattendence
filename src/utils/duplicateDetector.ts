import { Beneficiary, AttendanceSession, AttendanceRecordItem, AirtimeRecord } from '../types';

/**
 * Normalizes a Nigerian or international phone number to its core standard digits.
 * E.g. "+234 805 876 2392", "08058762392", "2348058762392" all become "8058762392".
 */
export function normalizePhoneNumber(rawPhone?: string): string {
  if (!rawPhone) return '';
  // Strip everything except digits
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length >= 13) {
    digits = digits.slice(3);
  } else if (digits.startsWith('234') && digits.length === 13) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Parses a name that may contain brackets/parentheses into outer name and inside bracket name.
 * E.g. "Mrs J Imasuem(Mrs Juliet Imasuen)" -> outer: "Mrs J Imasuem", inside: "Mrs Juliet Imasuen"
 */
export function parseBracketName(rawName: string): { outer: string; inside: string | null } {
  const match = rawName.match(/^(.*?)\((.*?)\)(.*)$/);
  if (match) {
    const outer = `${match[1].trim()} ${match[3].trim()}`.trim();
    const inside = match[2].trim();
    return { outer, inside: inside.length > 0 ? inside : null };
  }
  return { outer: rawName.trim(), inside: null };
}

/**
 * Tokenizes a name into clean lowercase words without punctuation.
 */
export function tokenizeName(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

/**
 * Compares two name strings according to requirements:
 * 1. Single name matches single name.
 * 2. Group name (multiple words) does not need to follow order of arrangement (e.g. "Juliet Johnson" == "Johnson Juliet").
 * 3. A single name cannot match one word of a group name (e.g. "Juliet" != "Juliet Johnson").
 * 4. Bracketed name can be used if outer name did not match.
 */
export function areNamesDuplicateMatch(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;

  const parsedA = parseBracketName(nameA);
  const parsedB = parseBracketName(nameB);

  // Check all candidate combinations:
  // outerA vs outerB, outerA vs insideB, insideA vs outerB, insideA vs insideB
  const candidatesA = [parsedA.outer, parsedA.inside].filter(Boolean) as string[];
  const candidatesB = [parsedB.outer, parsedB.inside].filter(Boolean) as string[];

  for (const candA of candidatesA) {
    for (const candB of candidatesB) {
      if (compareCandidateTokens(candA, candB)) {
        return true;
      }
    }
  }

  return false;
}

function compareCandidateTokens(strA: string, strB: string): boolean {
  const tokensA = tokenizeName(strA);
  const tokensB = tokenizeName(strB);

  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // Single name vs single name
  if (tokensA.length === 1 && tokensB.length === 1) {
    return tokensA[0] === tokensB[0];
  }

  // A single name cannot match one of a group name!
  if (tokensA.length === 1 || tokensB.length === 1) {
    return false;
  }

  // Both are group names (2 or more words):
  // Check if all words match regardless of arrangement order
  if (tokensA.length === tokensB.length) {
    const sortedA = [...tokensA].sort().join(' ');
    const sortedB = [...tokensB].sort().join(' ');
    if (sortedA === sortedB) {
      return true;
    }
  }

  // Check if stripped of titles (Mrs, Bro, Sister, etc.) they match
  const titles = new Set(['mrs', 'mr', 'miss', 'sister', 'bro', 'brother', 'deaconess', 'pastor', 'gl', 'agl']);
  const cleanA = tokensA.filter(t => !titles.has(t));
  const cleanB = tokensB.filter(t => !titles.has(t));

  if (cleanA.length > 0 && cleanB.length > 0 && cleanA.length === cleanB.length) {
    const sortedCleanA = [...cleanA].sort().join(' ');
    const sortedCleanB = [...cleanB].sort().join(' ');
    if (sortedCleanA === sortedCleanB) {
      return true;
    }
  }

  return false;
}

export interface DuplicateBeneficiaryCluster {
  clusterKey: string;
  reasonType: 'SAME_PHONE' | 'SAME_NAME' | 'SAME_ALIAS';
  reasonLabel: string;
  matchedValue: string;
  primary: Beneficiary;
  duplicates: Beneficiary[];
  allMembers: Beneficiary[];
}

/**
 * Scans all beneficiaries and identifies duplicate records (same phone or duplicate name).
 */
export function findDuplicateBeneficiaries(beneficiaries: Beneficiary[]): DuplicateBeneficiaryCluster[] {
  const clusters: DuplicateBeneficiaryCluster[] = [];
  const processedPairKeys = new Set<string>();

  // 1. Group by normalized phone number
  const phoneMap = new Map<string, Beneficiary[]>();
  for (const b of beneficiaries) {
    const normPhone = normalizePhoneNumber(b.phoneNumber);
    if (normPhone && normPhone.length >= 7) {
      if (!phoneMap.has(normPhone)) phoneMap.set(normPhone, []);
      phoneMap.get(normPhone)!.push(b);
    }
  }

  for (const [normPhone, members] of phoneMap.entries()) {
    if (members.length > 1) {
      // Pick best primary: one with highest activity or earliest createdAt
      const sorted = [...members].sort((a, b) => {
        const aScore = (a.totalReceivedAmount || 0) + (a.totalTransfersCount || 0) * 1000;
        const bScore = (b.totalReceivedAmount || 0) + (b.totalTransfersCount || 0) * 1000;
        if (bScore !== aScore) return bScore - aScore;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });

      const primary = sorted[0];
      const duplicates = sorted.slice(1);
      const clusterKey = `phone-${normPhone}`;

      clusters.push({
        clusterKey,
        reasonType: 'SAME_PHONE',
        reasonLabel: `Identical Phone Number (${members[0].phoneNumber})`,
        matchedValue: members[0].phoneNumber,
        primary,
        duplicates,
        allMembers: members
      });

      members.forEach(m1 => {
        members.forEach(m2 => {
          if (m1.id !== m2.id) {
            processedPairKeys.add([m1.id, m2.id].sort().join('::'));
          }
        });
      });
    }
  }

  // 2. Scan for duplicate names / aliases among remaining pairs
  const n = beneficiaries.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const b1 = beneficiaries[i];
      const b2 = beneficiaries[j];
      const pairKey = [b1.id, b2.id].sort().join('::');
      if (processedPairKeys.has(pairKey)) continue;

      if (areNamesDuplicateMatch(b1.fullName, b2.fullName)) {
        processedPairKeys.add(pairKey);

        const sorted = [b1, b2].sort((a, b) => {
          const aScore = (a.totalReceivedAmount || 0) + (a.totalTransfersCount || 0) * 1000;
          const bScore = (b.totalReceivedAmount || 0) + (b.totalTransfersCount || 0) * 1000;
          if (bScore !== aScore) return bScore - aScore;
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        });

        clusters.push({
          clusterKey: `name-${b1.id}-${b2.id}`,
          reasonType: 'SAME_NAME',
          reasonLabel: `Matching Member Name / Alias ("${b1.fullName}" & "${b2.fullName}")`,
          matchedValue: `${b1.fullName} ↔ ${b2.fullName}`,
          primary: sorted[0],
          duplicates: [sorted[1]],
          allMembers: [sorted[0], sorted[1]]
        });
      }
    }
  }

  return clusters;
}

/**
 * Checks if a specific beneficiary is part of any duplicate cluster.
 */
export function getBeneficiaryDuplicateInfo(
  beneficiaryId: string,
  clusters: DuplicateBeneficiaryCluster[]
): { isDuplicate: boolean; isRedundantDuplicate: boolean; cluster?: DuplicateBeneficiaryCluster; matchingWith?: Beneficiary[] } {
  for (const cluster of clusters) {
    if (cluster.allMembers.some(m => m.id === beneficiaryId)) {
      const isRedundant = cluster.duplicates.some(m => m.id === beneficiaryId);
      const matchingWith = cluster.allMembers.filter(m => m.id !== beneficiaryId);
      return {
        isDuplicate: true,
        isRedundantDuplicate: isRedundant,
        cluster,
        matchingWith
      };
    }
  }
  return { isDuplicate: false, isRedundantDuplicate: false };
}

export interface DuplicateSessionCluster {
  clusterKey: string;
  serviceDate: string;
  serviceName: string;
  sessions: AttendanceSession[];
}

/**
 * Identifies duplicate attendance sessions recorded on the same date for the same service.
 */
export function findDuplicateAttendanceSessions(sessions: AttendanceSession[]): DuplicateSessionCluster[] {
  const map = new Map<string, AttendanceSession[]>();
  for (const s of sessions) {
    const key = `${s.serviceDate.trim()}__${s.serviceName.toLowerCase().trim()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }

  const result: DuplicateSessionCluster[] = [];
  for (const [key, sessionGroup] of map.entries()) {
    if (sessionGroup.length > 1) {
      result.push({
        clusterKey: key,
        serviceDate: sessionGroup[0].serviceDate,
        serviceName: sessionGroup[0].serviceName,
        sessions: sessionGroup
      });
    }
  }
  return result;
}

export interface DuplicateAttendeeItem {
  beneficiaryId?: string;
  fullName: string;
  phoneNumber: string;
  indices: number[];
  count: number;
}

/**
 * Detects duplicate attendee entries inside a single attendance session.
 */
export function findDuplicateAttendeesInSession(records: AttendanceRecordItem[]): DuplicateAttendeeItem[] {
  const map = new Map<string, { item: AttendanceRecordItem; indices: number[] }>();

  records.forEach((rec, idx) => {
    const phoneNorm = normalizePhoneNumber(rec.phoneNumber);
    const nameNorm = rec.fullName.toLowerCase().trim();
    // Unique identifier key
    const key = rec.beneficiaryId ? `id:${rec.beneficiaryId}` : phoneNorm ? `phone:${phoneNorm}` : `name:${nameNorm}`;

    if (!map.has(key)) {
      map.set(key, { item: rec, indices: [idx] });
    } else {
      map.get(key)!.indices.push(idx);
    }
  });

  const duplicates: DuplicateAttendeeItem[] = [];
  for (const [, val] of map.entries()) {
    if (val.indices.length > 1) {
      duplicates.push({
        beneficiaryId: val.item.beneficiaryId,
        fullName: val.item.fullName,
        phoneNumber: val.item.phoneNumber,
        indices: val.indices,
        count: val.indices.length
      });
    }
  }
  return duplicates;
}

export interface DuplicateAirtimeRecordCluster {
  receiptNo: string;
  records: AirtimeRecord[];
}

/**
 * Scans for duplicate airtime transaction records sharing the same receipt number.
 */
export function findDuplicateAirtimeRecords(records: AirtimeRecord[]): DuplicateAirtimeRecordCluster[] {
  const map = new Map<string, AirtimeRecord[]>();
  for (const r of records) {
    const key = r.receiptNo.trim().toUpperCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  const result: DuplicateAirtimeRecordCluster[] = [];
  for (const [receiptNo, group] of map.entries()) {
    if (group.length > 1) {
      result.push({ receiptNo, records: group });
    }
  }
  return result;
}
