/**
 * Receipt & Formatting utilities for Light Up Prayer House Family Outreach
 */

export function generateReceiptNumber(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  // 4 random uppercase alphanumeric chars
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LU-${year}${month}${day}-${rand}`;
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('NGN', '₦');
}

export const SCRIPTURE_QUOTES = [
  {
    verse: "James 1:17",
    text: "Every good gift and every perfect gift is from above, and cometh down from the Father of lights, with whom is no variableness, neither shadow of turning."
  },
  {
    verse: "Matthew 10:8",
    text: "Heal the sick, cleanse the lepers, raise the dead, cast out devils: freely ye have received, freely give."
  },
  {
    verse: "Proverbs 19:17",
    text: "He that hath pity upon the poor lendeth unto the LORD; and that which he hath given will he pay him again."
  },
  {
    verse: "Galatians 6:9",
    text: "And let us not be weary in well doing: for in due season we shall reap, if we faint not."
  }
];

export function buildWhatsAppShareText(record: {
  receiptNo: string;
  beneficiaryName: string;
  phoneNumber: string;
  amount: number;
  network: string;
  purpose: string;
  distributionDate: string;
  distributedBy: string;
}): string {
  const message = `*LIGHT UP PRAYER HOUSE • FAMILY OUTREACH*
_Airtime Distribution Official Receipt_

*Receipt No:* ${record.receiptNo}
*Beneficiary:* ${record.beneficiaryName} (${record.phoneNumber})
*Network:* ${record.network}
*Amount Sent:* ${formatNaira(record.amount)}
*Purpose:* ${record.purpose}
*Date:* ${record.distributionDate}
*Distributed By:* ${record.distributedBy}

_"Every good gift and every perfect gift is from above..." — James 1:17_

*Tagline:* We Move By Fire — Pray • Believe • Rise • Overcome
_Official Ministry Transparency Record_`;

  return encodeURIComponent(message);
}
