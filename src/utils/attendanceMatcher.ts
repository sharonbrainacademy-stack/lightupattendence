import { Beneficiary } from '../types';

/**
 * Normalizes any phone number format (international +234, local 0..., dashes, spaces)
 * to standard Nigerian 11 digits format e.g. "08039463823"
 */
export function normalizePhone(ph: string): string {
  if (!ph) return '';
  const digits = ph.replace(/[^0-9]/g, '');
  if (digits.startsWith('234') && digits.length >= 12) {
    return '0' + digits.slice(3);
  }
  return digits;
}

export interface CleanedLineResult {
  cleanText: string;
  extractedPhone: string;
  rawLine: string;
}

/**
 * Robust cleaner that handles WhatsApp timestamps, Zoom chat logs, roles,
 * device names, titles, and extra symbols.
 */
export function cleanPastedLine(rawLine: string): CleanedLineResult {
  let line = (rawLine || '').trim();
  if (!line) return { cleanText: '', extractedPhone: '', rawLine: '' };

  // Normalize Unicode diacritics
  line = line.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Normalize all variations of "NK" (uppercase, lowercase, sentence case, toggle case, dotted "N.K.", "N K", "N-K")
  line = line.replace(/\bN[\.\-\/\s]+K\b/gi, 'NK');
  line = line.replace(/\bNK\b[\.]?/gi, 'NK');

  // 1. Strip WhatsApp bracketed or unbracketed timestamps e.g. "[5:30 AM, 10/13/2026]", "10/13/2026, 05:22 -"
  line = line.replace(/^\[[^\]]+\]\s*[-–:]?\s*/, '');
  line = line.replace(/^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?\s*[-–:]?\s*/, '');
  line = line.replace(/^\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?\s*[-–:]?\s*/, '');

  // 2. Strip Zoom chat prefixes e.g. "From Joy Aghedo to Everyone: Present" -> "Joy Aghedo"
  line = line.replace(/^From\s+(.+?)\s+to\s+Everyone\s*:\s*(.*)$/i, (_m, sender, msg) => {
    if (!msg || /^(?:present|here|good morning|amen|online|attended|joined|yes|checking in)\b/i.test(msg.trim())) {
      return sender;
    }
    return `${sender} ${msg}`;
  });
  line = line.replace(/^From\s+(.+?)\s*:\s*(.*)$/i, (_m, sender, msg) => {
    if (!msg || /^(?:present|here|good morning|amen|online|attended|joined|yes|checking in)\b/i.test(msg.trim())) {
      return sender;
    }
    return `${sender} ${msg}`;
  });

  // 3. Strip message suffixes e.g. ": Present", ": good morning", ": joined", ": here"
  line = line.replace(/^(.+?)\s*[-–:]\s*(?:present|here|good morning|amen|online|attended|joined|yes|checking in).*$/i, '$1');

  // 4. Extract any phone number sequence before stripping characters
  const phoneMatch = line.match(/(?:\+?234|0)[789][01]\d{8}/) || line.match(/\d{4}[\s-]?\d{3}[\s-]?\d{4}/);
  let extractedPhone = '';
  if (phoneMatch) {
    extractedPhone = normalizePhone(phoneMatch[0]);
    // Replace the phone from the line so it doesn't pollute name matching
    line = line.replace(phoneMatch[0], ' ');
  }

  // 5. Strip list numbering, bullets, emojis, checkboxes
  line = line.replace(/^[•\-\*\+\~\✓\>#\d]+[\.\)\-\:\s]*/, '');
  line = line.replace(/^No\.?\s*\d+[\.\)\-\:\s]*/i, '');

  // 6. Strip device suffixes & hardware labels
  line = line.replace(/'s\s+(?:iPhone|phone|Android|device|iPad|tablet)/gi, ' ');
  line = line.replace(/\b(?:iPhone|Android|iPad|Galaxy|Infinix|Tecno|Redmi|Phone|Host|Co-host|Host & Co-host|Me|Guest|Participant)\b/gi, ' ');

  // 7. Strip religious and ministry honorifics/titles
  line = line.replace(/\b(?:Pastor|Pastors|Pst|Rev|Reverend|Bishop|Apostle|Deacon|Dcn|Deaconess|Dcns|Elder|Evangelist|Evang|Minister|Min|Brother|Bro|Sister|Sis|Mrs|Mr|Miss|Mama|Madam|Mummy|Daddy|Dr|Engr|Barr|Chief)\b/gi, ' ');

  // 8. Strip group tags, branches, status flags
  line = line.replace(/\b(?:ESG|Esther Group|Esther Group Benin|Peace Group|LPH|AGL|GL|Benin|Branch)\b/gi, ' ');
  line = line.replace(/\b(?:Present|Absent|Late|Excused|Attended|Here|Online|Zoom|WhatsApp|Checked in|Morning Devotional|Daily Prayer|Prayer|Amen|Good morning)\b/gi, ' ');

  // 9. Normalize whitespace and remove remaining non-alphanumeric punctuation (ensures case-insensitivity)
  line = line.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  return { cleanText: line, extractedPhone, rawLine };
}

/**
 * Calculates Levenshtein string similarity score between 0.0 and 1.0
 */
export function getSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  const l1 = s1.length;
  const l2 = s2.length;
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(l1, l2);
    const maxLen = Math.max(l1, l2);
    if (minLen >= 3) return minLen / maxLen;
  }
  const matrix: number[][] = Array(l2 + 1).fill(null).map(() => Array(l1 + 1).fill(0));
  for (let i = 0; i <= l1; i++) matrix[0][i] = i;
  for (let j = 0; j <= l2; j++) matrix[j][0] = j;

  for (let j = 1; j <= l2; j++) {
    for (let i = 1; i <= l1; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  const distance = matrix[l2][l1];
  const maxLen = Math.max(l1, l2);
  return maxLen === 0 ? 1 : (maxLen - distance) / maxLen;
}

export interface BeneficiaryIndexItem {
  beneficiary: Beneficiary;
  nameVariants: string[];
  variantTokenSets: string[][];
  phone: string;
  shortPhone: string;
}

/**
 * Indexes beneficiaries with all potential name variations (bracket aliases, Zoom names, WhatsApp display names, titles)
 */
export function buildBeneficiaryIndex(beneficiaries: Beneficiary[]): BeneficiaryIndexItem[] {
  return (beneficiaries || []).map(b => {
    const bName = b?.fullName || '';
    const bPhone = normalizePhone(b?.phoneNumber || '');
    const bShortPhone = bPhone.length >= 7 ? bPhone.slice(-7) : bPhone;

    // Extract inside-bracket aliases e.g. "Mrs J Imasuem(Mrs Juliet Imasuen)" -> "Mrs Juliet Imasuen"
    const insideAliases: string[] = [];
    const bracketMatches = Array.from(bName.matchAll(/\(([^)]+)\)/g));
    bracketMatches.forEach(m => {
      if (m[1] && m[1].trim()) insideAliases.push(m[1].trim());
    });
    const outsideName = bName.replace(/\([^)]*\)/g, ' ').trim();

    const nameVariants: string[] = [];
    const addVariant = (raw: string) => {
      if (!raw) return;
      const cleaned = cleanPastedLine(raw).cleanText;
      if (cleaned && !nameVariants.includes(cleaned)) {
        nameVariants.push(cleaned);
      }
    };

    if (outsideName) addVariant(outsideName);
    insideAliases.forEach(a => addVariant(a));
    addVariant(bName);
    if (b.zoomName) addVariant(b.zoomName);
    if (b.whatsappName) addVariant(b.whatsappName);
    if (Array.isArray(b.aliases)) {
      b.aliases.forEach(a => addVariant(a));
    }

    const variantTokenSets = nameVariants.map(v => v.split(' ').filter(t => t.length >= 2 || t === 'nk'));

    return {
      beneficiary: b,
      nameVariants,
      variantTokenSets,
      phone: bPhone,
      shortPhone: bShortPhone
    };
  });
}

export interface LineMatchResult {
  matched: Beneficiary | null;
  reason: string;
  score: number;
  ruleId: string;
  ruleName: string;
}

/**
 * Match a single line from pasted text against our beneficiary index
 * Rules strictly enforce:
 * 1. Single name matches a single name only.
 * 2. Group of names matches a group of names only.
 * 3. "NK" is recognized as a name and always matches to "NK".
 * 4. Matching is case-insensitive (UPPERCASE, lowercase, Sentence Case, tOGGLE cASE).
 */
export function matchLineToBeneficiary(
  rawLine: string,
  index: BeneficiaryIndexItem[],
  minThreshold: number = 75
): LineMatchResult {
  const { cleanText, extractedPhone } = cleanPastedLine(rawLine);

  // 1. Direct Phone Number Match (Highest confidence = 100) - Rule 1
  if (extractedPhone && extractedPhone.length >= 7) {
    const phoneShort = extractedPhone.slice(-7);
    for (const bObj of index) {
      if (bObj.phone === extractedPhone || (bObj.shortPhone && bObj.shortPhone === phoneShort)) {
        return {
          matched: bObj.beneficiary,
          reason: `Phone match (${extractedPhone})`,
          score: 100,
          ruleId: 'rule_phone',
          ruleName: 'Rule 1: Phone Normalization & Exact Match'
        };
      }
    }
  }

  // If no name text left (e.g. was just an unknown phone number or whitespace)
  if (!cleanText || cleanText.length < 2) {
    return {
      matched: null,
      reason: 'Line too short or empty',
      score: 0,
      ruleId: 'rule_none',
      ruleName: 'Unmatched'
    };
  }

  const lineTokens = cleanText.split(' ').filter(t => t.length >= 2 || t === 'nk');
  const isInputSingleName = (lineTokens.length === 1);
  const isInputGroupOfNames = (lineTokens.length >= 2);

  // Priority: "NK" is a distinctive single name and must always match to "NK"
  // Handles any casing: NK, nk, Nk, nK, N.K., N.K, N K, N-K
  if (cleanText === 'nk' || (isInputSingleName && lineTokens[0] === 'nk')) {
    const nkMatch = index.find(bObj => 
      bObj.nameVariants.some(v => v === 'nk') || 
      bObj.beneficiary.fullName.trim().toLowerCase() === 'nk'
    );
    if (nkMatch) {
      return {
        matched: nkMatch.beneficiary,
        reason: 'Direct match for member "NK"',
        score: 100,
        ruleId: 'rule_nk_name',
        ruleName: 'Rule: Direct NK Name Match'
      };
    }
  }

  let bestB: Beneficiary | null = null;
  let bestScore = 0;
  let bestReason = '';
  let bestRuleId = 'rule_none';
  let bestRuleName = 'Unmatched';

  for (const bObj of index) {
    let score = 0;
    let reason = '';
    let currentRuleId = 'rule_none';
    let currentRuleName = 'Unmatched';

    // A. Exact Name Match with any variant - Rule 2 (Strict Partitioning)
    for (let vIdx = 0; vIdx < bObj.nameVariants.length; vIdx++) {
      const variant = bObj.nameVariants[vIdx];
      const targetTokens = bObj.variantTokenSets[vIdx] || [];
      const isTargetSingleName = (targetTokens.length === 1);
      const isTargetGroupOfNames = (targetTokens.length >= 2);

      // Single name matches single name only; group of names matches group of names only
      if (isInputSingleName && !isTargetSingleName) continue;
      if (isInputGroupOfNames && !isTargetGroupOfNames) continue;

      if (cleanText === variant) {
        score = 99;
        reason = `Exact name match "${variant}"`;
        currentRuleId = 'rule_exact_name';
        currentRuleName = 'Rule 2: Full Name & Alias Match';
        break;
      }
    }

    // B. Token Subset / Set Matching (Word-order independent) - Rules 3, 4, 5
    if (score < 90 && lineTokens.length >= 1) {
      for (const targetTokens of bObj.variantTokenSets) {
        if (targetTokens.length === 0) continue;

        const isTargetSingleName = (targetTokens.length === 1);
        const isTargetGroupOfNames = (targetTokens.length >= 2);

        // Strict Partitioning:
        // A single name matches a single name only; a group of names matches a group of names only.
        if (isInputSingleName && !isTargetSingleName) continue;
        if (isInputGroupOfNames && !isTargetGroupOfNames) continue;

        // CASE 1: Group of Names vs Group of Names (2+ tokens)
        if (isInputGroupOfNames && isTargetGroupOfNames) {
          // Count matched tokens
          let matchCount = 0;
          for (const tt of targetTokens) {
            const hasMatch = lineTokens.some(lt => 
              lt === tt || 
              (lt.length >= 4 && tt.length >= 4 && (lt.startsWith(tt) || tt.startsWith(lt))) ||
              getSimilarity(lt, tt) >= 0.85
            );
            if (hasMatch) matchCount++;
          }

          if (matchCount === targetTokens.length && targetTokens.length >= 2) {
            const currentScore = 96;
            if (currentScore > score) {
              score = currentScore;
              reason = `All words matched (${targetTokens.join(' ')})`;
              currentRuleId = 'rule_word_order';
              currentRuleName = 'Rule 3: Invariant Word-Order Match';
            }
          } else if (matchCount === lineTokens.length && lineTokens.length >= 2) {
            const currentScore = 94;
            if (currentScore > score) {
              score = currentScore;
              reason = `Matched line words in (${targetTokens.join(' ')})`;
              currentRuleId = 'rule_subset_token';
              currentRuleName = 'Rule 4: Multi-Token Subset Match';
            }
          } else if (matchCount >= 2) {
            const currentScore = 90;
            if (currentScore > score) {
              score = currentScore;
              reason = `Matched 2+ names in (${targetTokens.join(' ')})`;
              currentRuleId = 'rule_subset_token';
              currentRuleName = 'Rule 4: Multi-Token Subset Match';
            }
          }
        } 
        // CASE 2: Single Name vs Single Name (1 token only)
        else if (isInputSingleName && isTargetSingleName) {
          const lt = lineTokens[0];
          const tt = targetTokens[0];
          if (lt === tt) {
            const isNK = (lt === 'nk' && tt === 'nk');
            const currentScore = isNK ? 100 : 95;
            if (currentScore > score) {
              score = currentScore;
              reason = isNK ? 'Exact match for name "NK"' : `Single name exact match "${tt}"`;
              currentRuleId = isNK ? 'rule_nk_name' : 'rule_key_name';
              currentRuleName = isNK ? 'Rule: Direct NK Name Match' : 'Rule 5: Single Name to Single Name Match';
            }
          } else if (lt.length >= 4 && tt.length >= 4 && (lt.startsWith(tt) || tt.startsWith(lt))) {
            const currentScore = 88;
            if (currentScore > score) {
              score = currentScore;
              reason = `Single name prefix match "${tt}"`;
              currentRuleId = 'rule_key_name';
              currentRuleName = 'Rule 5: Single Name to Single Name Match';
            }
          } else if (lt.length >= 3 && tt.length >= 3 && getSimilarity(lt, tt) >= 0.85) {
            const currentScore = 82;
            if (currentScore > score) {
              score = currentScore;
              reason = `Single name fuzzy match "${tt}"`;
              currentRuleId = 'rule_fuzzy';
              currentRuleName = 'Rule 8: Fuzzy Typo Tolerance Match';
            }
          }
        }
      }
    }

    // C. Whole String Fuzzy Similarity (handles single letter typos e.g. Imasuen/Imasuem) - Rule 8 (Strict Partitioning)
    if (score < 80) {
      for (let vIdx = 0; vIdx < bObj.nameVariants.length; vIdx++) {
        const variant = bObj.nameVariants[vIdx];
        const targetTokens = bObj.variantTokenSets[vIdx] || [];
        const isTargetSingleName = (targetTokens.length === 1);
        const isTargetGroupOfNames = (targetTokens.length >= 2);

        // Strict Partitioning: never fuzzy match single to group or group to single
        if (isInputSingleName && !isTargetSingleName) continue;
        if (isInputGroupOfNames && !isTargetGroupOfNames) continue;

        // Skip fuzzy comparisons for short strings (length <= 2) like 'nk' to avoid false matches
        if (cleanText.length <= 2 || variant.length <= 2) {
          if (cleanText === variant) {
            score = 100;
            reason = `Exact match for "${variant}"`;
            break;
          }
          continue;
        }

        const sim = getSimilarity(cleanText, variant);
        if (sim >= 0.82) {
          const currentScore = Math.round(sim * 90);
          if (currentScore > score) {
            score = currentScore;
            reason = `Fuzzy name similarity (${Math.round(sim * 100)}%) to "${variant}"`;
            currentRuleId = 'rule_fuzzy';
            currentRuleName = 'Rule 8: Fuzzy Typo Tolerance Match';
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestB = bObj.beneficiary;
      bestReason = reason;
      bestRuleId = currentRuleId;
      bestRuleName = currentRuleName;
    }
  }

  // Threshold check (default >= 75)
  if (bestScore >= minThreshold && bestB) {
    return {
      matched: bestB,
      reason: bestReason,
      score: bestScore,
      ruleId: bestRuleId,
      ruleName: bestRuleName
    };
  }

  return {
    matched: null,
    reason: bestReason || 'No directory member match found',
    score: bestScore,
    ruleId: 'rule_none',
    ruleName: 'Unmatched'
  };
}

export interface AttendanceAutoMatchResult {
  presentMembers: Beneficiary[];
  absentMembers: Beneficiary[];
  matchedEntries: Array<{
    line: string;
    member: Beneficiary;
    reason: string;
    score: number;
    ruleId: string;
    ruleName: string;
  }>;
  discardedEntries: string[];
  duplicatePastedEntries?: Array<{
    line: string;
    member: Beneficiary;
    reason: string;
  }>;
  totalLinesProcessed: number;
  ruleBreakdown: Record<string, number>;
}

/**
 * Splits any raw text into distinct participant entries
 * Supports multi-line, numbered lines, comma-separated lists, tab-delimited spreadsheets
 */
export function splitAttendanceLines(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  const rawLines: string[] = [];
  const textLines = rawText.split(/[\r\n]+/);

  textLines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Handle spreadsheet tab-delimited rows e.g. "1\tJoy Aghedo\t08039463823"
    if (trimmed.includes('\t')) {
      const parts = trimmed.split('\t').map(p => p.trim()).filter(Boolean);
      // If one part has phone, combine name + phone
      const phonePart = parts.find(p => /\d{7,}/.test(p));
      const namePart = parts.find(p => !/\d{7,}/.test(p) && p.length >= 2 && !/^(present|absent|late)$/i.test(p));
      if (namePart) {
        rawLines.push(phonePart ? `${namePart} ${phonePart}` : namePart);
        return;
      }
    }

    // Handle multi-numbered items on a single line e.g. "1. Sis Mary 2. Bro John 3. Grace"
    const subItems = trimmed.split(/(?=\b\d{1,2}[\.\)\-]\s+[A-Za-z])/);
    if (subItems.length > 1) {
      subItems.forEach(item => {
        const itemTrimmed = item.trim();
        if (itemTrimmed) rawLines.push(itemTrimmed);
      });
      return;
    }

    // Handle comma or semicolon separated lists if not part of a single name or phone
    if ((trimmed.includes(';') || trimmed.includes(',')) && !trimmed.startsWith('[') && !/\d{4,}/.test(trimmed)) {
      const splitList = trimmed.split(/;|,/);
      splitList.forEach(item => {
        const itemTrimmed = item.trim();
        if (itemTrimmed.length >= 2) rawLines.push(itemTrimmed);
      });
      return;
    }

    rawLines.push(trimmed);
  });

  return rawLines;
}

/**
 * Complete Attendance Auto-Processor:
 * Processes raw pasted text against registered beneficiaries
 */
export function processAttendanceText(
  rawText: string,
  beneficiaries: Beneficiary[],
  minThreshold: number = 75
): AttendanceAutoMatchResult {
  const lines = splitAttendanceLines(rawText);
  const index = buildBeneficiaryIndex(beneficiaries);

  const matchedMemberIds = new Set<string>();
  const matchedEntries: Array<{
    line: string;
    member: Beneficiary;
    reason: string;
    score: number;
    ruleId: string;
    ruleName: string;
  }> = [];
  const discardedEntries: string[] = [];
  const duplicatePastedEntries: Array<{
    line: string;
    member: Beneficiary;
    reason: string;
  }> = [];
  const ruleBreakdown: Record<string, number> = {};

  lines.forEach(line => {
    // Skip general headers
    if (/^(ATTENDANCE|MEETING ATTENDANCE|DAILY MORNING DEVOTIONAL|PRAYER REGISTER|ESTHER GROUP|PEACE GROUP)/i.test(line) && line.length > 35 && !/\d{7,}/.test(line)) {
      return;
    }

    const res = matchLineToBeneficiary(line, index, minThreshold);
    if (res.matched) {
      if (!matchedMemberIds.has(res.matched.id)) {
        matchedMemberIds.add(res.matched.id);
        matchedEntries.push({
          line,
          member: res.matched,
          reason: res.reason,
          score: res.score,
          ruleId: res.ruleId,
          ruleName: res.ruleName
        });
        ruleBreakdown[res.ruleName] = (ruleBreakdown[res.ruleName] || 0) + 1;
      } else {
        // Track duplicate line pasted for an already-matched member
        duplicatePastedEntries.push({
          line,
          member: res.matched,
          reason: `Duplicate line in paste list for "${res.matched.fullName}"`
        });
      }
    } else {
      const cleanDisplay = line.replace(/^[•\-\*\+\~\✓\>#\d]+[\.\)\-\:\s]*/, '').trim();
      if (cleanDisplay.length >= 2 && !/^\d+$/.test(cleanDisplay)) {
        discardedEntries.push(cleanDisplay);
      }
    }
  });

  const presentMembers = beneficiaries.filter(b => matchedMemberIds.has(b.id));
  const absentMembers = beneficiaries.filter(b => !matchedMemberIds.has(b.id));

  return {
    presentMembers,
    absentMembers,
    matchedEntries,
    discardedEntries,
    duplicatePastedEntries,
    totalLinesProcessed: lines.length,
    ruleBreakdown
  };
}
