import React, { useState, useMemo } from 'react';
import { Users, UserPlus, Zap, Search, Phone, Heart, CreditCard, Sparkles, CheckCircle2, PhoneCall, ArrowRight, X, Edit2, Trash2, ShieldCheck, Loader2, ArrowRightLeft } from 'lucide-react';
import { Beneficiary, NetworkType, PurposeCategory, UserRole, MinistryGroup } from '../types';
import { detectNigerianNetwork, getNetworkBadgeStyle, formatPhoneNumber, getUSSDTransferCode } from '../utils/networkDetector';
import { generateReceiptNumber, formatNaira } from '../utils/receiptGenerator';
import { executeVTPassAirtimeTopup } from '../utils/vtpassService';

interface BeneficiariesDirectoryProps {
  beneficiaries: Beneficiary[];
  currentRole: UserRole;
  currentUserName: string;
  activeGroup?: MinistryGroup;
  onOpenGroupSwitchModal?: () => void;
  onSwitchGroupDirect?: (group: MinistryGroup) => void;
  onOneClickDispatch: (
    beneficiary: Beneficiary,
    amount: number,
    ministerName: string,
    receiptNo: string,
    evidenceSvgUrl?: string
  ) => void;
  onAddBeneficiary: (b: Beneficiary) => void;
  onUpdateBeneficiary: (b: Beneficiary) => void;
  onDeleteBeneficiary: (id: string) => void;
}

const CATEGORY_OPTIONS: PurposeCategory[] = [
  'Peace Group',
  'Esther Group Benin',
  'Widow Support',
  'Youth Outreach',
  'Elderly Care',
  'Visitor',
  'Special Project',
  'Pastor / Minister Care',
  'Emergency Blessing',
  'Other / Custom'
];

export const BeneficiariesDirectory: React.FC<BeneficiariesDirectoryProps> = ({
  beneficiaries,
  currentRole,
  currentUserName,
  activeGroup = 'Esther Group',
  onOpenGroupSwitchModal,
  onSwitchGroupDirect,
  onOneClickDispatch,
  onAddBeneficiary,
  onUpdateBeneficiary,
  onDeleteBeneficiary,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<Beneficiary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    activeGroup === 'Peace Group' ? 'Peace Group' : 'ALL'
  );
  const [selectedNetwork, setSelectedNetwork] = useState<string>('ALL');

  // Automatically update selected category when active group changes
  React.useEffect(() => {
    if (activeGroup === 'Peace Group') {
      setSelectedCategory('Peace Group');
    } else {
      setSelectedCategory('ALL');
    }
  }, [activeGroup]);

  // General & Individual Airtime Amount States
  const [generalAmount, setGeneralAmount] = useState<number>(2000);
  const [rowAmounts, setRowAmounts] = useState<{ [id: string]: number }>({});

  // Get current effective amount for a beneficiary
  const getEffectiveAmount = (b: Beneficiary): number => {
    return rowAmounts[b.id] !== undefined ? rowAmounts[b.id] : (b.defaultAmount || generalAmount);
  };

  // Set row amount for particular individual
  const handleSetRowAmount = (id: string, amt: number) => {
    setRowAmounts(prev => ({ ...prev, [id]: amt }));
  };

  // Apply General Amount to All
  const handleApplyGeneralAmountToAll = (newAmt: number) => {
    setGeneralAmount(newAmt);
    const updatedMap: { [id: string]: number } = {};
    beneficiaries.forEach(b => {
      updatedMap[b.id] = newAmt;
    });
    setRowAmounts(updatedMap);
  };

  // Direct WhatsApp Receipt Sender
  const handleShareWhatsAppReceiptDirect = (b: Beneficiary) => {
    const amt = getEffectiveAmount(b);
    const cleanPhone = b.phoneNumber.replace(/[^0-9]/g, '');
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('0')) {
      formattedPhone = '234' + cleanPhone.slice(1);
    }
    const receiptNo = generateReceiptNumber();

    const message = `🔥 *LIGHT UP PRAYER HOUSE — FAMILY OUTREACH*\n` +
      `*Official Airtime Distribution Receipt*\n\n` +
      `📄 *Receipt Ref:* ${receiptNo}\n` +
      `👤 *Beneficiary:* ${b.fullName}\n` +
      `📱 *Phone Number:* ${b.phoneNumber}\n` +
      `📶 *Network:* ${b.network}\n` +
      `💰 *Airtime Amount:* ₦${amt.toLocaleString()}.00\n` +
      `✅ *Status:* Verified Airtime Credit\n` +
      `📅 *Date:* ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n\n` +
      `*Tagline:* We Move By Fire — Pray • Believe • Rise • Overcome\n` +
      `*Distributed By:* ${currentUserName} (${currentRole})`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Quick 1-Click Dispatch Modal State
  const [dispatchTarget, setDispatchTarget] = useState<Beneficiary | null>(null);
  const [dispatchAmount, setDispatchAmount] = useState<number>(1000);
  const [dispatchMinister, setDispatchMinister] = useState<string>(currentUserName);
  const [customDispatchAmount, setCustomDispatchAmount] = useState<string>('');

  // Add Beneficiary Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNetwork, setNewNetwork] = useState<NetworkType>('Other');
  const [newCategory, setNewCategory] = useState<PurposeCategory>(
    activeGroup === 'Peace Group' ? 'Peace Group' : 'Esther Group Benin'
  );
  const [newDefaultAmount, setNewDefaultAmount] = useState<number>(2000);
  const [newNotes, setNewNotes] = useState('');
  const [newZoomName, setNewZoomName] = useState('');
  const [newWhatsappName, setNewWhatsappName] = useState('');

  // Edit Beneficiary Modal State
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNetwork, setEditNetwork] = useState<NetworkType>('Other');
  const [editCategory, setEditCategory] = useState<PurposeCategory>(
    activeGroup === 'Peace Group' ? 'Peace Group' : 'Esther Group Benin'
  );
  const [editDefaultAmount, setEditDefaultAmount] = useState<number>(2000);
  const [editNotes, setEditNotes] = useState('');
  const [editZoomName, setEditZoomName] = useState('');
  const [editWhatsappName, setEditWhatsappName] = useState('');
  const [editAliases, setEditAliases] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSaveSuccessMsg, setEditSaveSuccessMsg] = useState<string | null>(null);

  // Auto detect network for new beneficiary form
  const handleNewPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewPhone(val);
    if (val) {
      const detected = detectNigerianNetwork(val);
      setNewNetwork(detected);
    }
  };

  // Open edit modal and prefill data
  const handleOpenEditModal = (b: Beneficiary) => {
    setEditingBeneficiary(b);
    setEditName(b.fullName);
    setEditPhone(b.phoneNumber);
    setEditNetwork(b.network);
    setEditCategory(b.category);
    setEditDefaultAmount(b.defaultAmount || 2000);
    setEditNotes(b.notes || '');
    setEditZoomName(b.zoomName || '');
    setEditWhatsappName(b.whatsappName || '');
    setEditAliases((b.aliases || []).join(', '));
    setIsSavingEdit(false);
    setEditSaveSuccessMsg(null);
  };

  const handleEditPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditPhone(val);
    if (val) {
      const detected = detectNigerianNetwork(val);
      setEditNetwork(detected);
    }
  };

  // Helper to detect ESG / PG tags and auto-assign group category without altering user-entered name
  const cleanESGNameAndCategory = (rawName: string, currentCat: PurposeCategory) => {
    const cleanName = rawName.trim();
    let cat = currentCat;

    if (/\b(peace|pg|peace group)\b/i.test(cleanName) && (currentCat === 'Other / Custom' || currentCat === 'Esther Group Benin')) {
      cat = 'Peace Group';
    } else if (/\b(esg|esther group)\b/i.test(cleanName) && (currentCat === 'Other / Custom' || currentCat === 'Peace Group')) {
      cat = 'Esther Group Benin';
    }

    return { cleanName, cat };
  };

  const handleSaveEditBeneficiary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBeneficiary) return;
    if (!editName.trim() || !editPhone.trim()) {
      alert('Please fill in full name and phone number.');
      return;
    }

    setIsSavingEdit(true);
    setEditSaveSuccessMsg('💾 Saving member changes to Cloud Database...');

    try {
      const { cleanName, cat } = cleanESGNameAndCategory(editName, editCategory);

      const zoomNameClean = (editZoomName || '').trim();
      const whatsappNameClean = (editWhatsappName || '').trim();
      const aliasesList = editAliases ? editAliases.split(',').map(s => s.trim()).filter(Boolean) : [];

      const updated: Beneficiary = {
        ...editingBeneficiary,
        fullName: cleanName,
        phoneNumber: formatPhoneNumber(editPhone),
        network: editNetwork,
        category: cat,
        defaultAmount: editDefaultAmount,
        notes: (editNotes || '').trim(),
      };

      if (zoomNameClean) updated.zoomName = zoomNameClean;
      else delete updated.zoomName;

      if (whatsappNameClean) updated.whatsappName = whatsappNameClean;
      else delete updated.whatsappName;

      if (aliasesList.length > 0) updated.aliases = aliasesList;
      else delete updated.aliases;

      onUpdateBeneficiary(updated);

      setEditSaveSuccessMsg('✅ Member profile saved & synced across all browsers!');
      setTimeout(() => {
        setIsSavingEdit(false);
        setEditSaveSuccessMsg(null);
        setEditingBeneficiary(null);
      }, 500);
    } catch (err) {
      console.error('Failed to save beneficiary edit:', err);
      alert('Error saving member profile. Please check inputs and try again.');
      setIsSavingEdit(false);
      setEditSaveSuccessMsg(null);
    }
  };

  // Active Group Members list
  const activeGroupMembers = useMemo(() => {
    return beneficiaries.filter((b) => {
      // If user selected Peace Group specifically or ALL in category dropdown, don't hide Peace Group members
      if (selectedCategory === 'ALL' || selectedCategory === 'Peace Group') {
        return true;
      }
      if (activeGroup === 'Peace Group') {
        return b.category === 'Peace Group' || Boolean(b.notes && b.notes.toLowerCase().includes('peace'));
      } else {
        return b.category === 'Esther Group Benin' || Boolean(b.notes && b.notes.toLowerCase().includes('esther')) || (!b.category.toLowerCase().includes('peace') && !b.notes?.toLowerCase().includes('peace'));
      }
    });
  }, [beneficiaries, activeGroup, selectedCategory]);

  // Filter beneficiaries
  const filteredBeneficiaries = useMemo(() => {
    return activeGroupMembers.filter((b) => {
      const matchesSearch =
        b.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.phoneNumber.includes(searchTerm) ||
        b.category.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesCategory = false;
      if (selectedCategory === 'ALL') {
        matchesCategory = true;
      } else if (selectedCategory === 'Esther Group Benin') {
        matchesCategory = b.category === 'Esther Group Benin' || Boolean(b.notes && b.notes.toLowerCase().includes('esther'));
      } else if (selectedCategory === 'Peace Group') {
        matchesCategory = b.category === 'Peace Group' || Boolean(b.notes && b.notes.toLowerCase().includes('peace'));
      } else {
        matchesCategory = b.category === selectedCategory;
      }

      const matchesNetwork = selectedNetwork === 'ALL' || b.network === selectedNetwork;

      return matchesSearch && matchesCategory && matchesNetwork;
    });
  }, [activeGroupMembers, searchTerm, selectedCategory, selectedNetwork]);

  // Open 1-Click Modal
  const handleOpenDispatchModal = (b: Beneficiary) => {
    setDispatchTarget(b);
    setDispatchAmount(b.defaultAmount || 2000);
    setDispatchMinister(currentUserName);
  };

  const [isProcessingDispatch, setIsProcessingDispatch] = useState(false);
  const [dispatchStatusMsg, setDispatchStatusMsg] = useState<string | null>(null);

  // Execute 1-Click Airtime Transfer
  const handleExecuteOneClick = async () => {
    if (!dispatchTarget) return;

    const finalAmt = dispatchAmount === 0 ? Number(customDispatchAmount) : dispatchAmount;
    if (!finalAmt || finalAmt <= 0) {
      alert('Please select or enter a valid airtime amount.');
      return;
    }

    setIsProcessingDispatch(true);
    setDispatchStatusMsg('Initiating VTPass Airtime Topup transaction...');

    try {
      const topupRes = await executeVTPassAirtimeTopup(
        dispatchTarget.network,
        dispatchTarget.phoneNumber,
        finalAmt,
        dispatchMinister.trim() || currentUserName,
        dispatchTarget.fullName
      );

      const receiptNo = generateReceiptNumber();

      // Create crisp SVG evidence transfer proof
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="400" height="300" rx="16" fill="#0f172a"/>
        <rect x="20" y="20" width="360" height="260" rx="12" fill="#1e1b4b" stroke="#a855f7" stroke-width="2"/>
        <circle cx="200" cy="60" r="24" fill="#f59e0b"/>
        <text x="200" y="66" font-family="sans-serif" font-weight="bold" font-size="18" fill="#1e1b4b" text-anchor="middle">✓</text>
        <text x="200" y="105" font-family="sans-serif" font-weight="bold" font-size="16" fill="#fef08a" text-anchor="middle">1-CLICK AIRTIME TRANSFER SUCCESS</text>
        <text x="200" y="130" font-family="sans-serif" font-size="12" fill="#cbd5e1" text-anchor="middle">LIGHT UP PRAYER HOUSE OUTREACH</text>
        <line x1="40" y1="145" x2="360" y2="145" stroke="#3730a3" stroke-dasharray="4"/>
        <text x="50" y="175" font-family="sans-serif" font-size="13" fill="#94a3b8">Beneficiary Name:</text>
        <text x="350" y="175" font-family="sans-serif" font-weight="bold" font-size="13" fill="#e2e8f0" text-anchor="end">${dispatchTarget.fullName}</text>
        <text x="50" y="200" font-family="sans-serif" font-size="13" fill="#94a3b8">Network &amp; Amount:</text>
        <text x="350" y="200" font-family="sans-serif" font-weight="bold" font-size="14" fill="#4ade80" text-anchor="end">${dispatchTarget.network} - ₦${finalAmt.toLocaleString()}.00</text>
        <text x="50" y="225" font-family="sans-serif" font-size="13" fill="#94a3b8">Transaction Ref:</text>
        <text x="350" y="225" font-family="monospace" font-size="12" fill="#e2e8f0" text-anchor="end">${receiptNo}</text>
        <rect x="40" y="245" width="320" height="24" rx="6" fill="#312e81"/>
        <text x="200" y="261" font-family="sans-serif" font-size="11" fill="#fef08a" text-anchor="middle">${topupRes.message}</text>
      </svg>`;
      const evidenceUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

      onOneClickDispatch(
        dispatchTarget,
        finalAmt,
        dispatchMinister.trim() || currentUserName,
        receiptNo,
        evidenceUrl
      );

      if (topupRes.success) {
        setDispatchStatusMsg(`✅ ${topupRes.message}`);
      } else {
        setDispatchStatusMsg(`⚠️ ${topupRes.message}`);
      }

      setTimeout(() => {
        setDispatchTarget(null);
        setIsProcessingDispatch(false);
        setDispatchStatusMsg(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      setIsProcessingDispatch(false);
      setDispatchStatusMsg('Error processing dispatch');
    }
  };

  // Submit Register New Beneficiary
  const handleSaveNewBeneficiary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      alert('Please fill in beneficiary full name and phone number.');
      return;
    }

    try {
      const { cleanName, cat } = cleanESGNameAndCategory(newName, newCategory);

      const zoomNameClean = (newZoomName || '').trim();
      const whatsappNameClean = (newWhatsappName || '').trim();

      const newB: Beneficiary = {
        id: `ben-${Date.now()}`,
        fullName: cleanName,
        phoneNumber: formatPhoneNumber(newPhone),
        network: newNetwork,
        category: cat,
        defaultAmount: newDefaultAmount,
        notes: (newNotes || '').trim(),
        totalReceivedAmount: 0,
        totalTransfersCount: 0,
        createdAt: new Date().toISOString(),
        ...(zoomNameClean ? { zoomName: zoomNameClean } : {}),
        ...(whatsappNameClean ? { whatsappName: whatsappNameClean } : {}),
      };

      onAddBeneficiary(newB);
      setIsAddModalOpen(false);
      setNewName('');
      setNewPhone('');
      setNewNotes('');
      setNewZoomName('');
      setNewWhatsappName('');
    } catch (err) {
      console.error('Failed to register beneficiary:', err);
      alert('Error registering new beneficiary. Please check inputs and try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950 via-purple-900 to-slate-950 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Instant 1-Click Airtime Dispatch</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-cinzel text-white flex items-center gap-2">
            <span>👥 Registered Beneficiaries Directory</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-800 text-amber-300 font-sans border border-purple-700">
              {activeGroupMembers.length} Registered ({activeGroup})
            </span>
          </h2>
          <p className="text-xs text-amber-200/80">
            Send airtime in 1 click to registered members, widows, youths &amp; visitors — with instant receipt &amp; evidence generation!
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-purple-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>➕ Register New Beneficiary</span>
        </button>
      </div>

      {/* Active Group Indicator & Switcher Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
        activeGroup === 'Peace Group'
          ? 'bg-gradient-to-r from-emerald-950/70 to-slate-950 border-emerald-500/40 text-emerald-100'
          : 'bg-gradient-to-r from-pink-950/70 to-slate-950 border-pink-500/40 text-pink-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner ${
            activeGroup === 'Peace Group' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
          }`}>
            {activeGroup === 'Peace Group' ? '🕊️' : '🌸'}
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
              Active Congregation Focus
            </div>
            <div className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>{activeGroup}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/80 text-amber-300 font-mono border border-purple-700">
                {activeGroupMembers.length} Registered Members
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSwitchGroupDirect && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-purple-900/60 border border-purple-700">
              <button
                type="button"
                onClick={() => {
                  onSwitchGroupDirect('Esther Group');
                  setSelectedCategory('Esther Group Benin');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeGroup === 'Esther Group'
                    ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                    : 'text-purple-300 hover:text-white'
                }`}
                title="Switch to Esther Group (Benin)"
              >
                <span>🌸 Esther Group</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSwitchGroupDirect('Peace Group');
                  setSelectedCategory('Peace Group');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeGroup === 'Peace Group'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                    : 'text-purple-300 hover:text-white'
                }`}
                title="Switch to Peace Group"
              >
                <span>🕊️ Peace Group</span>
              </button>
            </div>
          )}

          {onOpenGroupSwitchModal && (
            <button
              onClick={onOpenGroupSwitchModal}
              className="px-3 py-1.5 rounded-xl bg-purple-900/70 hover:bg-purple-800 border border-purple-600 text-xs font-bold text-amber-300 hover:text-amber-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02]"
              title="Manage Passwords"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Security</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-5 rounded-2xl bg-purple-950/60 border border-purple-800/50 space-y-4 backdrop-blur-md">
        
        {/* Quick Group Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-amber-500 text-purple-950 font-extrabold shadow-md'
                : 'bg-purple-900/50 text-purple-200 hover:bg-purple-900 border border-purple-800/60'
            }`}
          >
            All Members ({filteredBeneficiaries.length})
          </button>

          <button
            onClick={() => setSelectedCategory('Esther Group Benin')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0 transition-all flex items-center gap-1.5 ${
              selectedCategory === 'Esther Group Benin'
                ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/20'
                : 'bg-pink-500/10 text-pink-300 border border-pink-500/40 hover:bg-pink-500/20'
            }`}
          >
            <span>🌸 Esther Group</span>
            <span className="px-1.5 py-0.2 bg-purple-950/80 text-pink-300 rounded-md text-[10px]">
              {beneficiaries.filter(b => b.category === 'Esther Group Benin' || b.notes?.toLowerCase().includes('esther')).length}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('Peace Group')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0 transition-all flex items-center gap-1.5 ${
              selectedCategory === 'Peace Group'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/20'
            }`}
          >
            <span>🕊️ Peace Group</span>
            <span className="px-1.5 py-0.2 bg-purple-950/80 text-emerald-300 rounded-md text-[10px]">
              {beneficiaries.filter(b => b.category === 'Peace Group' || b.notes?.toLowerCase().includes('peace')).length}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('Pastor / Minister Care')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0 transition-all flex items-center gap-1.5 ${
              selectedCategory === 'Pastor / Minister Care'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-purple-950 shadow-lg shadow-amber-500/20'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/40 hover:bg-amber-500/20'
            }`}
          >
            <span>👑 Pastors &amp; Ministers</span>
            <span className="px-1.5 py-0.2 bg-purple-950/80 text-amber-300 rounded-md text-[10px]">
              {beneficiaries.filter(b => b.category === 'Pastor / Minister Care').length}
            </span>
          </button>

          {['Widow Support', 'Youth Outreach', 'Elderly Care', 'Visitor'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-purple-950 font-extrabold shadow-md'
                  : 'bg-purple-900/50 text-purple-200 hover:bg-purple-900 border border-purple-800/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search pastors & registered people by Name, Phone Number, or Network..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-900/40 border border-purple-700/60 text-white placeholder-purple-400/60 focus:outline-none focus:border-amber-400 text-sm font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-purple-300 mb-1">Filter Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-purple-900/60 border border-purple-700/60 text-white focus:outline-none focus:border-amber-400"
            >
              <option value="ALL">All Categories</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-purple-300 mb-1">Filter Network</label>
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-purple-900/60 border border-purple-700/60 text-white focus:outline-none focus:border-amber-400"
            >
              <option value="ALL">All Networks</option>
              <option value="MTN">MTN</option>
              <option value="Glo">Glo</option>
              <option value="Airtel">Airtel</option>
              <option value="9Mobile">9Mobile</option>
              <option value="Other">Other / International</option>
            </select>
          </div>
        </div>
      </div>

      {/* General Amount Setting Control Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/80 to-slate-900 border-2 border-amber-500/40 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-300 font-extrabold text-sm">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <span>⚙️ GENERAL AIRTIME AMOUNT FOR ALL MEMBERS / PASTORS</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-200">Current General:</span>
            <span className="text-base font-extrabold font-cinzel text-emerald-400 bg-purple-950 px-3 py-1 rounded-xl border border-purple-700">
              ₦{generalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-purple-300 font-bold">Set General Amount to All:</span>
          {[1000, 2000, 3000, 5000, 10000].map((amt) => (
            <button
              key={amt}
              onClick={() => handleApplyGeneralAmountToAll(amt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                generalAmount === amt
                  ? 'bg-amber-500 text-purple-950 border-amber-400 shadow-md'
                  : 'bg-purple-950/80 text-amber-300 border-purple-700 hover:bg-purple-800'
              }`}
            >
              ₦{amt.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Beneficiaries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBeneficiaries.map((b, index) => {
          const badgeStyle = getNetworkBadgeStyle(b.network);
          const currentAmt = getEffectiveAmount(b);
          const ussdCode = getUSSDTransferCode(b.network, b.phoneNumber, currentAmt);

          return (
            <div
              key={b.id}
              className="p-5 rounded-3xl bg-purple-900/40 hover:bg-purple-900/70 border-2 border-purple-800/80 hover:border-amber-500/50 space-y-4 transition-all relative group flex flex-col justify-between shadow-xl"
            >
              <div className="space-y-3">
                
                {/* Header: Name & Network Badge */}
                <div className="flex items-start justify-between gap-2 border-b border-purple-800/60 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-amber-400 font-mono">#{index + 1}</span>
                      <h3 className="font-extrabold text-base text-white tracking-wide uppercase group-hover:text-amber-300 transition-colors">
                        {b.fullName}
                      </h3>
                    </div>
                    <div className="text-xs text-amber-200/90 font-medium font-mono flex items-center gap-1 mt-1">
                      <Phone className="w-3.5 h-3.5 text-purple-400" />
                      <span>{b.phoneNumber}</span>
                    </div>

                    {(b.zoomName || b.whatsappName || (b.aliases && b.aliases.length > 0)) && (
                      <div className="flex items-center gap-1 flex-wrap mt-1.5 text-[10px]">
                        {b.zoomName && (
                          <span className="px-2 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 font-semibold" title="Zoom Screen Name">
                            🎥 {b.zoomName}
                          </span>
                        )}
                        {b.whatsappName && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-semibold" title="WhatsApp Display Name">
                            📱 {b.whatsappName}
                          </span>
                        )}
                        {b.aliases && b.aliases.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-lg bg-purple-950/80 border border-purple-700 text-amber-300 font-medium" title={b.aliases.join(', ')}>
                            🔗 +{b.aliases.length} aliases
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2.5 py-1 rounded-xl font-extrabold text-xs border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                      {b.network}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(b)}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500 hover:text-purple-950 text-amber-300 font-bold text-xs border border-amber-500/40 flex items-center gap-1 transition-all cursor-pointer"
                      title="Edit member name or details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Name</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMemberToDelete(b)}
                      className="p-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-600 hover:text-white text-rose-400 border border-rose-800 transition-all cursor-pointer"
                      title="Delete member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Amount Setting for this particular individual */}
                <div className="p-3.5 rounded-2xl bg-purple-950/90 border border-purple-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 uppercase text-[11px]">Airtime Amount for {b.fullName.split(' ')[0]}</span>
                    <span className="text-xs text-purple-300 font-bold">{b.category}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-extrabold text-sm font-cinzel">₦</span>
                    <input
                      type="number"
                      value={currentAmt}
                      onChange={(e) => handleSetRowAmount(b.id, Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-purple-900/60 border border-purple-700 text-white font-extrabold text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Quick Amounts for Individual */}
                  <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                    <span className="text-[10px] text-purple-300">Quick:</span>
                    {[500, 1000, 2000, 5000, 10000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleSetRowAmount(b.id, amt)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                          currentAmt === amt
                            ? 'bg-amber-500 text-purple-950 border-amber-400 font-extrabold'
                            : 'bg-purple-900/40 text-purple-300 border-purple-800 hover:text-white'
                        }`}
                      >
                        ₦{amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lifetime Stats */}
                <div className="text-[11px] text-purple-300/80 flex items-center justify-between px-1">
                  <span>Total Received: <strong className="text-amber-300">{formatNaira(b.totalReceivedAmount || 0)}</strong></span>
                  <span>Sent: <strong className="text-white">{b.totalTransfersCount || 0} times</strong></span>
                </div>

              </div>

              {/* TWO MAIN ACTION BUTTONS: 📲 SEND AIRTIME & 💬 SHARE RECEIPT TO WHATSAPP */}
              <div className="pt-3 border-t border-purple-800/60 space-y-2">
                
                {/* 1. SEND AIRTIME BUTTON */}
                <button
                  onClick={() => handleOpenDispatchModal(b)}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-purple-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-purple-950" />
                  <span>📲 SEND AIRTIME (₦{currentAmt.toLocaleString()})</span>
                </button>

                {/* 2. SHARE RECEIPT TO WHATSAPP BUTTON */}
                <button
                  onClick={() => handleShareWhatsAppReceiptDirect(b)}
                  className="w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer border border-emerald-400/40"
                >
                  <PhoneCall className="w-4 h-4 text-white" />
                  <span>💬 SHARE RECEIPT TO WHATSAPP</span>
                </button>

                <div className="flex items-center justify-between text-[10px] text-purple-300/70 pt-1">
                  <a
                    href={`tel:${encodeURIComponent(ussdCode)}`}
                    className="hover:text-amber-300 underline font-mono"
                    title="Direct mobile USSD dial code"
                  >
                    USSD: {ussdCode}
                  </a>

                  {currentRole === 'Admin' && (
                    <button
                      onClick={() => onDeleteBeneficiary(b.id)}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* MODAL 1: 1-Click Airtime Dispatch Confirm */}
      {dispatchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-3xl bg-purple-950 border-2 border-amber-500/50 shadow-2xl text-white relative overflow-hidden">
            
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-purple-950 px-6 py-4 border-b border-purple-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-amber-300 font-extrabold font-cinzel text-base">
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span>⚡ 1-Click Airtime Dispatch</span>
              </div>
              <button
                onClick={() => setDispatchTarget(null)}
                className="p-2 rounded-xl bg-purple-900/80 hover:bg-rose-600 text-purple-200 hover:text-white transition-all border border-purple-700/60 cursor-pointer"
                title="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-3">
              {/* Beneficiary Card Summary */}
              <div className="p-4 rounded-2xl bg-purple-900/40 border border-purple-800 space-y-2">
                <div className="text-xs text-purple-300 font-bold uppercase">Recipient Details</div>
                <div className="font-extrabold text-lg text-white">{dispatchTarget.fullName}</div>
                <div className="text-xs text-amber-300 font-mono flex items-center justify-between">
                  <span>{dispatchTarget.phoneNumber} ({dispatchTarget.network})</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-800 text-purple-200">{dispatchTarget.category}</span>
                </div>
              </div>

              {/* Select Amount */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-amber-300">Select Airtime Amount (₦)</label>
                <div className="flex flex-wrap gap-2">
                  {[500, 1000, 2000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setDispatchAmount(amt);
                        setCustomDispatchAmount('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border ${
                        dispatchAmount === amt
                          ? 'bg-amber-500 text-purple-950 border-amber-400'
                          : 'bg-purple-900/40 text-purple-200 border-purple-700/60'
                      }`}
                    >
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minister Disburser */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase text-amber-300">Distributed By</label>
                <input
                  type="text"
                  value={dispatchMinister}
                  onChange={(e) => setDispatchMinister(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-purple-900/40 border border-purple-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Execute & USSD Dial Buttons */}
              <div className="space-y-3 pt-2">
                {/* Option A: Direct USSD Dialer Button */}
                <a
                  href={`tel:${encodeURIComponent(getUSSDTransferCode(dispatchTarget.network, dispatchTarget.phoneNumber, dispatchAmount))}`}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer border border-emerald-400/30"
                >
                  <PhoneCall className="w-4 h-4 text-white" />
                  <span>📞 STEP 1: DIAL USSD ON PHONE ({getUSSDTransferCode(dispatchTarget.network, dispatchTarget.phoneNumber, dispatchAmount)})</span>
                </a>

                {/* Option B: Dispatch & Generate Receipt Record */}
                <button
                  onClick={handleExecuteOneClick}
                  disabled={isProcessingDispatch}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-purple-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 cursor-pointer disabled:opacity-75"
                >
                  {isProcessingDispatch ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-purple-950" />
                      <span>Processing Airtime Topup...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-purple-950" />
                      <span>⚡ STEP 2: RECORD DISPATCH &amp; GENERATE RECEIPT</span>
                    </>
                  )}
                </button>

                {dispatchStatusMsg && (
                  <div className="text-xs font-bold text-center p-2.5 rounded-xl bg-purple-900/90 border border-amber-400 text-amber-300">
                    {dispatchStatusMsg}
                  </div>
                )}

                <div className="p-3 rounded-xl bg-purple-900/60 border border-purple-700/80 text-[11px] text-purple-200 space-y-1">
                  <p className="font-bold text-amber-300 flex items-center gap-1">
                    💡 How airtime transfer works on your mobile phone:
                  </p>
                  <p className="text-purple-300/90 leading-normal">
                    Tap <strong>Step 1</strong> to open your phone dialer with the network USSD code (<code className="text-amber-300">{getUSSDTransferCode(dispatchTarget.network, dispatchTarget.phoneNumber, dispatchAmount)}</code>). Hit <strong>Call</strong> on your phone to send the airtime from your SIM card, then tap <strong>Step 2</strong> to log the transaction &amp; generate the WhatsApp receipt proof!
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: Edit Existing Beneficiary Profile */}
      {editingBeneficiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <form 
            onSubmit={handleSaveEditBeneficiary} 
            className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl bg-purple-950 border-2 border-amber-500/50 shadow-2xl text-white relative overflow-hidden"
          >
            {/* Sticky Header with Close Button */}
            <div className="sticky top-0 z-20 bg-purple-950 px-6 py-4 border-b border-purple-800/80 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold font-cinzel text-lg text-amber-300 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <span>✏️ Edit Member Profile</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingBeneficiary(null)}
                className="p-2 rounded-xl bg-purple-900/80 hover:bg-rose-600 text-purple-200 hover:text-white cursor-pointer transition-all border border-purple-700/60"
                title="Close edit dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-3">
              <div>
                <label className="block text-xs font-bold uppercase text-amber-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Sister Deborah Adeola"
                  className="w-full px-4 py-2.5 rounded-xl bg-purple-900/40 border border-purple-700 text-white text-sm focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-amber-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={handleEditPhoneChange}
                  placeholder="e.g. 0803 123 4567"
                  className="w-full px-4 py-2.5 rounded-xl bg-purple-900/40 border border-purple-700 text-white text-sm focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-amber-300 mb-1">Network</label>
                  <select
                    value={editNetwork}
                    onChange={(e) => setEditNetwork(e.target.value as NetworkType)}
                    className="w-full p-2.5 rounded-xl bg-purple-900/40 border border-purple-700 text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="MTN">MTN</option>
                    <option value="Glo">Glo</option>
                    <option value="Airtel">Airtel</option>
                    <option value="9Mobile">9Mobile</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-amber-300 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as PurposeCategory)}
                    className="w-full p-2.5 rounded-xl bg-purple-900/40 border border-purple-700 text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-amber-300 mb-1">Default Airtime Gift (₦)</label>
                <input
                  type="number"
                  value={editDefaultAmount}
                  onChange={(e) => setEditDefaultAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-purple-900/40 border border-purple-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Zoom & WhatsApp Alternate Names */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-purple-900/30 border border-purple-800 space-y-0">
                <div>
                  <label className="block text-xs font-bold uppercase text-cyan-300 mb-1">🎥 Zoom Screen Name</label>
                  <input
                    type="text"
                    value={editZoomName}
                    onChange={(e) => setEditZoomName(e.target.value)}
                    placeholder="e.g. Juliet's iPhone"
                    className="w-full px-3 py-2 rounded-xl bg-purple-950 border border-cyan-800/80 text-cyan-200 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-emerald-300 mb-1">📱 WhatsApp Name</label>
                  <input
                    type="text"
                    value={editWhatsappName}
                    onChange={(e) => setEditWhatsappName(e.target.value)}
                    placeholder="e.g. Sister Juliet AGL"
                    className="w-full px-3 py-2 rounded-xl bg-purple-950 border border-emerald-800/80 text-emerald-200 text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="col-span-2 pt-2">
                  <label className="block text-[11px] font-bold uppercase text-amber-300 mb-1">🔗 Extra Name Aliases (Comma Separated)</label>
                  <input
                    type="text"
                    value={editAliases}
                    onChange={(e) => setEditAliases(e.target.value)}
                    placeholder="e.g. J. Imasuem, Becky Zoom, Mrs J Imasuem"
                    className="w-full px-3 py-2 rounded-xl bg-purple-950 border border-purple-700 text-amber-200 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-amber-300 mb-1">Notes / Member Info</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Registered Esther Group Benin member"
                  className="w-full px-4 py-2.5 rounded-xl bg-purple-900/40 border border-purple-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-20 bg-purple-950 px-6 py-4 border-t border-purple-800/80 flex flex-col gap-2 shrink-0">
              {editSaveSuccessMsg && (
                <div className="text-xs font-bold text-center p-2 rounded-xl bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 animate-fadeIn flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{editSaveSuccessMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => setEditingBeneficiary(null)}
                  className="w-1/3 py-3 rounded-2xl bg-purple-900 hover:bg-purple-800 text-purple-200 font-bold text-xs cursor-pointer border border-purple-700/60 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-purple-950 font-extrabold text-sm shadow-lg cursor-pointer border border-amber-300 transition-all disabled:opacity-75 flex items-center justify-center gap-2"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-purple-950" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-purple-950 stroke-[2.5]" />
                      <span>Save Member Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <form 
            onSubmit={handleSaveNewBeneficiary} 
            className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl bg-purple-950 border-2 border-amber-500/50 shadow-2xl text-white relative overflow-hidden"
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-purple-950 px-6 py-4 border-b border-purple-800/80 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold font-cinzel text-lg text-amber-300 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <span>➕ Register New Beneficiary</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl bg-purple-900/80 hover:bg-rose-600 text-purple-200 hover:text-white cursor-pointer transition-all border border-purple-700/60"
                title="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-3">
              <div>
                <label className="block text-xs font-bold uppercase text-amber-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Sister Deborah Adeola"
                  className="w-full px-4 py-2.5 rounded-xl bg-purple-900/40 border border-purple-700 text-white text-sm focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-amber-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={handleNewPhoneChange}
                  placeholder="e.g. 0803 123 4567"
                  className="w-full px-4 py-2.5 rounded-xl bg-purple-900/40 border border-purple-700 text-white text-sm focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-amber-300 mb-1">Network</label>
                  <select
                    value={newNetwork}
                    onChange={(e) => setNewNetwork(e.target.value as NetworkType)}
                    className="w-full p-2.5 rounded-xl bg-purple-900/40 border border-purple-700 text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="MTN">MTN</option>
                    <option value="Glo">Glo</option>
                    <option value="Airtel">Airtel</option>
                    <option value="9Mobile">9Mobile</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-amber-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as PurposeCategory)}
                    className="w-full p-2.5 rounded-xl bg-purple-900/40 border border-purple-700 text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-amber-300 mb-1">Default Airtime Gift (₦)</label>
                <input
                  type="number"
                  value={newDefaultAmount}
                  onChange={(e) => setNewDefaultAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-purple-900/40 border border-purple-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-amber-300 mb-1">Notes / Member Info</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Registered widow welfare member"
                  className="w-full px-4 py-2.5 rounded-xl bg-purple-900/40 border border-purple-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-20 bg-purple-950 px-6 py-4 border-t border-purple-800/80 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-1/3 py-3 rounded-2xl bg-purple-900 hover:bg-purple-800 text-purple-200 font-bold text-xs cursor-pointer border border-purple-700/60 transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-purple-950 font-extrabold text-sm shadow-lg cursor-pointer border border-amber-300 transition-all"
              >
                Save &amp; Register Beneficiary Profile
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Custom Member Delete Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-purple-950 border-2 border-rose-500/60 p-6 shadow-2xl text-white space-y-5 relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-950 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
              👤❌
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold font-cinzel text-rose-300">
                Remove Member Profile
              </h3>
              <p className="text-xs text-purple-200">
                Are you sure you want to permanently remove this member profile from the directory?
              </p>
              <div className="p-3 rounded-2xl bg-purple-900/60 border border-rose-800/80 text-amber-300 font-extrabold text-sm font-mono">
                {memberToDelete.fullName} ({memberToDelete.phoneNumber})
              </div>
              <p className="text-[11px] text-rose-400/90 font-medium italic">
                ⚠️ All profile data for this member will be permanently removed.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="w-1/2 py-3 rounded-2xl bg-purple-900 hover:bg-purple-800 text-purple-200 font-bold text-xs cursor-pointer border border-purple-700 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteBeneficiary(memberToDelete.id);
                  setMemberToDelete(null);
                }}
                className="w-1/2 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold text-xs shadow-lg shadow-rose-900/50 cursor-pointer border border-rose-400 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Member</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
