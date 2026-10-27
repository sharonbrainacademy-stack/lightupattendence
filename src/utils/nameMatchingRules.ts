import { jsPDF } from 'jspdf';

export interface NameMatchingRuleDefinition {
  id: string;
  ruleNumber: number;
  name: string;
  category: 'Phone' | 'Full Name' | 'Word Order' | 'Tokens' | 'Single Name' | 'Noise Filter' | 'Typo / Fuzzy' | 'AI Remapping';
  confidence: number;
  badge: string;
  shortDescription: string;
  detailedLogic: string;
  examples: Array<{
    input: string;
    expectedOutcome: string;
    explanation: string;
  }>;
}

export const OFFICIAL_NAME_MATCHING_RULES: NameMatchingRuleDefinition[] = [
  {
    id: 'rule_phone',
    ruleNumber: 1,
    name: 'Direct Phone Number Normalization & Exact Match',
    category: 'Phone',
    confidence: 100,
    badge: '📱 100% Precision',
    shortDescription: 'Extracts Nigerian phone numbers in any format (+234, 080..., dashed, spaced, or 7-digit suffix) for direct identity resolution.',
    detailedLogic: 'Phone numbers are mathematically unambiguous identifiers. The engine normalizes phone numbers by stripping international codes (+234), dashes, parentheses, and spaces into standard 11-digit or 7-digit suffixes. When a phone matches a registered member, they are immediately matched at 100% confidence, even if their name is completely omitted or abbreviated.',
    examples: [
      {
        input: '1. Sis Balogun 08058762392',
        expectedOutcome: 'Matched: Sister Balogun AGL (+234 805 876 2392)',
        explanation: 'The phone "08058762392" maps directly to Sister Balogun with 100% confidence.'
      },
      {
        input: '07062192372 - Present',
        expectedOutcome: 'Matched: Mrs Becky Ughede (+234 706 219 2372)',
        explanation: 'Instant 100% match from raw phone number alone without typing a name.'
      },
      {
        input: '+234 806 528 9904 (Sis Juliet)',
        expectedOutcome: 'Matched: Mrs J Imasuem(Mrs Juliet Imasuen)',
        explanation: 'International prefix "+234" is normalized to 08065289904 and matched directly.'
      }
    ]
  },
  {
    id: 'rule_exact_name',
    ruleNumber: 2,
    name: 'Canonical Full Name & Inside-Bracket Alias Match',
    category: 'Full Name',
    confidence: 99,
    badge: '🏷️ 99% Exact Match',
    shortDescription: 'Matches canonical member names, inside-bracket maiden/real names, and saved Zoom/WhatsApp aliases.',
    detailedLogic: 'Many members have complex directory entries like "Mrs J Imasuem(Mrs Juliet Imasuen)" or "ngozipopoola0(Ngozi popoola)". The engine indexes both the outside name ("Mrs J Imasuem"), inside-bracket real names ("Mrs Juliet Imasuen"), and any saved aliases. Matching any variation achieves 99% confidence.',
    examples: [
      {
        input: 'Juliet Imasuen',
        expectedOutcome: 'Matched: Mrs J Imasuem(Mrs Juliet Imasuen)',
        explanation: 'Matches inside-bracket real name "Mrs Juliet Imasuen" with 99% confidence.'
      },
      {
        input: 'Ngozi popoola',
        expectedOutcome: 'Matched: ngozipopoola0(Ngozi popoola)',
        explanation: 'Matches bracketed real name inside the username string.'
      },
      {
        input: 'Joy AGHEDO',
        expectedOutcome: 'Matched: Joy AGHEDO',
        explanation: 'Case-insensitive canonical name match.'
      }
    ]
  },
  {
    id: 'rule_word_order',
    ruleNumber: 3,
    name: 'Invariant Word-Order Matching',
    category: 'Word Order',
    confidence: 96,
    badge: '🔄 96% Invariant',
    shortDescription: 'Matches names regardless of whether First Name or Surname is written first.',
    detailedLogic: 'In church registers and WhatsApp roll calls, members frequently interchange First Name and Surname (e.g. "Imasuen Juliet" instead of "Juliet Imasuen", or "Aghedo Joy" instead of "Joy Aghedo"). The engine decomposes names into canonical word tokens and verifies set equivalence regardless of word order.',
    examples: [
      {
        input: 'Imasuen Juliet',
        expectedOutcome: 'Matched: Mrs J Imasuem(Mrs Juliet Imasuen)',
        explanation: 'Surname first, First name second matches the registered record.'
      },
      {
        input: 'Aghedo Joy',
        expectedOutcome: 'Matched: Joy AGHEDO',
        explanation: 'Surname first matches canonical First Name + Surname.'
      },
      {
        input: 'Ughede Becky',
        expectedOutcome: 'Matched: Mrs Becky Ughede',
        explanation: 'Surname inverted matches canonical registered name.'
      }
    ]
  },
  {
    id: 'rule_subset_token',
    ruleNumber: 4,
    name: 'Multi-Word Subset & Middle Name Resolution',
    category: 'Tokens',
    confidence: 94,
    badge: '🧩 94% Subset Token',
    shortDescription: 'Handles members with middle names or differing token lengths between pasted text and directory.',
    detailedLogic: 'If a member is registered as "Mrs Becky Ughede" but the roll call lists "Sis Becky Joy Ughede" (or registered as "Juliet Osahon Imasuen" while pasted as "Sis Juliet Imasuen"), the token intersection algorithm detects that all primary tokens match, achieving 94% confidence.',
    examples: [
      {
        input: 'Juliet Osahon Imasuen',
        expectedOutcome: 'Matched: Mrs J Imasuem(Mrs Juliet Imasuen)',
        explanation: 'Middle name "Osahon" present in paste matches the core 2 registered tokens.'
      },
      {
        input: 'Becky Joy Ughede',
        expectedOutcome: 'Matched: Mrs Becky Ughede',
        explanation: '2 out of 3 tokens match the registered directory member.'
      }
    ]
  },
  {
    id: 'rule_key_name',
    ruleNumber: 5,
    name: 'Strict Single-to-Single & Group-to-Group Resolution ("NK" & Single Names)',
    category: 'Single Name',
    confidence: 100,
    badge: '🔑 100% Strict Single Name',
    shortDescription: 'Permits a single name to match a single name only, and a group of names a group of names only. NK is recognized as a name and always matches NK across all casing formats.',
    detailedLogic: 'To eliminate false positives, a single name (1 word) strictly matches single-name directory members only and never crosses to multi-word members. Likewise, multi-word group names match only multi-word records. "NK" is officially recognized as a distinct member name and always resolves to NK with 100% precision regardless of casing (UPPERCASE, lowercase, Sentence Case, or tOGGLE cASE).',
    examples: [
      {
        input: '1. NK',
        expectedOutcome: 'Matched: NK (+234 803 555 0199)',
        explanation: 'Uppercase "NK" maps directly to member NK with 100% confidence.'
      },
      {
        input: '2. nk - Present',
        expectedOutcome: 'Matched: NK (+234 803 555 0199)',
        explanation: 'Lowercase "nk" matches member NK case-insensitively.'
      },
      {
        input: '3. nK',
        expectedOutcome: 'Matched: NK (+234 803 555 0199)',
        explanation: 'Toggle case "nK" or sentence case "Nk" matches member NK seamlessly.'
      },
      {
        input: '4. N.K.',
        expectedOutcome: 'Matched: NK (+234 803 555 0199)',
        explanation: 'Dotted notation "N.K." is normalized to NK.'
      },
      {
        input: '5. Franca',
        expectedOutcome: 'Matched: Sister Franca GL',
        explanation: 'Single name "Franca" resolves to single-name directory member Sister Franca.'
      }
    ]
  },
  {
    id: 'rule_honorific',
    ruleNumber: 6,
    name: 'ESG Group Tag & Ministry Title Cleansing',
    category: 'Noise Filter',
    confidence: 92,
    badge: '👑 92% Title & ESG Cleaned',
    shortDescription: 'Comprehensively ignores "ESG" (either inside brackets or outside brackets after any name), group tags, and ministry titles.',
    detailedLogic: 'Members often add "ESG" or ministry designations after their names in roll calls, such as "Joy Aghedo (ESG)", "Joy Aghedo ESG", "Joy Aghedo - ESG", "Joy Aghedo, ESG", "Edith Aghedo (E.S.G.)", "Joy Aghedo (ESG Benin)", or "NK (ESG)". The matching engine strictly ignores ESG across all casing, bracketed ([ESG], (ESG), {ESG}), and unbracketed variations so it never pollutes name matching or single-to-group partitioning. Titles like "Pastor", "Pst", "Deaconess", "Sister", "Sis", "Mrs", "AGL", "GL" are also cleanly stripped.',
    examples: [
      {
        input: '1. Juliet Johnson (ESG)',
        expectedOutcome: 'Matched: Juliet Johnson',
        explanation: 'Brackets and "ESG" are ignored, leaving canonical "Juliet Johnson".'
      },
      {
        input: 'Joy Aghedo - ESG',
        expectedOutcome: 'Matched: Joy AGHEDO',
        explanation: 'Unbracketed "- ESG" is stripped, cleanly matching registered member Joy AGHEDO.'
      },
      {
        input: 'Adesuwa, ESG',
        expectedOutcome: 'Matched: Adesuwa',
        explanation: 'Comma and "ESG" are ignored without breaking single-name matching for Adesuwa.'
      },
      {
        input: 'Edith Aghedo (E.S.G.)',
        expectedOutcome: 'Matched: Edith Aghedo',
        explanation: 'Dotted bracketed "(E.S.G.)" is recognized as ESG and ignored.'
      },
      {
        input: 'Mrs Becky Ughede AGL',
        expectedOutcome: 'Matched: Mrs Becky Ughede',
        explanation: 'Both "Mrs" and "AGL" are stripped, leaving "Becky Ughede".'
      }
    ]
  },
  {
    id: 'rule_app_noise',
    ruleNumber: 7,
    name: 'Chat Transcript & Device Noise Cleanser',
    category: 'Noise Filter',
    confidence: 90,
    badge: '🧹 90% Cleaned',
    shortDescription: 'Strips Zoom participant wrappers, WhatsApp timestamps, emojis, bullets, and phone hardware tags.',
    detailedLogic: 'Meeting software adds wrappers such as "From Joy Aghedo to Everyone: Present", "Juliet\'s iPhone", "Galaxy A12", timestamps like "[5:30 AM, 10/13/2026]", numbers "1. ", bullets "•", and status notes (": Present", ": here", "Good morning"). The cleanser strips this noise so only the attendee name remains.',
    examples: [
      {
        input: 'From Joy Aghedo to Everyone: Present',
        expectedOutcome: 'Matched: Joy AGHEDO',
        explanation: 'Strips Zoom wrapper and ": Present", leaving "Joy Aghedo".'
      },
      {
        input: '[5:30 AM, 10/13/2026] Sis Juliet Imasuen: Present',
        expectedOutcome: 'Matched: Mrs J Imasuem(Mrs Juliet Imasuen)',
        explanation: 'Strips WhatsApp bracketed timestamp and ": Present".'
      },
      {
        input: "Juliet's iPhone",
        expectedOutcome: 'Matched: Juliet',
        explanation: 'Strips device suffix "\'s iPhone" leaving the member name.'
      }
    ]
  },
  {
    id: 'rule_fuzzy',
    ruleNumber: 8,
    name: 'Fuzzy Typo & Phonetic Tolerance (Levenshtein Distance)',
    category: 'Typo / Fuzzy',
    confidence: 85,
    badge: '⚡ 85% Typo Tolerant',
    shortDescription: 'Tolerates 1 to 2 character misspellings, transposition, and phonetic spelling differences.',
    detailedLogic: 'Names are frequently mistyped in phone keyboards (e.g. "Imasuem" instead of "Imasuen", or "Aghedoo" instead of "Aghedo"). The engine calculates normalized Levenshtein similarity distance. Matches with similarity score >= 82% are validated and marked with high precision.',
    examples: [
      {
        input: 'Mrs J Imasuen',
        expectedOutcome: 'Matched: Mrs J Imasuem(Mrs Juliet Imasuen)',
        explanation: '1-letter difference (n vs m) is recognized and matched with 88% confidence.'
      },
      {
        input: 'Joy Aghdo',
        expectedOutcome: 'Matched: Joy AGHEDO',
        explanation: 'Typo missing "e" is successfully matched via fuzzy distance.'
      }
    ]
  }
];

export interface NameMatchingSettings {
  confidenceThreshold: number; // default 75
  allowSingleKeyName: boolean; // default true
  strictPhoneMatch: boolean; // default true
  autoSaveAliasesOnRemap: boolean; // default true
}

const NAME_MATCHING_SETTINGS_KEY = 'lu_name_matching_rules_settings_v1';

export const DEFAULT_NAME_MATCHING_SETTINGS: NameMatchingSettings = {
  confidenceThreshold: 75,
  allowSingleKeyName: true,
  strictPhoneMatch: true,
  autoSaveAliasesOnRemap: true
};

export function getNameMatchingSettings(): NameMatchingSettings {
  try {
    const raw = localStorage.getItem(NAME_MATCHING_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_NAME_MATCHING_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load name matching settings:', e);
  }
  return DEFAULT_NAME_MATCHING_SETTINGS;
}

export function saveNameMatchingSettings(settings: NameMatchingSettings): void {
  try {
    localStorage.setItem(NAME_MATCHING_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save name matching settings:', e);
  }
}

/**
 * Generates an official PDF of the Name Matching Rules for secretaries and church admins
 */
export function generateNameMatchingRulesPDF(): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(30, 27, 75); // Deep Indigo/Purple
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setTextColor(245, 158, 11); // Gold/Amber
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LIGHT UP PRAYER HOUSE MINISTRY', pageWidth / 2, 14, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('OFFICIAL NAME MATCHING RULES & PROTOCOLS FOR ATTENDANCE', pageWidth / 2, 22, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text('Automated Intelligent Directory Matching Engine • Esther Group & Peace Group Standard', pageWidth / 2, 30, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(251, 191, 36);
  doc.text(`Document Version 2.4 • Effective: ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, 37, { align: 'center' });

  let y = 50;

  // Intro Summary Box
  doc.setFillColor(243, 244, 246);
  doc.rect(14, y, pageWidth - 28, 22, 'F');
  doc.setDrawColor(209, 213, 219);
  doc.rect(14, y, pageWidth - 28, 22, 'S');

  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SYSTEM PURPOSE & MATCHING OBJECTIVE', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('This specification outlines the 8-tier intelligent matching rules used by the Attendance Register Engine.', 18, y + 11);
  doc.text('Pastes from WhatsApp groups, Zoom chat logs, and telephone lists are parsed with zero false negatives.', 18, y + 16);

  y += 28;

  // Iterate Rules
  OFFICIAL_NAME_MATCHING_RULES.forEach((rule) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // Rule Header Card
    doc.setFillColor(238, 242, 255); // light indigo
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.setDrawColor(199, 210, 254);
    doc.rect(14, y, pageWidth - 28, 8, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(49, 46, 129);
    doc.text(`RULE ${rule.ruleNumber}: ${rule.name.toUpperCase()} (${rule.confidence}% Confidence)`, 18, y + 5.5);

    y += 11;

    // Rule Description & Logic
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    const splitDesc = doc.splitTextToSize(rule.detailedLogic, pageWidth - 36);
    doc.text(splitDesc, 18, y);
    y += splitDesc.length * 3.8 + 2;

    // Examples
    if (rule.examples && rule.examples.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text('EXAMPLES & TEST CASES:', 18, y);
      y += 4;

      rule.examples.forEach(ex => {
        doc.setFont('courier', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(17, 24, 39);
        doc.text(`• Input: "${ex.input}"`, 20, y);
        y += 3.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(4, 120, 87);
        doc.text(`  Outcome: ${ex.expectedOutcome}`, 20, y);
        y += 4;
      });
    }

    y += 4;
  });

  // Footer on last page
  if (y > 265) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text('Light Up Prayer House Ministry • Automated Attendance System • All Rights Reserved', pageWidth / 2, 285, { align: 'center' });

  doc.save('LightUpPrayerHouse_Name_Matching_Rules.pdf');
}
