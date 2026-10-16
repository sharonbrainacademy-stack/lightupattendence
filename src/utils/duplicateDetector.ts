import { Beneficiary, AttendanceSession, AttendanceRecordItem, AirtimeRecord } from '../types';

/**
 * Common ministry and courtesy title prefixes.
 * When stripping titles for comparison, we ensure that honorifics do not distort matching.
 */
export const TITLE_PREFIXES = new Set([
  'mrs', 'mr', 'miss', 'ms', 'dr', 'prof',
  'sister', 'sis', 'bro', 'brother',
  'deacon', 'deaconess', 'pastor', 'pst',
  'evang', 'evangelist', 'elder', 'apostle',
  'rev', 'reverend', 'bishop', 'gl', 'agl'
]);

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
 * Normalizes raw name string:
 * 1. Decomposes Unicode diacritics (accents).
 * 2. Normalizes standalone "NK" variants ("N.K.", "N-K", "N K", "nk", "Nk", "NK", "nK") into "NK".
 */
export function normalizeNameString(str: string): string {
  if (!str) return '';
  let s = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Normalize dotted, dashed, or spaced NK occurrences as dedicated token NK
  s = s.replace(/\bN[\.\-\s]?K\b/gi, 'NK');
  return s;
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
 * Automatically normalizes NK and diacritics.
 */
export function tokenizeName(str: string): string[] {
  const norm = normalizeNameString(str);
  return norm
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

/**
 * Strips title prefixes from tokens to retrieve core personal names.
 * If stripping would remove all tokens (e.g. name was literally just "Pastor"),
 * the original tokens are kept.
 */
export function getCoreNameTokens(str: string): string[] {
  const tokens = tokenizeName(str);
  const stripped = tokens.filter(t => !TITLE_PREFIXES.has(t));
  return stripped.length > 0 ? stripped : tokens;
}

/**
 * Compares two name strings according to strict user specifications:
 * 1. Single name matches single name ONLY (e.g. "NK" matches "NK" or "nk").
 * 2. Group name (multiple words) matches group name ONLY (e.g. "Juliet Johnson" == "Johnson Juliet").
 * 3. A single name CANNOT match one word of a group name (e.g. "NK" != "Sister Nk Peace", "Juliet" != "Juliet Johnson").
 * 4. Word arrangement order does NOT matter for group of names.
 * 5. Case insensitive: uppercase, lowercase, sentence case, toggle case all match.
 * 6. NK is a name and always matches NK across all casing and punctuation variants ("N.K.", "N K", "nk", "Nk").
 * 7. Bracketed names and aliases are checked if outer name doesn't match.
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
  // First, compare with core names (titles stripped)
  const coreA = getCoreNameTokens(strA);
  const coreB = getCoreNameTokens(strB);

  if (coreA.length === 0 || coreB.length === 0) return false;

  // Single name vs Single name:
  // Must match exactly (case-insensitive already in getCoreNameTokens)
  if (coreA.length === 1 && coreB.length === 1) {
    return coreA[0] === coreB[0];
  }

  // Strict Rule: Single name CANNOT match a group of names!
  if (coreA.length === 1 || coreB.length === 1) {
    return false;
  }

  // Both are group of names (2 or more core tokens):
  // 1. Equal token count: check if all tokens match regardless of word order
  if (coreA.length === coreB.length) {
    const sortedA = [...coreA].sort().join(' ');
    const sortedB = [...coreB].sort().join(' ');
    if (sortedA === sortedB) {
      return true;
    }
  }

  // Also check without title stripping (raw tokens) in case title was an essential differentiator
  const rawA = tokenizeName(strA);
  const rawB = tokenizeName(strB);
  if (rawA.length === 1 && rawB.length === 1) {
    return rawA[0] === rawB[0];
  }
  if (rawA.length > 1 && rawB.length > 1 && rawA.length === rawB.length) {
    const sortedRawA = [...rawA].sort().join(' ');
    const sortedRawB = [...rawB].sort().join(' ');
    if (sortedRawA === sortedRawB) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if two Beneficiary objects are duplicates by comparing:
 * 1. Normalized phone numbers
 * 2. Full names
 * 3. Aliases and Zoom screen names
 */
export function areBeneficiariesDuplicateMatch(
  b1: Beneficiary,
  b2: Beneficiary
): { isMatch: boolean; reasonType?: 'SAME_PHONE' | 'SAME_NAME' | 'SAME_ALIAS'; reasonLabel?: string; matchedValue?: string } {
  // 1. Check Phone Numbers
  const p1 = normalizePhoneNumber(b1.phoneNumber);
  const p2 = normalizePhoneNumber(b2.phoneNumber);
  if (p1 && p2 && p1.length >= 7 && p1 === p2) {
    return {
      isMatch: true,
      reasonType: 'SAME_PHONE',
      reasonLabel: `Identical Phone Number (${b1.phoneNumber})`,
      matchedValue: b1.phoneNumber
    };
  }

  // 2. Check Primary Full Names
  if (areNamesDuplicateMatch(b1.fullName, b2.fullName)) {
    return {
      isMatch: true,
      reasonType: 'SAME_NAME',
      reasonLabel: `Matching Member Name ("${b1.fullName}" ↔ "${b2.fullName}")`,
      matchedValue: `${b1.fullName} ↔ ${b2.fullName}`
    };
  }

  // 3. Check Aliases and Zoom Names
  const names1 = [b1.fullName, b1.zoomName, b1.whatsappName, ...(b1.aliases || [])].filter(Boolean) as string[];
  const names2 = [b2.fullName, b2.zoomName, b2.whatsappName, ...(b2.aliases || [])].filter(Boolean) as string[];

  for (const n1 of names1) {
    for (const n2 of names2) {
      if (areNamesDuplicateMatch(n1, n2)) {
        return {
          isMatch: true,
          reasonType: 'SAME_ALIAS',
          reasonLabel: `Matching Alias / Zoom Name ("${n1}" ↔ "${n2}")`,
          matchedValue: `${n1} ↔ ${n2}`
        };
      }
    }
  }

  return { isMatch: false };
}

export interface DuplicateBeneficiaryCluster {
  clusterKey: string;
  reasonType: 'SAME_PHONE' | 'SAME_NAME' | 'SAME_ALIAS' | 'SAME_NAME_AND_PHONE';
  reasonLabel: string;
  matchedValue: string;
  primary: Beneficiary;
  duplicates: Beneficiary[];
  allMembers: Beneficiary[];
}

/**
 * Scans all beneficiaries and identifies duplicate records (same phone or duplicate name).
 * Uses connected-component clustering so that multi-record duplicate chains are grouped cleanly.
 */
export function findDuplicateBeneficiaries(beneficiaries: Beneficiary[]): DuplicateBeneficiaryCluster[] {
  const n = beneficiaries.length;
  if (n <= 1) return [];

  // Build adjacency list for connected components
  const adj = new Map<number, Set<number>>();
  for (let i = 0; i < n; i++) adj.set(i, new Set());

  // Store pairwise matching reasons
  const matchDetails = new Map<string, { reasonType: 'SAME_PHONE' | 'SAME_NAME' | 'SAME_ALIAS'; label: string; value: string }>();

  // 1. Phone matching
  const phoneMap = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const normPhone = normalizePhoneNumber(beneficiaries[i].phoneNumber);
    if (normPhone && normPhone.length >= 7) {
      if (!phoneMap.has(normPhone)) phoneMap.set(normPhone, []);
      phoneMap.get(normPhone)!.push(i);
    }
  }

  for (const [phone, indices] of phoneMap.entries()) {
    if (indices.length > 1) {
      for (let a = 0; a < indices.length; a++) {
        for (let b = a + 1; b < indices.length; b++) {
          const i = indices[a];
          const j = indices[b];
          adj.get(i)!.add(j);
          adj.get(j)!.add(i);
          const key = [i, j].sort((x, y) => x - y).join('::');
          matchDetails.set(key, {
            reasonType: 'SAME_PHONE',
            label: `Identical Phone Number (${beneficiaries[i].phoneNumber})`,
            value: beneficiaries[i].phoneNumber
          });
        }
      }
    }
  }

  // 2. Name & Alias matching
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const match = areBeneficiariesDuplicateMatch(beneficiaries[i], beneficiaries[j]);
      if (match.isMatch) {
        adj.get(i)!.add(j);
        adj.get(j)!.add(i);
        const key = `${i}::${j}`;
        const existing = matchDetails.get(key);
        if (existing && existing.reasonType === 'SAME_PHONE' && match.reasonType === 'SAME_NAME') {
          matchDetails.set(key, {
            reasonType: 'SAME_NAME',
            label: `Identical Name & Phone ("${beneficiaries[i].fullName}")`,
            value: `${beneficiaries[i].fullName} (${beneficiaries[i].phoneNumber})`
          });
        } else if (!existing) {
          matchDetails.set(key, {
            reasonType: match.reasonType || 'SAME_NAME',
            label: match.reasonLabel || `Matching Name ("${beneficiaries[i].fullName}" ↔ "${beneficiaries[j].fullName}")`,
            value: match.matchedValue || `${beneficiaries[i].fullName} ↔ ${beneficiaries[j].fullName}`
          });
        }
      }
    }
  }

  // 3. Find connected components
  const visited = new Set<number>();
  const clusters: DuplicateBeneficiaryCluster[] = [];

  for (let i = 0; i < n; i++) {
    if (visited.has(i)) continue;

    // Traverse component
    const componentIndices: number[] = [];
    const queue = [i];
    visited.add(i);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      componentIndices.push(curr);
      for (const neighbor of adj.get(curr) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    if (componentIndices.length > 1) {
      const members = componentIndices.map(idx => beneficiaries[idx]);

      // Sort members to pick best Primary record:
      // Priority 1: Has received airtime / transfers
      // Priority 2: Has a valid phone number
      // Priority 3: Earliest created record
      const sorted = [...members].sort((a, b) => {
        const aScore = (a.totalReceivedAmount || 0) + (a.totalTransfersCount || 0) * 1000;
        const bScore = (b.totalReceivedAmount || 0) + (b.totalTransfersCount || 0) * 1000;
        if (bScore !== aScore) return bScore - aScore;

        const aHasPhone = (a.phoneNumber || '').length >= 7 ? 1 : 0;
        const bHasPhone = (b.phoneNumber || '').length >= 7 ? 1 : 0;
        if (bHasPhone !== aHasPhone) return bHasPhone - aHasPhone;

        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });

      const primary = sorted[0];
      const duplicates = sorted.slice(1);

      // Determine predominant reason
      let hasPhoneDupe = false;
      let hasNameDupe = false;
      let reasonLabel = '';
      let matchedValue = '';

      for (let a = 0; a < componentIndices.length; a++) {
        for (let b = a + 1; b < componentIndices.length; b++) {
          const key = [componentIndices[a], componentIndices[b]].sort((x, y) => x - y).join('::');
          const detail = matchDetails.get(key);
          if (detail) {
            if (detail.reasonType === 'SAME_PHONE') hasPhoneDupe = true;
            if (detail.reasonType === 'SAME_NAME' || detail.reasonType === 'SAME_ALIAS') hasNameDupe = true;
            if (!reasonLabel) {
              reasonLabel = detail.label;
              matchedValue = detail.value;
            }
          }
        }
      }

      let reasonType: 'SAME_PHONE' | 'SAME_NAME' | 'SAME_ALIAS' | 'SAME_NAME_AND_PHONE' = 'SAME_NAME';
      if (hasPhoneDupe && hasNameDupe) {
        reasonType = 'SAME_NAME_AND_PHONE';
        reasonLabel = `Duplicate Name & Phone Conflict ("${primary.fullName}")`;
        matchedValue = `${primary.fullName} • ${primary.phoneNumber}`;
      } else if (hasPhoneDupe) {
        reasonType = 'SAME_PHONE';
        if (!reasonLabel) reasonLabel = `Identical Phone Number (${primary.phoneNumber})`;
      } else {
        reasonType = 'SAME_NAME';
        if (!reasonLabel) reasonLabel = `Matching Member Name ("${primary.fullName}")`;
      }

      clusters.push({
        clusterKey: `cluster-${primary.id}-${duplicates.map(d => d.id).join('-')}`,
        reasonType,
        reasonLabel,
        matchedValue: matchedValue || primary.fullName,
        primary,
        duplicates,
        allMembers: sorted
      });
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
): {
  isDuplicate: boolean;
  isRedundantDuplicate: boolean;
  cluster?: DuplicateBeneficiaryCluster;
  matchingWith?: Beneficiary[];
} {
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

export interface DuplicateNameTestResult {
  isDuplicateMatch: boolean;
  inputName: string;
  matchedBeneficiary?: Beneficiary;
  matchType?: 'SINGLE_NAME_EXACT' | 'GROUP_NAME_REORDER' | 'TITLE_STRIPPED' | 'ALIAS_MATCH';
  ruleExplanation?: string;
  confidence: number;
}

/**
 * Tests an arbitrary input string (from live test dictator tool) against the beneficiary directory
 * and reports whether it is recognized as a duplicate of an existing member.
 */
export function testNameAgainstBeneficiaries(
  rawInput: string,
  beneficiaries: Beneficiary[]
): DuplicateNameTestResult {
  const input = rawInput.trim();
  if (!input) {
    return { isDuplicateMatch: false, inputName: '', confidence: 0 };
  }

  for (const b of beneficiaries) {
    if (areNamesDuplicateMatch(input, b.fullName)) {
      const coreInput = getCoreNameTokens(input);
      const coreB = getCoreNameTokens(b.fullName);

      let matchType: 'SINGLE_NAME_EXACT' | 'GROUP_NAME_REORDER' | 'TITLE_STRIPPED' | 'ALIAS_MATCH' = 'GROUP_NAME_REORDER';
      let ruleExplanation = '';

      if (coreInput.length === 1 && coreB.length === 1) {
        matchType = 'SINGLE_NAME_EXACT';
        ruleExplanation = `Strict Single Name Match: "${input}" correctly matched single name "${b.fullName}" (Case-insensitive, NK dedicated)`;
      } else if (coreInput.join(' ') === coreB.join(' ')) {
        matchType = 'TITLE_STRIPPED';
        ruleExplanation = `Direct / Title-Stripped Match: "${input}" corresponds to "${b.fullName}"`;
      } else {
        matchType = 'GROUP_NAME_REORDER';
        ruleExplanation = `Group of Names Order-Invariance: Words in "${input}" match all words in "${b.fullName}" regardless of order`;
      }

      return {
        isDuplicateMatch: true,
        inputName: input,
        matchedBeneficiary: b,
        matchType,
        ruleExplanation,
        confidence: 100
      };
    }

    // Check aliases
    const aliases = [b.zoomName, b.whatsappName, ...(b.aliases || [])].filter(Boolean) as string[];
    for (const al of aliases) {
      if (areNamesDuplicateMatch(input, al)) {
        return {
          isDuplicateMatch: true,
          inputName: input,
          matchedBeneficiary: b,
          matchType: 'ALIAS_MATCH',
          ruleExplanation: `Alias Match: "${input}" matched registered alias/Zoom name "${al}" for member "${b.fullName}"`,
          confidence: 96
        };
      }
    }
  }

  return {
    isDuplicateMatch: false,
    inputName: input,
    confidence: 0,
    ruleExplanation: `No duplicate conflict found in directory. Single names only match single names, and group names only match group names.`
  };
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
