import { AirtimeRecord, AuditLog, Beneficiary } from '../types';

// Crisp inline mock airtime transaction screenshot evidence SVG data URLs
const createSampleEvidenceSVG = (amount: string, network: string, ref: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" rx="16" fill="#0f172a"/>
    <rect x="20" y="20" width="360" height="260" rx="12" fill="#1e1b4b" stroke="#a855f7" stroke-width="2"/>
    <circle cx="200" cy="60" r="24" fill="#f59e0b"/>
    <text x="200" y="66" font-family="sans-serif" font-weight="bold" font-size="18" fill="#1e1b4b" text-anchor="middle">✓</text>
    <text x="200" y="105" font-family="sans-serif" font-weight="bold" font-size="16" fill="#fef08a" text-anchor="middle">AIRTIME TRANSFER SUCCESSFUL</text>
    <text x="200" y="130" font-family="sans-serif" font-size="12" fill="#cbd5e1" text-anchor="middle">LIGHT UP PRAYER HOUSE OUTREACH</text>
    <line x1="40" y1="145" x2="360" y2="145" stroke="#3730a3" stroke-dasharray="4"/>
    <text x="50" y="175" font-family="sans-serif" font-size="13" fill="#94a3b8">Network Provider:</text>
    <text x="350" y="175" font-family="sans-serif" font-weight="bold" font-size="13" fill="#fbbf24" text-anchor="end">${network}</text>
    <text x="50" y="200" font-family="sans-serif" font-size="13" fill="#94a3b8">Amount Disbursed:</text>
    <text x="350" y="200" font-family="sans-serif" font-weight="bold" font-size="15" fill="#4ade80" text-anchor="end">${amount}</text>
    <text x="50" y="225" font-family="sans-serif" font-size="13" fill="#94a3b8">Transaction Ref:</text>
    <text x="350" y="225" font-family="monospace" font-size="12" fill="#e2e8f0" text-anchor="end">${ref}</text>
    <rect x="40" y="245" width="320" height="24" rx="6" fill="#312e81"/>
    <text x="200" y="261" font-family="sans-serif" font-size="11" fill="#fef08a" text-anchor="middle">Verified Ministry Record • Audit Evidence Preserved</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const INITIAL_SAMPLE_RECORDS: AirtimeRecord[] = [
  {
    id: 'rec-001',
    receiptNo: 'LU-20260918-78A1',
    beneficiaryName: 'Sister Balogun AGL',
    phoneNumber: '+234 805 876 2392',
    network: 'Glo',
    amount: 2000,
    purpose: 'Esther Group Benin',
    distributionDate: '2026-09-18',
    distributionTime: '06:30',
    distributedBy: 'Bro Stephen',
    notes: 'Assistant Group Leader (AGL) airtime support',
    evidenceUrl: createSampleEvidenceSVG('₦2,000.00', 'Globacom', 'GLO-TRX-982314'),
    evidenceName: 'glo_transfer_proof.png',
    evidenceType: 'image',
    status: 'Verified',
    createdAt: '2026-09-18T06:30:00.000Z',
    updatedAt: '2026-09-18T06:30:00.000Z',
  },
  {
    id: 'rec-002',
    receiptNo: 'LU-20260917-45B9',
    beneficiaryName: 'Sister Franca GL',
    phoneNumber: '+234 805 416 5776',
    network: 'Glo',
    amount: 2000,
    purpose: 'Esther Group Benin',
    distributionDate: '2026-09-17',
    distributionTime: '06:15',
    distributedBy: 'Bro Stephen',
    notes: 'Group Leader (GL) airtime support',
    evidenceUrl: createSampleEvidenceSVG('₦2,000.00', 'Globacom', 'GLO-TXN-442109'),
    evidenceName: 'glo_transfer_gl.png',
    evidenceType: 'image',
    status: 'Verified',
    createdAt: '2026-09-17T06:15:00.000Z',
    updatedAt: '2026-09-17T06:15:00.000Z',
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-001',
    timestamp: '2026-09-18T06:30:00.000Z',
    user: 'Bro Stephen (Admin)',
    role: 'Admin',
    action: 'CREATE',
    details: 'Loaded official Esther Group Benin Daily Prayer Meeting attendance register (108 members)'
  }
];

export const INITIAL_REGISTERED_BENEFICIARIES: Beneficiary[] = [
  // Leaders / Key Contacts - Esther Group Benin
  {
    id: 'ebm-001',
    fullName: 'Sister Balogun AGL',
    phoneNumber: '+234 805 876 2392',
    network: 'Glo',
    category: 'Esther Group Benin',
    defaultAmount: 2000,
    notes: 'Assistant Group Leader (AGL) - Esther Group Benin',
    totalReceivedAmount: 2000,
    totalTransfersCount: 1,
    lastDisbursedDate: '2026-09-18',
    createdAt: '2026-09-01T06:00:00.000Z'
  },
  {
    id: 'ebm-002',
    fullName: 'Sister Franca GL',
    phoneNumber: '+234 805 416 5776',
    network: 'Glo',
    category: 'Esther Group Benin',
    defaultAmount: 2000,
    notes: 'Group Leader (GL) - Esther Group Benin',
    totalReceivedAmount: 2000,
    totalTransfersCount: 1,
    lastDisbursedDate: '2026-09-17',
    createdAt: '2026-09-01T06:00:00.000Z'
  },
  {
    id: 'ebm-003',
    fullName: 'Bro Bright LPH',
    phoneNumber: '+234 815 921 3774',
    network: 'Glo',
    category: 'Esther Group Benin',
    defaultAmount: 2000,
    notes: 'LPH Coordinator - Esther Group Benin',
    totalReceivedAmount: 0,
    totalTransfersCount: 0,
    createdAt: '2026-09-01T06:00:00.000Z'
  },
  {
    id: 'ebm-004',
    fullName: 'Gift Stephen',
    phoneNumber: '+234 701 487 3360',
    network: 'Airtel',
    category: 'Esther Group Benin',
    defaultAmount: 1000,
    notes: 'Esther Group Benin Member',
    totalReceivedAmount: 0,
    totalTransfersCount: 0,
    createdAt: '2026-09-01T06:00:00.000Z'
  },

  // Section 1
  { id: 'ebm-005', fullName: 'Mrs Becky Ughede', phoneNumber: '+234 706 219 2372', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-006', fullName: 'Adesuwa', phoneNumber: '+234 805 133 8865', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-007', fullName: 'AGHEDO', phoneNumber: '+234 803 610 7329', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-008', fullName: 'Aghedo Bosede', phoneNumber: '+234 803 083 6323', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-009', fullName: 'Aghedo Helen', phoneNumber: '+234 901 560 0393', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-010', fullName: 'AghedoVera', phoneNumber: '+234 901 672 3322', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-011', fullName: 'azvictoria09', phoneNumber: '+234 915 741 9381', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-012', fullName: 'BB Beauty fashion', phoneNumber: '+234 705 438 7963', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-013', fullName: 'beckyosayande', phoneNumber: '+234 705 851 8588', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-014', fullName: 'Bernice Ehi', phoneNumber: '+234 807 138 6243', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-015', fullName: 'Bettybutter', phoneNumber: '+234 915 350 8244', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-016', fullName: 'Big Fred', phoneNumber: '+234 704 749 1232', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-017', fullName: 'Crown', phoneNumber: '+234 905 317 8546', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-018', fullName: 'David', phoneNumber: '+234 805 941 1500', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-019', fullName: 'Deaconess Adj', phoneNumber: '+234 814 359 0668', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-020', fullName: 'Deborah Orno f', phoneNumber: '+234 805 617 9712', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-021', fullName: 'Dee', phoneNumber: '+234 808 527 3362', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-022', fullName: 'divine omoruyi', phoneNumber: '+234 812 063 0113', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-023', fullName: 'dominos', phoneNumber: '+234 906 553 5791', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-024', fullName: 'Edith Aghedo', phoneNumber: '+234 803 242 4902', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-025', fullName: 'editharewa', phoneNumber: '+234 813 578 5234', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-026', fullName: 'Efosa Osarenk', phoneNumber: '+234 802 334 2339', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },

  // Section 2
  { id: 'ebm-027', fullName: 'Eha Stitches', phoneNumber: '+234 706 774 4763', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-028', fullName: 'fehioriemen5', phoneNumber: '+234 802 072 9753', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-029', fullName: 'fimolemen', phoneNumber: '+234 814 502 6763', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-030', fullName: 'Florence', phoneNumber: '+234 802 754 0490', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-031', fullName: 'georgeumoh129', phoneNumber: '+234 705 280 7330', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-032', fullName: 'Gift', phoneNumber: '+234 902 588 0843', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-033', fullName: 'HABIBI', phoneNumber: '+234 802 977 9821', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-034', fullName: 'Idiy izuafa', phoneNumber: '+234 803 358 2504', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-035', fullName: 'Itohan Obasuyi', phoneNumber: '+234 813 042 4181', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-036', fullName: 'jenniferamabock', phoneNumber: '+234 705 612 3421', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-037', fullName: 'Joy AGHEDO', phoneNumber: '+234 803 946 3823', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-038', fullName: 'Joyfashionworld', phoneNumber: '+234 806 608 7482', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-039', fullName: 'Juliet Johnson', phoneNumber: '+234 806 645 8277', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-040', fullName: 'Lilian', phoneNumber: '+234 807 235 3076', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-041', fullName: 'Lopez', phoneNumber: '+234 913 806 0659', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-042', fullName: 'loveth osazee', phoneNumber: '+234 803 893 2445', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-043', fullName: 'Max Glamour', phoneNumber: '+234 905 557 5567', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-044', fullName: 'MERCY AGHE', phoneNumber: '+234 813 811 1034', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-045', fullName: 'mercy Brown', phoneNumber: '+234 810 422 8455', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-046', fullName: 'motolaniadew', phoneNumber: '+234 808 142 2924', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-047', fullName: 'Mrs Ajayi', phoneNumber: '+234 802 951 8326', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-048', fullName: 'Mrs J Imasuem(Mrs Juliet Imasuen)', phoneNumber: '+234 806 528 9904', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-049', fullName: 'MRS Osarieme', phoneNumber: '+234 808 044 9190', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-050', fullName: 'ngozipopoola0(Ngozi popoola)', phoneNumber: '+234 815 871 8276', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-051', fullName: 'Nicz', phoneNumber: '+234 915 317 6077', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-052', fullName: 'odperfect hairl', phoneNumber: '+234 916 315 5048', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-053', fullName: 'Olalekan Adelaja', phoneNumber: '+234 813 900 0152', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-054', fullName: 'olayinka adegb', phoneNumber: '+234 907 487 5233', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-055', fullName: 'Onome Sarah', phoneNumber: '+234 704 735 5202', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-056', fullName: 'onome Victoria', phoneNumber: '+234 708 570 9719', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },

  // Section 3
  { id: 'ebm-057', fullName: 'orsbi fashion', phoneNumber: '+234 703 258 7763', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-058', fullName: 'OS THRIFT', phoneNumber: '+234 805 596 7818', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-059', fullName: 'osamaidowu44', phoneNumber: '+234 902 624 2643', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-060', fullName: 'osaretin joyce', phoneNumber: '+234 915 165 1440', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-061', fullName: 'Osariemen Ade', phoneNumber: '+234 703 127 8661', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-062', fullName: 'Osas', phoneNumber: '+234 699 699 7454', network: 'Other', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-063', fullName: 'Osas Amen', phoneNumber: '+234 805 306 6087', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-064', fullName: 'Osaseri Rita', phoneNumber: '+234 703 500 2724', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-065', fullName: 'osayiosuila', phoneNumber: '+234 803 333 5114', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-066', fullName: 'Patience Akhig', phoneNumber: '+234 704 400 4051', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-067', fullName: 'patriciaeogh', phoneNumber: '+234 805 591 4730', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-068', fullName: 'PRAISE ROYAL', phoneNumber: '+234 901 448 4860', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-069', fullName: 'Prechilala', phoneNumber: '+234 810 362 2875', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-070', fullName: 'Precious', phoneNumber: '+234 703 303 5041', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-071', fullName: 'Precious Ishaya', phoneNumber: '+234 708 927 3111', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-072', fullName: 'preshy haven', phoneNumber: '+234 812 624 1139', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-073', fullName: 'Regina', phoneNumber: '+234 707 186 9422', network: '9Mobile', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-074', fullName: 'RITA CASH', phoneNumber: '+234 805 907 6399', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-075', fullName: 'Ruth Edokpayi', phoneNumber: '+234 803 676 8646', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-076', fullName: 'silenternest92', phoneNumber: '+234 815 426 1587', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-077', fullName: 'Soniaberry', phoneNumber: '+234 915 946 0366', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-078', fullName: 'Splendor', phoneNumber: '+234 703 421 1189', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-079', fullName: 'Stephen Moses', phoneNumber: '+234 706 685 1455', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-080', fullName: 'susanomorgb', phoneNumber: '+234 807 525 3552', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-081', fullName: 'Tessy (1)', phoneNumber: '+234 803 570 3992', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-082', fullName: 'Tessy (2)', phoneNumber: '+234 703 737 6660', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-083', fullName: 'Esther Group Member', phoneNumber: '+234 813 883 9568', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-084', fullName: 'ugborugbo Stella', phoneNumber: '+234 805 651 2776', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-085', fullName: 'Uyinmwen Irobun(Uyinmwen Irob)', phoneNumber: '+234 706 156 3603', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-086', fullName: 'vickyovickyvick', phoneNumber: '+234 808 242 2360', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },

  // Section 4
  { id: 'ebm-087', fullName: 'Vivian Osazee', phoneNumber: '+234 803 382 1824', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-088', fullName: 'WHIZZYBRO', phoneNumber: '+234 812 112 6842', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-089', fullName: 'Xhantel Irowa', phoneNumber: '+234 813 042 4110', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-090', fullName: 'Zemen', phoneNumber: '+234 806 948 7752', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },

  // Unnamed phone numbers
  { id: 'ebm-091', fullName: 'Member 0803 872 2341', phoneNumber: '+234 803 872 2341', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-092', fullName: 'Member 0704 117 3903', phoneNumber: '+234 704 117 3903', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-093', fullName: 'Member 0805 506 9584', phoneNumber: '+234 805 506 9584', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-094', fullName: 'Member 0803 817 1091', phoneNumber: '+234 803 817 1091', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-095', fullName: 'Member 0806 257 3036', phoneNumber: '+234 806 257 3036', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-096', fullName: 'Member 0806 559 5681', phoneNumber: '+234 806 559 5681', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-097', fullName: 'Member 0807 645 2522', phoneNumber: '+234 807 645 2522', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-098', fullName: 'Member 0807 718 1743', phoneNumber: '+234 807 718 1743', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-099', fullName: 'Member 0808 310 0962', phoneNumber: '+234 808 310 0962', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-100', fullName: 'Member 0810 121 8674', phoneNumber: '+234 810 121 8674', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-101', fullName: 'Member 0810 583 5266', phoneNumber: '+234 810 583 5266', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-102', fullName: 'Member 0811 407 6300', phoneNumber: '+234 811 407 6300', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-103', fullName: 'Member 0811 539 2080', phoneNumber: '+234 811 539 2080', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-104', fullName: 'Member 0815 863 7460', phoneNumber: '+234 815 863 7460', network: 'Glo', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-105', fullName: 'Member 0901 480 7223', phoneNumber: '+234 901 480 7223', network: 'Airtel', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-106', fullName: 'Member 0906 068 3971', phoneNumber: '+234 906 068 3971', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-107', fullName: 'Member 0913 696 5250', phoneNumber: '+234 913 696 5250', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
  { id: 'ebm-108', fullName: 'Member 0916 627 5422', phoneNumber: '+234 916 627 5422', network: 'MTN', category: 'Esther Group Benin', defaultAmount: 1000, notes: 'Esther Group Benin Member', totalReceivedAmount: 0, totalTransfersCount: 0, createdAt: '2026-09-01T06:00:00.000Z' },
];
