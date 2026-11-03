import { Beneficiary } from '../types';

/**
 * Strips all hidden whitespace, non-breaking spaces (NBSP), zero-width characters,
 * byte order marks (BOM), directional formatting controls, and unprintable characters.
 * Replaces all Unicode whitespace variants with standard ASCII space and trims.
 */
export function stripHiddenWhitespace(raw: string): string {
  if (!raw) return '';

  let s = String(raw);

  // 1. Strip Zero-Width characters and BOMs:
  // \u200B (Zero-width space), \u200C (ZWNJ), \u200D (ZWJ), \uFEFF (BOM / ZWNBSP), \u2060 (Word joiner), \u00AD (Soft hyphen)
  s = s.replace(/[\u200B\u200C\u200D\uFEFF\u2060\u00AD]/g, '');

  // 2. Strip Bidirectional marks and formatting isolates:
  // \u200E (LRM), \u200F (RLM), \u202A-\u202E (embedding/override controls), \u2066-\u2069 (directional isolates)
  s = s.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');

  // 3. Map all Unicode whitespace variants to standard ASCII space:
  // \u00A0 (Non-breaking space / NBSP), \u1680 (Ogham space), \u2000-\u200A (En/Em/Thin/Hair/Quad spaces),
  // \u2028 (Line separator), \u2029 (Paragraph separator), \u202F (Narrow NBSP), \u205F (Math space), \u3000 (Ideographic space)
  s = s.replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\t\v\f]/g, ' ');

  // 4. Map smart/curly quotes & apostrophes to standard single and double ASCII quotes:
  s = s.replace(/[\u2018\u2019\u201A\u201B\u0060\u00B4\u2032\u2035]/g, "'");
  s = s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');

  // 5. Map Unicode dashes, hyphens, and minus signs to standard ASCII hyphen:
  s = s.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-');

  // 6. Strip unprintable control characters (excluding newline \r \n which are handled in line splitters):
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

  // 7. Collapse redundant spaces and trim
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Robust string normalization for attendance records:
 * - Strips hidden whitespace, zero-width chars, and non-breaking spaces
 * - Normalizes Unicode diacritics (accents)
 * - Collapses repeated whitespace into single ASCII space
 * - Trims and converts to lowercase for case-insensitive matching
 */
export function normalizeAttendanceString(raw: string): string {
  if (!raw) return '';
  const cleaned = stripHiddenWhitespace(raw);
  return cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Normalizes any phone number format (international +234, local 0..., dashes, spaces)
 * to standard Nigerian 11 digits format e.g. "08039463823"
 */
export function normalizePhone(ph: string): string {
  if (!ph) return '';
  const digits = stripHiddenWhitespace(ph).replace(/[^0-9]/g, '');
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
  if (!rawLine) return { cleanText: '', extractedPhone: '', rawLine: '' };

  // Strip hidden whitespace, zero-width characters, and non-breaking spaces first
  let line = stripHiddenWhitespace(rawLine);
  if (!line) return { cleanText: '', extractedPhone: '', rawLine: '' };

  // Normalize Unicode diacritics
  line = line.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Split CamelCase words before lowercasing (e.g. "AghedoVera" -> "Aghedo Vera")
  line = line.replace(/([a-z])([A-Z])/g, '$1 $2');

  // 1. Strip list numbering, bullets, emojis, checkboxes, hashes AT THE VERY START
  // E.g. "1.", "1 -", "1)", "1:", "•", "-", "*", "#1.", "No. 1:", "No 1 -"
  line = line.replace(/^(?:No\.?\s*\d+|\d+|[•\-\*\+\~\✓\>#])[\.\)\-\:\s]+/gi, '');
  line = line.replace(/^[•\-\*\+\~\✓\>#\s]+/g, '');

  // 2. Strip WhatsApp bracketed or unbracketed timestamps e.g. "[5:30 AM, 10/13/2026]", "10/13/2026, 05:22 -"
  line = line.replace(/^\[[^\]]+\]\s*[-–:]?\s*/, '');
  line = line.replace(/^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?\s*[-–:]?\s*/, '');
  line = line.replace(/^\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?\s*[-–:]?\s*/, '');

  // 3. Strip Zoom chat prefixes e.g. "From Joy Aghedo to Everyone: Present" -> "Joy Aghedo"
  line = line.replace(/^From\s+(.+?)\s+to\s+(?:Everyone|Me|Hosts?|Co-hosts?)(?:\s*\([^)]*\))?\s*:\s*(.*)$/i, (_m, sender, msg) => {
    if (!msg || /^(?:present|here|good morning|amen|online|attended|joined|yes|checking in|check in|available)\b/i.test(msg.trim())) {
      return sender;
    }
    return `${sender} ${msg}`;
  });
  line = line.replace(/^From\s+(.+?)\s*:\s*(.*)$/i, (_m, sender, msg) => {
    if (!msg || /^(?:present|here|good morning|amen|online|attended|joined|yes|checking in|check in|available)\b/i.test(msg.trim())) {
      return sender;
    }
    return `${sender} ${msg}`;
  });

  // 4. Strip message status suffixes e.g. ": Present", "- Present", "present", "good morning", "amen"
  line = line.replace(/^(.+?)\s*[-–:]\s*(?:present|here|good morning|amen|online|attended|joined|yes|checking in|check in|available).*$/i, '$1');
  line = line.replace(/\s+(?:present|here|good morning|amen|online|attended|joined|checking in|check in|available)\s*$/i, '');

  // 5. Strip device suffixes & hardware labels
  line = line.replace(/'s\s+(?:iPhone|phone|Android|device|iPad|tablet)/gi, ' ');
  line = line.replace(/\b(?:iPhone|Android|iPad|Galaxy|Infinix|Tecno|Redmi|Phone)\b/gi, ' ');
  line = line.replace(/\s*\((?:Host|Co-host|Host & Co-host|Me|Guest|Participant)\)/gi, ' ');
  line = line.replace(/\b(?:Host|Co-host|Host & Co-host|Guest|Participant)\b/gi, ' ');

  // 6. Comprehensive ESG, PG & Ministry Group stripping (both inside brackets AND outside brackets)
  // Inside brackets/parentheses/curlies/angles: e.g. (ESG), [ESG], {ESG}, <ESG>, (E.S.G.), (E. S. G.), (esg), (ESG Benin), (ESG-Benin), (ESG Member), (Esther Group), (Esther Group Benin), (PG), [PG], (Peace Group)
  line = line.replace(/[\(\[\{<]\s*(?:E[\.\-\s]*S[\.\-\s]*G[\.\s]*|Esther(?:\s+(?:Support|Service)?\s*Group)?|P[\.\-\s]*G[\.\s]*|Peace(?:\s+Group)?)(?:\s*[\-\/]?\s*Benin)?(?:\s+Member)?\s*[\)\]\}>]/gi, ' ');

  // Outside brackets preceded by delimiter or space: " - ESG", ", ESG", "/ESG", "_ESG", ": ESG", " ESG", " ESG Benin", " ESG Member", " - PG", ", PG", " PG"
  line = line.replace(/(?:[\s,;:\-–—/_]+)(?:E[\.\-\s]*S[\.\-\s]*G[\.\s]*|Esther\s+(?:Support\s+|Service\s+)?Group|Peace\s+Group|P[\.\-\s]*G[\.\s]*)(?:\s*[\-\/]?\s*Benin)?(?:\s+Member)?(?=$|[\s,;:\-–—/_\)\]\}>])/gi, ' ');

  // Standalone ESG / E.S.G. and PG / P.G. anywhere in the line
  line = line.replace(/\bE[\.\-\s]*S[\.\-\s]*G[\.\s]*/gi, ' ');
  line = line.replace(/\bP[\.\-\s]*G[\.\s]*/gi, ' ');
  line = line.replace(/\bEsther\s+(?:Support\s+|Service\s+)?Group(?:\s+Benin)?\b/gi, ' ');
  line = line.replace(/\bPeace\s+Group(?:\s+Benin)?\b/gi, ' ');
  line = line.replace(/(?:[\s,;:\-–—/_]+)(?:Benin|Branch|Member)(?=$|[\s,;:\-–—/_\)\]\}>])/gi, ' ');

  // 7. Extract any phone number sequence before stripping characters
  const phoneMatch = line.match(/(?:\+?234|0)[789][01]\d{8}/) || line.match(/\d{4}[\s-]?\d{3}[\s-]?\d{4}/);
  let extractedPhone = '';
  if (phoneMatch) {
    extractedPhone = normalizePhone(phoneMatch[0]);
    line = line.replace(phoneMatch[0], ' ');
  }

  // 8. Normalize all variations of "NK" (uppercase, lowercase, sentence case, toggle case, dotted "N.K.", "N K", "N-K")
  line = line.replace(/\bN[\.\-\/\s]+K\b/gi, 'NK');
  line = line.replace(/\bNK\b[\.]?/gi, 'NK');

  // 9. Strip religious and ministry honorifics/titles (with optional trailing period e.g. Sis., Bro., Pst.)
  line = line.replace(/\b(?:Pastor|Pastors|Pst|Rev|Reverend|Bishop|Apostle|Deacon|Dcn|Deaconess|Dcns|Elder|Evangelist|Evang|Minister|Min|Brother|Bro|Sister|Sis|Mrs|Mr|Miss|Mama|Madam|Mummy|Daddy|Dr|Engr|Barr|Chief|LPH|AGL|GL)\b[\.]?/gi, ' ');

  // 10. Strip status keywords & meeting greetings
  line = line.replace(/\b(?:Present|Absent|Late|Excused|Attended|Here|Online|Zoom|WhatsApp|Checked in|Morning Devotional|Daily Prayer|Prayer|Amen|Good morning)\b/gi, ' ');

  // 11. Normalize whitespace and remove remaining non-alphanumeric punctuation (ensures case-insensitivity)
  line = line.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  return { cleanText: line, extractedPhone, rawLine };
}

/**
 * Calculates Jaro distance between two strings (0.0 to 1.0)
 */
export function getJaroDistance(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  const l1 = s1.length;
  const l2 = s2.length;
  if (l1 === 0 || l2 === 0) return 0.0;

  const matchDistance = Math.floor(Math.max(l1, l2) / 2) - 1;
  const s1Matches = new Array(l1).fill(false);
  const s2Matches = new Array(l2).fill(false);

  let matches = 0;
  for (let i = 0; i < l1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, l2);
    for (let j = start; j < end; j++) {
      if (!s2Matches[j] && s1[i] === s2[j]) {
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return 0.0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < l1; i++) {
    if (s1Matches[i]) {
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
  }

  return (
    (matches / l1 + matches / l2 + (matches - transpositions / 2) / matches) / 3.0
  );
}

/**
 * Calculates Jaro-Winkler similarity (0.0 to 1.0), applying a prefix bonus
 * for names sharing initial characters (ideal for human names and typos).
 */
export function getJaroWinklerSimilarity(s1: string, s2: string): number {
  const jaro = getJaroDistance(s1, s2);
  if (jaro < 0.65) return jaro;

  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1.0 - jaro);
}

/**
 * Calculates Levenshtein string similarity score between 0.0 and 1.0
 */
export function getLevenshteinSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  const l1 = s1.length;
  const l2 = s2.length;
  const maxLen = Math.max(l1, l2);
  if (maxLen === 0) return 1.0;

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
  return (maxLen - distance) / maxLen;
}

/**
 * Combined Best Similarity: takes the maximum score between Jaro-Winkler and Levenshtein.
 * Highly robust against transpositions, prefixes, suffix omissions, and phonetic typos.
 */
export function getSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  const jw = getJaroWinklerSimilarity(s1, s2);
  const lev = getLevenshteinSimilarity(s1, s2);
  return Math.max(jw, lev);
}

/**
 * Evaluates whether two single tokens match under fuzzy similarity criteria
 * Handles:
 * - Exact match
 * - Prefix containment for tokens with length >= 4 (e.g. "julie" and "juliet")
 * - Typo tolerance via Jaro-Winkler / Levenshtein similarity >= threshold
 */
export function isFuzzyTokenMatch(
  tokenA: string,
  tokenB: string,
  threshold: number = 0.80
): boolean {
  if (!tokenA || !tokenB) return false;
  if (tokenA === tokenB) return true;

  // Protect very short tokens like "nk" or initials from false fuzzy matches
  if (tokenA.length <= 2 || tokenB.length <= 2) {
    return tokenA === tokenB;
  }

  // Prefix match for tokens with length >= 4 (e.g. "julie" vs "juliet")
  if (tokenA.length >= 4 && tokenB.length >= 4) {
    if (tokenA.startsWith(tokenB) || tokenB.startsWith(tokenA)) {
      return true;
    }
  }

  const maxLen = Math.max(tokenA.length, tokenB.length);
  const lev = getLevenshteinSimilarity(tokenA, tokenB);
  const levDist = Math.round((1 - lev) * maxLen);

  // Prevent false matches between completely different words sharing short prefix (e.g. stefan vs stella)
  if (maxLen <= 4 && levDist > 1) return false;
  if (maxLen <= 6 && levDist > 2) return false;
  if (maxLen <= 8 && levDist > 3) return false;

  const sim = getSimilarity(tokenA, tokenB);
  if (sim >= threshold) return true;

  if (maxLen >= 4) {
    if (maxLen <= 6 && levDist <= 1) return true;
    if (maxLen >= 7 && levDist <= 2) return true;
  }

  return false;
}

export interface BeneficiaryIndexItem {
  beneficiary: Beneficiary;
  nameVariants: string[];
  variantTokenSets: string[][];
  compactSignatures: string[];
  phone: string;
  shortPhone: string;
  isSingleName: boolean;
  isGroupOfNames: boolean;
  tokenCount: number;
}

/**
 * Splits camelCase or PascalCase names into spaced words
 * e.g. "AghedoVera" -> ["aghedo", "vera"]
 */
export function splitConcatenatedName(str: string): string[] {
  if (!str) return [];
  const camel = str.replace(/([a-z])([A-Z])/g, '$1 $2');
  return camel.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
}

/**
 * Indexes beneficiaries with all potential name variations (bracket aliases, Zoom names, WhatsApp display names, titles, compact forms)
 */
export function buildBeneficiaryIndex(beneficiaries: Beneficiary[]): BeneficiaryIndexItem[] {
  return (beneficiaries || []).map(b => {
    const rawFullName = stripHiddenWhitespace(b?.fullName || '').trim();
    const bName = rawFullName;
    const bPhone = normalizePhone(b?.phoneNumber || '');
    const bShortPhone = bPhone.length >= 7 ? bPhone.slice(-7) : bPhone;

    // Extract inside-bracket aliases e.g. "Mrs J Imasuem(Mrs Juliet Imasuen)" -> "Mrs Juliet Imasuen"
    // Strictly ignore ESG, Esther Group, or Peace Group bracketed tags
    const insideAliases: string[] = [];
    const bracketMatches = Array.from(bName.matchAll(/[\(\[]([^\)\]]+)[\)\]]/g));
    bracketMatches.forEach(m => {
      const insideText = stripHiddenWhitespace(m[1] || '').trim();
      const isGroupTag = /^(?:E[\.\-\s]*S[\.\-\s]*G[\.\s]*|Esther(?:\s+(?:Support|Service)?\s*Group)?|P[\.\-\s]*G[\.\s]*|Peace(?:\s+Group)?)(?:\s*[\-\/]?\s*Benin)?(?:\s+Member)?$/i.test(insideText);
      if (insideText && !isGroupTag) {
        insideAliases.push(insideText);
      }
    });
    const outsideName = stripHiddenWhitespace(bName.replace(/[\(\[][^\)\]]*[\)\]]/g, ' ')).trim();

    const nameVariants: string[] = [];
    const addVariant = (raw: string) => {
      if (!raw) return;
      const stripped = stripHiddenWhitespace(raw);
      const cleaned = cleanPastedLine(stripped).cleanText;
      if (cleaned && !nameVariants.includes(cleaned)) {
        nameVariants.push(cleaned);
      }
      // Also add version with trailing numbers stripped (e.g. "georgeumoh129" -> "georgeumoh", "fehioriemen5" -> "fehioriemen")
      const noDigits = cleaned.replace(/\d+/g, '').trim();
      if (noDigits && noDigits !== cleaned && !nameVariants.includes(noDigits)) {
        nameVariants.push(noDigits);
      }
    };

    if (outsideName) addVariant(outsideName);
    insideAliases.forEach(a => addVariant(a));
    addVariant(bName);
    if (b?.zoomName) addVariant(b.zoomName);
    if (b?.whatsappName) addVariant(b.whatsappName);
    if (Array.isArray(b?.aliases)) {
      b.aliases.forEach(a => addVariant(a));
    }

    // Split camel case words if any (e.g. "AghedoVera" -> "aghedo vera", "Joyfashionworld" -> "joy fashion world")
    const camelSplit = splitConcatenatedName(bName).join(' ');
    if (camelSplit && camelSplit !== bName.toLowerCase()) {
      addVariant(camelSplit);
    }

    // Determine whether the beneficiary's registered name is a Single Name or a Group of Names:
    // We clean the registered full name (stripping titles, ESG/PG, brackets)
    const baseName = outsideName || bName;
    const baseTokens = cleanPastedLine(baseName).cleanText.split(' ').filter(t => t.length >= 1);
    const finalTokens = baseTokens.length > 0 ? baseTokens : cleanPastedLine(bName).cleanText.split(' ').filter(t => t.length >= 1);
    const tokenCount = finalTokens.length;
    const isSingleName = (tokenCount === 1);
    const isGroupOfNames = (tokenCount >= 2);

    // Keep all tokens of length >= 1 so initials like "J" in "J Imasuem" are not discarded
    const variantTokenSets = nameVariants.map(v => v.split(' ').filter(t => t.length >= 1));

    // Compact alpha signature without spaces/numbers (e.g. "beckyughede", "aghedovera", "georgeumoh")
    const compactSignatures = nameVariants.map(v => v.replace(/[^a-z0-9]/g, ''));

    return {
      beneficiary: b,
      nameVariants,
      variantTokenSets,
      compactSignatures,
      phone: bPhone,
      shortPhone: bShortPhone,
      isSingleName,
      isGroupOfNames,
      tokenCount
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
 * 3. "NK" is recognized as a distinctive name and always matches to "NK".
 * 4. Matching is case-insensitive (UPPERCASE, lowercase, Sentence Case, tOGGLE cASE).
 * 5. Uses fuzzy similarity thresholds rather than rigid strict equality to tolerate typos.
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

  const lineTokens = cleanText.split(' ').filter(t => t.length >= 1);
  const isInputSingleName = (lineTokens.length === 1);
  const isInputGroupOfNames = (lineTokens.length >= 2);
  const lineCompact = cleanText.replace(/[^a-z0-9]/g, '');

  // Priority: "NK" is a distinctive single name and must always match to "NK"
  // Strictly matches only member NK across any casing (NK, nk, Nk, nK, N.K., N K, N-K)
  // NK must never match multi-word names like "Sister Nk Peace"
  if (cleanText === 'nk' || (isInputSingleName && lineTokens[0] === 'nk')) {
    const nkMatch = index.find(bObj => 
      bObj.isSingleName && (
        bObj.nameVariants.some(v => v === 'nk') || 
        bObj.beneficiary.fullName.trim().toLowerCase() === 'nk'
      )
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
    // CRITICAL USER MANDATE:
    // 1. A single name matches a single name ONLY.
    // 2. A group of names matches a group of names ONLY.
    // 3. A single name should NOT mark a group name ignoring title, ESG, PG.
    if (isInputSingleName && bObj.isGroupOfNames) {
      continue; // Strictly forbidden: single name cannot mark a group name!
    }
    if (isInputGroupOfNames && bObj.isSingleName) {
      continue; // Strictly forbidden: group of names cannot mark a single name!
    }

    let score = 0;
    let reason = '';
    let currentRuleId = 'rule_none';
    let currentRuleName = 'Unmatched';

    // A. Full Name & Inside-Bracket Alias Match (Exact 99%, or Similarity Threshold >= 0.88 -> 95%)
    for (const variant of bObj.nameVariants) {
      if (cleanText === variant) {
        score = 99;
        reason = `Exact name match "${variant}"`;
        currentRuleId = 'rule_exact_name';
        currentRuleName = 'Rule 2: Full Name & Alias Match';
        break;
      } else if (cleanText.length >= 5 && variant.length >= 5) {
        const sim = getSimilarity(cleanText, variant);
        if (sim >= 0.88) {
          const simScore = Math.round(sim * 97);
          if (simScore > score) {
            score = simScore;
            reason = `High similarity name match (${Math.round(sim * 100)}%) with "${variant}"`;
            currentRuleId = 'rule_exact_name';
            currentRuleName = 'Rule 2: Full Name Fuzzy Match';
          }
        }
      }
    }

    // B. Compact / No-Space Normalized Match - Rule 2B (98% exact, >= 0.86 fuzzy)
    // Handles directory names stored without spaces vs pasted real names with spaces
    // e.g. "Aghedo Vera" vs "AghedoVera", "Joy Fashion World" vs "Joyfashionworld", "George Umoh" vs "georgeumoh129"
    if (score < 98 && lineCompact.length >= 4) {
      for (const sig of bObj.compactSignatures) {
        if (!sig || sig.length < 4) continue;
        if (lineCompact === sig) {
          score = 98;
          reason = `Compact name match "${sig}"`;
          currentRuleId = 'rule_compact_name';
          currentRuleName = 'Rule 2B: Compact Username & No-Space Match';
          break;
        }
        // Reversed tokens compact (e.g. "Vera Aghedo" -> "veraaghedo" vs "aghedovera")
        if (isInputGroupOfNames) {
          const revCompact = [...lineTokens].reverse().join('').replace(/[^a-z0-9]/g, '');
          if (revCompact === sig) {
            score = 97;
            reason = `Reversed compact name match "${sig}"`;
            currentRuleId = 'rule_compact_name';
            currentRuleName = 'Rule 2B: Compact Username & No-Space Match';
            break;
          }
        }
        // Compact fuzzy similarity threshold
        const compSim = getSimilarity(lineCompact, sig);
        if (compSim >= 0.86) {
          const compScore = Math.round(compSim * 95);
          if (compScore > score) {
            score = compScore;
            reason = `Fuzzy compact name match (${Math.round(compSim * 100)}%) with "${sig}"`;
            currentRuleId = 'rule_compact_name';
            currentRuleName = 'Rule 2B: Compact Username & No-Space Match';
          }
        }
      }
    }

    // C. Token Matching (Word-order independent, subset, and single distinctive name) - Rules 3, 4, 5
    if (score < 90 && lineTokens.length >= 1) {
      for (const targetTokens of bObj.variantTokenSets) {
        if (targetTokens.length === 0) continue;

        // CASE 1: Group of Names vs Group of Names (2+ tokens on both sides)
        if (isInputGroupOfNames && targetTokens.length >= 2) {
          let matchCount = 0;
          for (const tt of targetTokens) {
            const hasMatch = lineTokens.some(lt => isFuzzyTokenMatch(lt, tt, 0.78));
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
        // CASE 2: Single Name vs Single Name (1 token on both sides)
        else if (isInputSingleName && targetTokens.length === 1) {
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
          } else if (lt !== 'nk' && tt !== 'nk') {
            // Fuzzy similarity threshold for single name
            if (isFuzzyTokenMatch(lt, tt, 0.78)) {
              const sim = getSimilarity(lt, tt);
              const currentScore = Math.round(sim * 90);
              if (currentScore > score) {
                score = currentScore;
                reason = `Single name fuzzy match (${Math.round(sim * 100)}%) "${tt}"`;
                currentRuleId = 'rule_fuzzy';
                currentRuleName = 'Rule 8: Fuzzy Typo Tolerance Match';
              }
            }
          }
        }
      }
    }

    // D. Whole String Fuzzy Similarity (handles single letter typos e.g. Imasuen/Imasuem) - Rule 8
    if (score < 80) {
      for (const variant of bObj.nameVariants) {
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
        if (sim >= 0.78) {
          const currentScore = Math.round(sim * 100);
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
  const cleanedText = stripHiddenWhitespace(rawText);
  const textLines = cleanedText.split(/[\r\n\u2028\u2029]+/);

  textLines.forEach(line => {
    const trimmed = stripHiddenWhitespace(line).trim();
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

    // Handle multi-numbered items on a single line e.g. "1. Sis Mary 2. Bro John 3. Grace" or "1. Joy 2. [5:30] Helen"
    const subItems = trimmed.split(/(?=\b\d{1,2}[\.\)\-]\s+\S)/);
    if (subItems.length > 1) {
      subItems.forEach(item => {
        const itemTrimmed = item.trim();
        if (itemTrimmed) rawLines.push(itemTrimmed);
      });
      return;
    }

    // Protect commas inside dates (e.g. "10/26/2026, 05:30") or Zoom headers or before ESG/tags/status
    const withoutLeadingNum = trimmed.replace(/^(?:No\.?\s*\d+|\d+|[•\-\*\+\~\✓\>#])[\.\)\-\:\s]+/gi, '').trim();
    const isWhatsAppLine = /^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}[,\s]+\d{1,2}:\d{2}/.test(withoutLeadingNum) || /^\[[^\]]+\]/.test(withoutLeadingNum);
    const isZoomLine = /^From\s+.+?\s+(?:to|:)/i.test(withoutLeadingNum);

    // If comma is followed by ESG / tags / status / honorifics (e.g. "Joy Aghedo, ESG" or "Joy Aghedo, Present"), replace comma with space so line stays intact
    const sanitizedCommas = trimmed.replace(/,\s*(?:E[\.\-\s]*S[\.\-\s]*G|Esther|P[\.\-\s]*G|Peace|Present|Absent|Late|GL|AGL|LPH)\b/gi, ' ');

    // Handle comma or semicolon separated lists of multiple participants (e.g. "Joy Aghedo (ESG), Juliet Johnson (ESG)")
    if (!isWhatsAppLine && !isZoomLine && (sanitizedCommas.includes(';') || sanitizedCommas.includes(',')) && !sanitizedCommas.startsWith('[') && !/\d{4,}/.test(sanitizedCommas)) {
      const splitList = sanitizedCommas.split(/;|,/);
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
