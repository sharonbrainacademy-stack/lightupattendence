import { jsPDF } from 'jspdf';

export interface AttendanceRuleConfig {
  serviceStartTime: string; // e.g. "05:00"
  onTimeCutoffTime: string; // e.g. "05:15"
  lateCutoffTime: string; // e.g. "06:00"
  airtimeEligibilityPercentage: number; // e.g. 75%
  minSessionsPerMonth: number; // e.g. 20
  autoAliasLearning: boolean;
  strictDuplicateCheck: boolean;
}

const ATTENDANCE_RULES_KEY = 'lu_prayer_house_attendance_rules_config_v1';

export const DEFAULT_ATTENDANCE_RULES: AttendanceRuleConfig = {
  serviceStartTime: '05:00',
  onTimeCutoffTime: '05:15',
  lateCutoffTime: '06:00',
  airtimeEligibilityPercentage: 75,
  minSessionsPerMonth: 20,
  autoAliasLearning: true,
  strictDuplicateCheck: true
};

export function getAttendanceRuleConfig(): AttendanceRuleConfig {
  try {
    const raw = localStorage.getItem(ATTENDANCE_RULES_KEY);
    if (raw) {
      return { ...DEFAULT_ATTENDANCE_RULES, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load attendance rules config:', e);
  }
  return DEFAULT_ATTENDANCE_RULES;
}

export function saveAttendanceRuleConfig(config: AttendanceRuleConfig): void {
  try {
    localStorage.setItem(ATTENDANCE_RULES_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save attendance rules config:', e);
  }
}

export interface RuleSection {
  id: string;
  category: string;
  title: string;
  badge: string;
  description: string;
  items: Array<{
    heading: string;
    detail: string;
    example?: string;
  }>;
}

export const OFFICIAL_ATTENDANCE_RULES: RuleSection[] = [
  {
    id: 'punctuality',
    category: 'Punctuality & Time Classification',
    title: 'Standard Service Timing & Punctuality Policy',
    badge: '⏰ Time Standards',
    description: 'Enforces uniform standards for classifying attendee punctuality during daily morning prayer sessions and special ministrations.',
    items: [
      {
        heading: '🟢 Present (On-Time Attendance)',
        detail: 'Members who join or record their check-in between 05:00 AM and 05:15 AM (within 15 minutes of session start). Full attendance credit is awarded towards airtime and welfare benefits.',
        example: 'Member check-in: 05:08 AM -> Marked: Present (On Time)'
      },
      {
        heading: '🟡 Late Attendance',
        detail: 'Members who join after 05:15 AM but before the formal devotional benediction (06:00 AM). Counted in total presence but flagged as late in monthly punctuality audits.',
        example: 'Member check-in: 05:24 AM -> Marked: Late'
      },
      {
        heading: '⚪ Excused Absence',
        detail: 'Members who provide official prior notification to the Group Coordinator, Prayer House leader, or Secretariat due to illness, travel, or church duty. Excused records do not penalize monthly welfare eligibility.',
        example: 'Notice received from Sis Juliet -> Marked: Excused (Prior Notice)'
      },
      {
        heading: '🔴 Unexcused Absence',
        detail: 'Members absent from the session without prior intimation. Consecutive unexcused absences trigger automated welfare and pastoral follow-up notifications.',
        example: 'No check-in or notice recorded -> Marked: Absent'
      }
    ]
  },
  {
    id: 'whatsapp_standard',
    category: 'WhatsApp Attendance Protocol',
    title: 'Standard WhatsApp Group Register Formatting',
    badge: '📱 WhatsApp Standard',
    description: 'Follow this exact format when compiling and submitting the daily prayer roll call in WhatsApp fellowship group chats for 100% instant auto-matching.',
    items: [
      {
        heading: '1. Standard Numbered List Format',
        detail: 'Use clean numbered lines with the registered member name. Adding the member phone number (in brackets or after a dash) guarantees 100% direct match even if two members have similar first names.',
        example: '1. Sis Juliet Imasuen (08065289904)\n2. Mrs Becky Ughede (07062192372)\n3. Joy Aghedo\n4. Onome Victoria'
      },
      {
        heading: '2. Name Reversals Are Fully Supported',
        detail: 'The auto-matcher recognizes Nigerian name inversions (e.g. "Aghedo Bosede" and "Bosede Aghedo" match the exact same member). You do not need to rewrite inverted names.',
        example: 'Aghedo Bosede -> Auto-matches Aghedo Bosede'
      },
      {
        heading: '3. Chat Timestamps & "Present" Tags',
        detail: 'You can copy-paste straight from WhatsApp chats. The system automatically ignores WhatsApp timestamps like "[5:30 AM, 10/13/2026]" and message trailers like ": Present" or ": Good morning".',
        example: '[5:30 AM] Joy Aghedo: Good morning, present'
      }
    ]
  },
  {
    id: 'zoom_standard',
    category: 'Zoom Video & Audio Conference Standard',
    title: 'Zoom Participant Log & Screen Name Protocol',
    badge: '🎥 Zoom Meeting Standard',
    description: 'Guidelines for Zoom participants and meeting hosts to ensure smooth automatic matching during online conferences.',
    items: [
      {
        heading: '1. Zoom Screen Name Standard',
        detail: 'Encourage members to rename their Zoom screen names from default device labels (e.g. "iPhone", "Galaxy A12") to their official first and last names before or during prayer.',
        example: 'Change "Galaxy A12" to "Juliet Imasuen"'
      },
      {
        heading: '2. Host & Co-Host Labels',
        detail: 'The system automatically removes Zoom role tags such as "(Host)", "(Co-host)", "(Me)", "(Guest)", and device suffixes like "\'s iPhone" so leaders are matched seamlessly.',
        example: 'Mrs Becky Ughede (Co-host) -> Auto-matches Mrs Becky Ughede'
      },
      {
        heading: '3. Zoom Chat Log Copy-Paste',
        detail: 'Meeting hosts can copy the entire Zoom in-meeting chat and paste it directly into the attendance processor. Lines like "05:14:02 From Joy Aghedo to Everyone: Present" are parsed accurately.',
        example: '05:14:02 From Joy Aghedo to Everyone: Present -> Matches Joy Aghedo'
      }
    ]
  },
  {
    id: 'distinction',
    category: 'Disambiguation & Aliases',
    title: 'Distinguishing Similar Names & Phone Disambiguation',
    badge: '🛡️ Disambiguation Rule',
    description: 'Rules for members with identical or similar first names (e.g., Tessy 1 vs Tessy 2, Onome Victoria vs Onome Sarah).',
    items: [
      {
        heading: '1. Include Phone Digits for Similar Names',
        detail: 'When the directory contains members with identical first names, include the phone number or last 4 digits in your attendance list to ensure the correct individual is credited.',
        example: 'Tessy (08035703992) -> Tessy (1)\nTessy (07037376660) -> Tessy (2)'
      },
      {
        heading: '2. Auto-Learned Zoom/WhatsApp Aliases',
        detail: 'When you remap an unmatched participant name in the Auto-Mark modal, the system automatically saves that screen name as an alias for that member, so they are auto-recognized in all future sessions!',
        example: 'Remapping "Mummy Joy" to "Joy AGHEDO" saves "Mummy Joy" permanently.'
      }
    ]
  },
  {
    id: 'welfare_airtime',
    category: 'Welfare & Airtime Eligibility',
    title: 'Attendance Requirements for Monthly Airtime Support',
    badge: '💎 Airtime Disbursement Policy',
    description: 'Criteria governing member qualification for monthly airtime stipends and fellowship welfare assistance.',
    items: [
      {
        heading: '1. 75% Monthly Attendance Requirement',
        detail: 'To qualify for the monthly airtime disbursement, members must achieve at least 75% verified presence (Present or Late) in the official daily devotional registers.',
        example: 'Target: At least 22 out of 30 days present per calendar month.'
      },
      {
        heading: '2. Single Session Per Date Restriction',
        detail: 'Only one primary devotional prayer session is recorded per date per fellowship group. Duplicate registers on the same date are automatically flagged and must be merged or removed.',
        example: 'Duplicate sessions on same date trigger warning notification.'
      }
    ]
  }
];

export const OFFICIAL_WHATSAPP_ATTENDANCE_TEMPLATE = `LIGHT UP PRAYER HOUSE MINISTRY
DAILY MORNING DEVOTIONAL PRAYER REGISTER
Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
Time: 05:00 AM - 06:00 AM
Fellowship Group: Esther Group Benin

ATTENDANCE REGISTER:
1. Sis Balogun (+234 805 876 2392)
2. Mrs Becky Ughede (+234 706 219 2372)
3. Sis Juliet Imasuen (+234 806 528 9904)
4. Joy Aghedo (+234 803 946 3823)
5. Onome Victoria (+234 708 570 9719)
6. Ruth Edokpayi (+234 803 676 8646)
7. Vivian Osazee (+234 803 382 1824)
8. Itohan Obasuyi (+234 813 042 4181)

(Leaders: Copy this message, paste into fellowship chat, and have attendees add their names!)`;

/**
 * Generates an official, beautifully structured PDF document of the Attendance Marking Rules
 */
export function generateAttendanceRulesPDF(): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header background banner
  doc.setFillColor(76, 29, 149); // purple-900
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(251, 191, 36); // amber-400
  doc.setFontSize(16);
  doc.text('LIGHT UP PRAYER HOUSE MINISTRY', pageWidth / 2, 16, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL ATTENDANCE MARKING RULES & PROTOCOLS', pageWidth / 2, 26, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(216, 180, 254); // purple-200
  doc.text(`Approved Operating Guidelines | Published: ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, 35, { align: 'center' });

  let y = 52;

  OFFICIAL_ATTENDANCE_RULES.forEach((sec, sIdx) => {
    // Check if new page needed
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // Section Category Banner
    doc.setFillColor(243, 232, 255); // purple-100
    doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(88, 28, 135); // purple-900
    doc.text(`${sIdx + 1}. ${sec.title.toUpperCase()}`, 16, y + 1);
    y += 10;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99); // gray-600
    const descLines = doc.splitTextToSize(sec.description, pageWidth - 32);
    doc.text(descLines, 16, y);
    y += descLines.length * 4.5 + 4;

    sec.items.forEach(item => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(17, 24, 39); // gray-900
      doc.text(`• ${item.heading}`, 18, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(55, 65, 81); // gray-700
      const detailLines = doc.splitTextToSize(item.detail, pageWidth - 40);
      doc.text(detailLines, 22, y);
      y += detailLines.length * 4 + 2;

      if (item.example) {
        doc.setFont('courier', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(107, 114, 128); // gray-500
        const egLines = doc.splitTextToSize(`Format: ${item.example.replace(/\n/g, ' | ')}`, pageWidth - 42);
        doc.text(egLines, 22, y);
        y += egLines.length * 3.5 + 4;
      }
    });

    y += 4;
  });

  // Footer on final page
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(209, 213, 219);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('Light Up Prayer House Ministry Attendance Secretariat - All Rights Reserved', pageWidth / 2, y, { align: 'center' });

  doc.save('LightUp_Attendance_Marking_Rules_Policy.pdf');
}
