import { NetworkType } from '../types';

/**
 * Detects the Nigerian telecom network provider from a phone number prefix.
 */
export function detectNigerianNetwork(phoneNumber: string): NetworkType {
  // Clean phone number: remove spaces, dashes, +234 or leading 234
  let cleaned = phoneNumber.replace(/[\s\-\+\(\)]/g, '');
  
  if (cleaned.startsWith('234')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (!cleaned.startsWith('0') && cleaned.length >= 10) {
    cleaned = '0' + cleaned;
  }

  if (cleaned.length < 4) return 'Other';

  const prefix = cleaned.substring(0, 4);
  const prefix5 = cleaned.substring(0, 5);

  // MTN Prefixes
  const mtnPrefixes = [
    '0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814',
    '0903', '0906', '0913', '0916', '0704', '07025', '07026'
  ];

  // Glo Prefixes
  const gloPrefixes = [
    '0805', '0807', '0705', '0815', '0811', '0905', '0915'
  ];

  // Airtel Prefixes
  const airtelPrefixes = [
    '0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'
  ];

  // 9Mobile Prefixes (formerly Etisalat)
  const nineMobilePrefixes = [
    '0809', '0818', '0817', '0909', '0908'
  ];

  if (mtnPrefixes.includes(prefix) || mtnPrefixes.includes(prefix5)) {
    return 'MTN';
  }
  if (gloPrefixes.includes(prefix)) {
    return 'Glo';
  }
  if (airtelPrefixes.includes(prefix)) {
    return 'Airtel';
  }
  if (nineMobilePrefixes.includes(prefix)) {
    return '9Mobile';
  }

  return 'Other';
}

/**
 * Formats a Nigerian phone number to readable 0803 123 4567 format
 */
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('234')) {
    cleaned = '0' + cleaned.substring(3);
  }
  if (cleaned.length === 11) {
    return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
  }
  return phone;
}

/**
 * Returns network brand color classes for badges & buttons
 */
export function getNetworkBadgeStyle(network: NetworkType): { bg: string; text: string; border: string; accentHex: string } {
  switch (network) {
    case 'MTN':
      return {
        bg: 'bg-amber-500/20',
        text: 'text-amber-300',
        border: 'border-amber-500/40',
        accentHex: '#f59e0b',
      };
    case 'Glo':
      return {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-300',
        border: 'border-emerald-500/40',
        accentHex: '#10b981',
      };
    case 'Airtel':
      return {
        bg: 'bg-rose-500/20',
        text: 'text-rose-300',
        border: 'border-rose-500/40',
        accentHex: '#f43f5e',
      };
    case '9Mobile':
      return {
        bg: 'bg-teal-500/20',
        text: 'text-teal-300',
        border: 'border-teal-500/40',
        accentHex: '#14b8a6',
      };
    default:
      return {
        bg: 'bg-purple-500/20',
        text: 'text-purple-300',
        border: 'border-purple-500/40',
        accentHex: '#a855f7',
      };
  }
}

/**
 * Generates Nigerian USSD Airtime Transfer dial code for 1-click mobile dialing
 */
export function getUSSDTransferCode(network: NetworkType, phone: string, amount: number): string {
  let cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('234')) {
    cleaned = '0' + cleaned.substring(3);
  }

  switch (network) {
    case 'MTN':
      return `*321*${cleaned}*${amount}*0000#`;
    case 'Glo':
      return `*131*${cleaned}*${amount}*0000#`;
    case 'Airtel':
      return `*432*1*${cleaned}*${amount}#`;
    case '9Mobile':
      return `*223*0000*${amount}*${cleaned}#`;
    default:
      return `*321*${cleaned}*${amount}#`;
  }
}

