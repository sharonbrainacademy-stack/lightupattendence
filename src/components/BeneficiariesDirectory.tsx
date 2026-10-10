import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Sparkles,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  ShieldCheck,
  ArrowRightLeft,
  MessageCircle,
  HelpCircle,
  Tag,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { Beneficiary, NetworkType, PurposeCategory, UserRole, MinistryGroup } from '../types';
import { detectNigerianNetwork, formatPhoneNumber } from '../utils/networkDetector';

interface BeneficiariesDirectoryProps {
  beneficiaries: Beneficiary[];
  currentRole: UserRole;
  currentUserName: string;
  activeGroup?: MinistryGroup;
  onOpenGroupSwitchModal?: () => void;
  onSwitchGroupDirect?: (group: MinistryGroup) => void;
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
  'Other'
];

export const BeneficiariesDirectory: React.FC<BeneficiariesDirectoryProps> = ({
  beneficiaries,
  currentRole,
  currentUserName,
  activeGroup = 'Esther Group',
  onOpenGroupSwitchModal,
  onSwitchGroupDirect,
  onAddBeneficiary,
  onUpdateBeneficiary,
  onDeleteBeneficiary,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<Beneficiary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(activeGroup);

  // Automatically update selected category when active group changes
  React.useEffect(() => {
    setSelectedCategory(activeGroup);
  }, [activeGroup]);

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNetwork, setNewNetwork] = useState<NetworkType>('Other');
  const [newCategory, setNewCategory] = useState<PurposeCategory>(
    activeGroup === 'Peace Group' ? 'Peace Group' : 'Esther Group Benin'
  );
  const [newNotes, setNewNotes] = useState('');
  const [newZoomName, setNewZoomName] = useState('');
  const [newWhatsappName, setNewWhatsappName] = useState('');

  // Edit Member Modal State
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNetwork, setEditNetwork] = useState<NetworkType>('Other');
  const [editCategory, setEditCategory] = useState<PurposeCategory>(
    activeGroup === 'Peace Group' ? 'Peace Group' : 'Esther Group Benin'
  );
  const [editNotes, setEditNotes] = useState('');
  const [editZoomName, setEditZoomName] = useState('');
  const [editWhatsappName, setEditWhatsappName] = useState('');
  const [editAliases, setEditAliases] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSaveSuccessMsg, setEditSaveSuccessMsg] = useState<string | null>(null);

  // Auto detect network for phone input
  const handleNewPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewPhone(val);
    if (val) {
      const detected = detectNigerianNetwork(val);
      setNewNetwork(detected);
    }
  };

  const handleOpenEditModal = (b: Beneficiary) => {
    setEditingBeneficiary(b);
    setEditName(b.fullName);
    setEditPhone(b.phoneNumber);
    setEditNetwork(b.network || 'Other');
    setEditCategory(b.category);
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

  // Save new member
  const handleCreateBeneficiary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      alert('Please enter member name and phone number');
      return;
    }

    const newB: Beneficiary = {
      id: `mem-${Date.now()}`,
      fullName: newName.trim(),
      phoneNumber: formatPhoneNumber(newPhone.trim()),
      network: newNetwork,
      category: newCategory,
      defaultAmount: 0,
      notes: newNotes.trim(),
      zoomName: newZoomName.trim() || undefined,
      whatsappName: newWhatsappName.trim() || undefined,
      aliases: [
        newName.trim(),
        ...(newZoomName.trim() ? [newZoomName.trim()] : []),
        ...(newWhatsappName.trim() ? [newWhatsappName.trim()] : [])
      ],
      createdAt: new Date().toISOString()
    };

    onAddBeneficiary(newB);
    setIsAddModalOpen(false);

    // Reset fields
    setNewName('');
    setNewPhone('');
    setNewNetwork('Other');
    setNewNotes('');
    setNewZoomName('');
    setNewWhatsappName('');
  };

  // Save edited member
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBeneficiary) return;

    if (!editName.trim() || !editPhone.trim()) {
      alert('Member name and phone number are required.');
      return;
    }

    setIsSavingEdit(true);

    try {
      const parsedAliases = editAliases
        ? editAliases.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const updatedB: Beneficiary = {
        ...editingBeneficiary,
        fullName: editName.trim(),
        phoneNumber: formatPhoneNumber(editPhone.trim()),
        network: editNetwork,
        category: editCategory,
        notes: editNotes.trim(),
        zoomName: editZoomName.trim() || undefined,
        whatsappName: editWhatsappName.trim() || undefined,
        aliases: Array.from(new Set([
          editName.trim(),
          ...(editZoomName.trim() ? [editZoomName.trim()] : []),
          ...(editWhatsappName.trim() ? [editWhatsappName.trim()] : []),
          ...parsedAliases
        ]))
      };

      onUpdateBeneficiary(updatedB);

      setEditSaveSuccessMsg('✅ Member profile updated successfully!');
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

  // Direct WhatsApp Chat with member
  const handleOpenWhatsAppChat = (b: Beneficiary) => {
    const cleanPhone = b.phoneNumber.replace(/[^0-9]/g, '');
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('0')) {
      formattedPhone = '234' + cleanPhone.slice(1);
    }
    const message = `Hello ${b.fullName}, God bless you! From Light Up Prayer House (${b.category}).`;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Filter members list strictly
  const filteredBeneficiaries = useMemo(() => {
    return (beneficiaries || []).filter((b) => {
      // Group filtering
      if (selectedCategory === 'Peace Group') {
        if (b.category !== 'Peace Group' && !b.notes?.toLowerCase().includes('peace')) {
          return false;
        }
      } else if (selectedCategory === 'Esther Group') {
        if (b.category === 'Peace Group' || b.notes?.toLowerCase().includes('peace')) {
          return false;
        }
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = b.fullName.toLowerCase().includes(q);
        const matchesPhone = b.phoneNumber.includes(q);
        const matchesZoom = Boolean(b.zoomName && b.zoomName.toLowerCase().includes(q));
        const matchesWhatsapp = Boolean(b.whatsappName && b.whatsappName.toLowerCase().includes(q));
        const matchesAliases = Boolean(b.aliases?.some(a => a.toLowerCase().includes(q)));
        const matchesCategory = b.category.toLowerCase().includes(q);

        return matchesName || matchesPhone || matchesZoom || matchesWhatsapp || matchesAliases || matchesCategory;
      }

      return true;
    }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [beneficiaries, selectedCategory, searchTerm]);

  // Export member roster to CSV with explicit group targeting
  const handleExportMembersCSV = (targetGroup?: 'Esther Group' | 'Peace Group' | 'ALL') => {
    const target = targetGroup || (selectedCategory === 'Peace Group' ? 'Peace Group' : selectedCategory === 'ALL' ? 'ALL' : 'Esther Group');

    const exportList = (beneficiaries || []).filter(b => {
      if (target === 'Peace Group') {
        return b.category === 'Peace Group' || Boolean(b.notes && b.notes.toLowerCase().includes('peace'));
      } else if (target === 'Esther Group') {
        return (
          b.category === 'Esther Group Benin' ||
          Boolean(b.notes && b.notes.toLowerCase().includes('esther')) ||
          (!b.category?.toLowerCase().includes('peace') && !b.notes?.toLowerCase().includes('peace'))
        );
      }
      return true;
    }).sort((a, b) => a.fullName.localeCompare(b.fullName));

    const todayStr = new Date().toISOString().slice(0, 10);
    const targetTitle = target === 'Peace Group' ? 'PEACE GROUP' : target === 'ALL' ? 'ALL MINISTRIES' : 'ESTHER GROUP BENIN';
    const filePrefix = target === 'Peace Group' ? 'Peace_Group' : target === 'ALL' ? 'All_Ministries' : 'Esther_Group_Benin';

    const titleBlock = [
      `"","LIGHT UP PRAYER HOUSE — ${targetTitle} REGISTERED MEMBERS ROSTER"`,
      `"","MINISTRY GROUP: ${targetTitle}"`,
      `"","Export Date: ${todayStr} | Total Registered Members: ${exportList.length}"`,
      ''
    ];

    const headers = [
      'S/N',
      'Member Full Name',
      'Phone Number',
      'Ministry Group',
      'Network Provider',
      'Zoom Screen Name',
      'WhatsApp Name',
      'Aliases',
      'Notes'
    ];

    const rows = exportList.map((m, idx) => [
      (idx + 1).toString(),
      `"${(m.fullName || '').replace(/"/g, '""')}"`,
      `"${m.phoneNumber || ''}"`,
      `"${m.category || ''}"`,
      `"${m.network || 'Other'}"`,
      `"${(m.zoomName || '').replace(/"/g, '""')}"`,
      `"${(m.whatsappName || '').replace(/"/g, '""')}"`,
      `"${(m.aliases || []).join('; ').replace(/"/g, '""')}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      ...titleBlock,
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LightUp_${filePrefix}_Members_Roster_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Card */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-amber-500/30 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Registered Roll Call Directory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-cinzel text-amber-100 flex items-center gap-3 flex-wrap">
              <span>Ministry Member Directory</span>
              <span className={`text-xs px-3 py-1 rounded-full font-sans font-bold border flex items-center gap-1.5 ${
                activeGroup === 'Peace Group'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
              }`}>
                <span>{activeGroup === 'Peace Group' ? '🕊️' : '🌸'}</span>
                <span>Active: {activeGroup}</span>
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/90 max-w-2xl">
              Official roll call directory for Light Up Prayer House. Manage member profiles, contact numbers, and Zoom/WhatsApp aliases used for automatic roll call attendance matching.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onSwitchGroupDirect && (
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-purple-900/60 border border-purple-700 shadow-inner">
                <button
                  type="button"
                  onClick={() => onSwitchGroupDirect('Esther Group')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeGroup === 'Esther Group'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                      : 'text-purple-300 hover:text-white'
                  }`}
                  title="Switch to Esther Group"
                >
                  <span>🌸 Esther Group</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchGroupDirect('Peace Group')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
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

            {/* Export Members CSV Button */}
            <button
              onClick={() => handleExportMembersCSV('Esther Group')}
              className="px-3.5 py-2.5 rounded-2xl bg-purple-900/80 hover:bg-purple-800 text-pink-300 font-extrabold text-xs flex items-center gap-1.5 border border-pink-500/50 shadow-md cursor-pointer"
              title="Download CSV for Esther Group members only"
            >
              <Download className="w-4 h-4 text-pink-400" />
              <span>Export Esther Group CSV</span>
            </button>

            {currentRole === 'Admin' && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-purple-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer border border-amber-300"
              >
                <UserPlus className="w-4 h-4 fill-purple-950" />
                <span>Add New Member</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-purple-950/60 border border-purple-800/70 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by full name, phone number, Zoom screen name, or alias..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-purple-900/40 border border-purple-700/80 text-xs sm:text-sm text-purple-100 placeholder-purple-400 focus:outline-none focus:border-amber-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Group Filter Buttons */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all border ${
                selectedCategory === 'ALL'
                  ? 'bg-amber-500 text-purple-950 border-amber-400 font-extrabold shadow-md'
                  : 'bg-purple-900/40 text-purple-200 border-purple-700 hover:bg-purple-900/80'
              }`}
            >
              All Groups ({beneficiaries.length})
            </button>
            <button
              onClick={() => setSelectedCategory('Esther Group')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all border ${
                selectedCategory === 'Esther Group'
                  ? 'bg-pink-600 text-white border-pink-400 font-extrabold shadow-md'
                  : 'bg-purple-900/40 text-purple-200 border-purple-700 hover:bg-purple-900/80'
              }`}
            >
              🌸 Esther Group ({beneficiaries.filter(b => b.category !== 'Peace Group' && !b.notes?.toLowerCase().includes('peace')).length})
            </button>
            <button
              onClick={() => setSelectedCategory('Peace Group')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all border ${
                selectedCategory === 'Peace Group'
                  ? 'bg-emerald-600 text-white border-emerald-400 font-extrabold shadow-md'
                  : 'bg-purple-900/40 text-purple-200 border-purple-700 hover:bg-purple-900/80'
              }`}
            >
              🕊️ Peace Group ({beneficiaries.filter(b => b.category === 'Peace Group' || b.notes?.toLowerCase().includes('peace')).length})
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-purple-300 pt-2 border-t border-purple-900/60">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              Showing <span className="font-bold text-amber-300">{filteredBeneficiaries.length}</span> registered members
            </span>
            {selectedCategory === 'Esther Group' && (
              <span className="text-[11px] font-bold text-pink-300 bg-pink-950/60 border border-pink-700/60 px-2 py-0.5 rounded-full">
                🌸 Esther Group Only
              </span>
            )}
            {selectedCategory === 'Peace Group' && (
              <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                🕊️ Peace Group Only
              </span>
            )}
            {searchTerm && (
              <span className="text-amber-300 font-semibold text-[11px]">
                (Filtered by "{searchTerm}")
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportMembersCSV('Esther Group')}
              className="px-2.5 py-1.5 rounded-xl bg-pink-950/80 hover:bg-pink-900 text-pink-200 border border-pink-700/80 text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-sm"
              title="Export Esther Group members only as CSV"
            >
              <Download className="w-3.5 h-3.5 text-pink-400" />
              <span>Export Esther Group Only CSV</span>
            </button>
            <button
              onClick={() => handleExportMembersCSV(selectedCategory === 'Peace Group' ? 'Peace Group' : selectedCategory === 'ALL' ? 'ALL' : 'Esther Group')}
              className="px-2.5 py-1.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-amber-300 border border-purple-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-sm"
              title="Export current view to CSV"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Current ({filteredBeneficiaries.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Member Directory Table */}
      <div className="rounded-2xl border border-purple-800/80 overflow-hidden shadow-xl bg-purple-950/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-950 text-amber-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-purple-800">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Member Full Name</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Group Assignment</th>
                <th className="py-3 px-4">Zoom / WhatsApp Aliases</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/60">
              {filteredBeneficiaries.map((b, idx) => {
                const isPeace = b.category === 'Peace Group' || b.notes?.toLowerCase().includes('peace');
                const aliasesCount = (b.aliases || []).length;

                return (
                  <tr key={b.id} className="hover:bg-purple-900/30 transition-colors">
                    <td className="py-3 px-4 text-purple-400 font-mono">{idx + 1}</td>
                    
                    <td className="py-3 px-4">
                      <div className="font-bold text-amber-100 text-sm">{b.fullName}</div>
                      {b.notes && (
                        <div className="text-[10px] text-purple-300 italic truncate max-w-xs">{b.notes}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-purple-200">
                      {b.phoneNumber}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                        isPeace
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                      }`}>
                        {isPeace ? '🕊️ Peace Group' : '🌸 Esther Group'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-purple-300">
                      <div className="space-y-0.5">
                        {b.zoomName && (
                          <div className="text-[10px] font-mono text-indigo-300 truncate max-w-xs">
                            🎥 Zoom: <strong>{b.zoomName}</strong>
                          </div>
                        )}
                        {b.whatsappName && (
                          <div className="text-[10px] font-mono text-emerald-300 truncate max-w-xs">
                            💬 WA: <strong>{b.whatsappName}</strong>
                          </div>
                        )}
                        {!b.zoomName && !b.whatsappName && aliasesCount > 1 && (
                          <div className="text-[10px] text-purple-400">
                            {aliasesCount} aliases saved
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenWhatsAppChat(b)}
                          className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 cursor-pointer"
                          title="Open WhatsApp chat"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(b)}
                          className="p-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-amber-300 border border-purple-700/60 cursor-pointer"
                          title="Edit member details & aliases"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {currentRole === 'Admin' && (
                          <button
                            onClick={() => setMemberToDelete(b)}
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 cursor-pointer"
                            title="Delete member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredBeneficiaries.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-purple-400 italic">
                    No members found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-purple-950 to-slate-950 border border-amber-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-purple-800">
              <h3 className="text-base font-extrabold text-amber-100 font-cinzel flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <span>Register New Member</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBeneficiary} className="space-y-3 text-xs">
              <div>
                <label className="block text-purple-300 font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Sister Grace Balogun"
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-700 text-purple-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={handleNewPhoneChange}
                  placeholder="e.g. 0803 123 4567"
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-700 text-purple-100 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">Ministry Group *</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as PurposeCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-700 text-purple-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="Esther Group Benin">🌸 Esther Group (Benin)</option>
                  <option value="Peace Group">🕊️ Peace Group</option>
                  <option value="Widow Support">Widow Support</option>
                  <option value="Youth Outreach">Youth Outreach</option>
                  <option value="Elderly Care">Elderly Care</option>
                  <option value="Visitor">Visitor</option>
                </select>
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">Zoom Screen Name (Optional)</label>
                <input
                  type="text"
                  value={newZoomName}
                  onChange={(e) => setNewZoomName(e.target.value)}
                  placeholder="e.g. Grace's iPhone"
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-700 text-purple-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">WhatsApp Display Name (Optional)</label>
                <input
                  type="text"
                  value={newWhatsappName}
                  onChange={(e) => setNewWhatsappName(e.target.value)}
                  placeholder="e.g. Sis Grace AGL"
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-700 text-purple-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Notes, branch, leadership role..."
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-700 text-purple-100 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-900">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-purple-950 font-extrabold shadow-md cursor-pointer"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingBeneficiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-purple-950 to-slate-950 border border-amber-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-purple-800">
              <h3 className="text-base font-extrabold text-amber-100 font-cinzel flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <span>Edit Member Profile</span>
              </h3>
              <button
                onClick={() => setEditingBeneficiary(null)}
                className="p-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editSaveSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold text-center">
                {editSaveSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-purple-300 font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-700 text-purple-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={handleEditPhoneChange}
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-700 text-purple-100 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">Ministry Group *</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as PurposeCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-700 text-purple-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="Esther Group Benin">🌸 Esther Group (Benin)</option>
                  <option value="Peace Group">🕊️ Peace Group</option>
                  <option value="Widow Support">Widow Support</option>
                  <option value="Youth Outreach">Youth Outreach</option>
                  <option value="Elderly Care">Elderly Care</option>
                  <option value="Visitor">Visitor</option>
                </select>
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">Zoom Screen Name</label>
                <input
                  type="text"
                  value={editZoomName}
                  onChange={(e) => setEditZoomName(e.target.value)}
                  placeholder="e.g. Juliet's iPhone"
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-700 text-purple-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">WhatsApp Display Name</label>
                <input
                  type="text"
                  value={editWhatsappName}
                  onChange={(e) => setEditWhatsappName(e.target.value)}
                  placeholder="e.g. Sister Juliet AGL"
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-700 text-purple-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">Extra Aliases (Comma-separated)</label>
                <input
                  type="text"
                  value={editAliases}
                  onChange={(e) => setEditAliases(e.target.value)}
                  placeholder="e.g. Becky Zoom, Mrs J Imasuem"
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-700 text-purple-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-700 text-purple-100 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-900">
                <button
                  type="button"
                  onClick={() => setEditingBeneficiary(null)}
                  className="px-4 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-purple-950 font-extrabold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-purple-950 to-slate-950 border border-rose-500/40 p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-white font-cinzel">
              Delete Member?
            </h3>
            <p className="text-xs text-purple-300">
              Are you sure you want to remove <strong className="text-amber-300">{memberToDelete.fullName}</strong> ({memberToDelete.phoneNumber}) from the registered directory?
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteBeneficiary(memberToDelete.id);
                  setMemberToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Delete Member
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
