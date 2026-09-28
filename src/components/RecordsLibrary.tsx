import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, FileSpreadsheet, FileText, Printer, Trash2, Edit3, Eye, ShieldCheck, CheckCircle2, Phone, Calendar, ArrowUpDown, PlusCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { AirtimeRecord, NetworkType, UserRole } from '../types';
import { formatNaira } from '../utils/receiptGenerator';
import { getNetworkBadgeStyle } from '../utils/networkDetector';

interface RecordsLibraryProps {
  records: AirtimeRecord[];
  currentRole: UserRole;
  currentUserName: string;
  onViewRecord: (record: AirtimeRecord) => void;
  onEditRecord?: (record: AirtimeRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  onNewDistribution: () => void;
  onOpenProofModal: (imageUrl: string) => void;
}

export const RecordsLibrary: React.FC<RecordsLibraryProps> = ({
  records,
  currentRole,
  currentUserName,
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
  onNewDistribution,
  onOpenProofModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [recordToDelete, setRecordToDelete] = useState<AirtimeRecord | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('ALL');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('ALL');
  const [selectedProofFilter, setSelectedProofFilter] = useState<string>('ALL');
  const [dateSort, setDateSort] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  // Filter & Search records
  const filteredRecords = useMemo(() => {
    return records
      .filter((rec) => {
        const matchesSearch =
          rec.beneficiaryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rec.phoneNumber.includes(searchTerm) ||
          rec.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rec.distributedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rec.purpose.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesNetwork = selectedNetwork === 'ALL' || rec.network === selectedNetwork;
        const matchesPurpose = selectedPurpose === 'ALL' || rec.purpose === selectedPurpose;
        const matchesProof =
          selectedProofFilter === 'ALL' ||
          (selectedProofFilter === 'WITH_PROOF' && !!rec.evidenceUrl) ||
          (selectedProofFilter === 'NO_PROOF' && !rec.evidenceUrl);

        return matchesSearch && matchesNetwork && matchesPurpose && matchesProof;
      })
      .sort((a, b) => {
        const dateA = new Date(a.distributionDate).getTime();
        const dateB = new Date(b.distributionDate).getTime();
        return dateSort === 'NEWEST' ? dateB - dateA : dateA - dateB;
      });
  }, [records, searchTerm, selectedNetwork, selectedPurpose, selectedProofFilter, dateSort]);

  const totalFilteredAmount = filteredRecords.reduce((sum, r) => sum + r.amount, 0);

  // Extract unique purposes for filter dropdown
  const uniquePurposes = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => set.add(r.purpose));
    return Array.from(set);
  }, [records]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const exportData = filteredRecords.map((r) => ({
      'Receipt No': r.receiptNo,
      'Beneficiary Name': r.beneficiaryName,
      'Phone Number': r.phoneNumber,
      'Network': r.network,
      'Amount (NGN)': r.amount,
      'Purpose': r.purpose,
      'Distribution Date': r.distributionDate,
      'Distributed By': r.distributedBy,
      'Notes': r.notes || '',
      'Proof Attached': r.evidenceUrl ? 'YES' : 'NO',
      'Status': r.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Airtime Records');
    XLSX.writeFile(workbook, `LightUp_Outreach_Airtime_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to PDF Document Table
  const handleExportPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('LIGHT UP PRAYER HOUSE — FAMILY OUTREACH', 14, 15);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Airtime Distribution Report — Generated ${new Date().toLocaleDateString()}`, 14, 22);

    let y = 32;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Receipt #', 14, y);
    pdf.text('Beneficiary', 50, y);
    pdf.text('Network', 105, y);
    pdf.text('Amount', 135, y);
    pdf.text('Date', 165, y);

    pdf.line(14, y + 2, 195, y + 2);
    y += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    filteredRecords.forEach((r) => {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(r.receiptNo, 14, y);
      pdf.text(r.beneficiaryName.substring(0, 24), 50, y);
      pdf.text(r.network, 105, y);
      pdf.text(formatNaira(r.amount), 135, y);
      pdf.text(r.distributionDate, 165, y);
      y += 7;
    });

    pdf.save(`LightUp_Airtime_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Title & Top Action Bar */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950 via-purple-900 to-slate-950 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-cinzel text-white flex items-center gap-2">
            <span>📂 Records &amp; Evidence Library</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-sans border border-amber-500/30">
              {filteredRecords.length} Records Found
            </span>
          </h2>
          <p className="text-xs text-amber-200/80 mt-1">
            Search, filter, view attached transaction screenshots, download receipts &amp; export audit spreadsheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onNewDistribution}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-purple-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>➕ New Entry</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            title="Export all filtered records to Excel spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Export</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-700 text-amber-200 font-bold text-xs flex items-center gap-1.5 border border-purple-600 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>PDF Export</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-purple-200 font-bold text-xs flex items-center gap-1 border border-purple-700/60"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-5 rounded-2xl bg-purple-950/60 border border-purple-800/50 space-y-4 backdrop-blur-md">
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Beneficiary Name, Phone, Receipt #, Minister, or Notes..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-900/40 border border-purple-700/60 text-white placeholder-purple-400/60 focus:outline-none focus:border-amber-400 text-sm font-medium"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          
          {/* Network Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-purple-300 mb-1">Network Provider</label>
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
            </select>
          </div>

          {/* Purpose Category Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-purple-300 mb-1">Purpose Category</label>
            <select
              value={selectedPurpose}
              onChange={(e) => setSelectedPurpose(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-purple-900/60 border border-purple-700/60 text-white focus:outline-none focus:border-amber-400"
            >
              <option value="ALL">All Purposes</option>
              {uniquePurposes.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Evidence Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-purple-300 mb-1">Evidence Status</label>
            <select
              value={selectedProofFilter}
              onChange={(e) => setSelectedProofFilter(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-purple-900/60 border border-purple-700/60 text-white focus:outline-none focus:border-amber-400"
            >
              <option value="ALL">All Statuses</option>
              <option value="WITH_PROOF">✅ Has Proof Screenshot</option>
              <option value="NO_PROOF">⚠️ Pending Proof</option>
            </select>
          </div>

          {/* Date Sort */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-purple-300 mb-1">Sort Order</label>
            <button
              onClick={() => setDateSort(dateSort === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
              className="w-full p-2.5 rounded-xl bg-purple-900/60 border border-purple-700/60 text-amber-300 font-bold flex items-center justify-between"
            >
              <span>{dateSort === 'NEWEST' ? 'Newest First' : 'Oldest First'}</span>
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Filter Summary Stats Bar */}
        <div className="pt-2 border-t border-purple-800/40 flex flex-wrap items-center justify-between text-xs text-purple-300">
          <span>Showing <strong className="text-amber-300">{filteredRecords.length}</strong> of {records.length} total records</span>
          <span>Filtered Total: <strong className="text-emerald-400 font-cinzel text-sm">{formatNaira(totalFilteredAmount)}</strong></span>
        </div>

      </div>

      {/* Record List */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-purple-950/40 border border-purple-800/40 text-slate-400 space-y-3">
          <AlertCircle className="w-12 h-12 text-purple-500 mx-auto opacity-50" />
          <p className="text-base font-semibold text-white">No distribution records found matching filters.</p>
          <p className="text-xs">Try clearing your search query or selecting &quot;All Networks&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((rec) => {
            const badgeStyle = getNetworkBadgeStyle(rec.network);
            return (
              <div
                key={rec.id}
                className="p-5 rounded-2xl bg-purple-900/30 hover:bg-purple-900/60 border border-purple-800/50 space-y-4 transition-all relative group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar: Receipt # & Network Badge */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-amber-300 bg-purple-950 px-2.5 py-1 rounded-lg border border-purple-800/80">
                      {rec.receiptNo}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                      {rec.network}
                    </span>
                  </div>

                  {/* Beneficiary Name & Phone */}
                  <div>
                    <h3 className="font-extrabold text-base text-white group-hover:text-amber-300 transition-colors">
                      {rec.beneficiaryName}
                    </h3>
                    <div className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-purple-400" />
                      <span>{rec.phoneNumber}</span>
                    </div>
                  </div>

                  {/* Amount & Purpose Badge */}
                  <div className="p-3 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-purple-300 uppercase font-bold">Amount Sent</div>
                      <div className="text-lg font-extrabold font-cinzel text-emerald-400">
                        {formatNaira(rec.amount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-purple-300 uppercase font-bold">Purpose</div>
                      <div className="text-xs font-semibold text-amber-200">{rec.purpose}</div>
                    </div>
                  </div>

                  {/* Date & Minister */}
                  <div className="text-xs text-purple-300/80 flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-purple-400" />
                      <span>{rec.distributionDate}</span>
                    </div>
                    <span>By: <strong className="text-purple-200">{rec.distributedBy}</strong></span>
                  </div>

                  {/* Evidence Indicator */}
                  {rec.evidenceUrl ? (
                    <button
                      onClick={() => onOpenProofModal(rec.evidenceUrl!)}
                      className="w-full p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>✅ Screenshot Evidence Attached</span>
                      </span>
                      <span className="text-[10px] underline">View Proof</span>
                    </button>
                  ) : (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span>Pending Evidence Screenshot</span>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-purple-800/40 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onViewRecord(rec)}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Receipt</span>
                  </button>

                  {currentRole === 'Admin' && (
                    <button
                      onClick={() => setRecordToDelete(rec)}
                      className="p-2 rounded-xl bg-purple-900/60 hover:bg-rose-600 text-purple-300 hover:text-white transition-colors border border-purple-700/60 cursor-pointer"
                      title="Delete Record (Admin)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Custom Record Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-purple-950 border-2 border-rose-500/60 p-6 shadow-2xl text-white space-y-5 relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-950 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
              🧾❌
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold font-cinzel text-rose-300">
                Delete Distribution Record
              </h3>
              <p className="text-xs text-purple-200">
                Are you sure you want to permanently delete this airtime gift record?
              </p>
              <div className="p-3 rounded-2xl bg-purple-900/60 border border-rose-800/80 text-amber-300 font-extrabold text-sm font-mono">
                {recordToDelete.beneficiaryName} — ₦{recordToDelete.amount.toLocaleString()} ({recordToDelete.receiptNo})
              </div>
              <p className="text-[11px] text-rose-400/90 font-medium italic">
                ⚠️ This transaction record will be removed from system history.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="w-1/2 py-3 rounded-2xl bg-purple-900 hover:bg-purple-800 text-purple-200 font-bold text-xs cursor-pointer border border-purple-700 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteRecord(recordToDelete.id);
                  setRecordToDelete(null);
                }}
                className="w-1/2 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold text-xs shadow-lg shadow-rose-900/50 cursor-pointer border border-rose-400 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Record</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
