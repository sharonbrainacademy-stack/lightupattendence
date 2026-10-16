import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Trash2,
  CheckCircle2,
  X,
  Phone,
  Tag,
  Users,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Info,
  Search,
  Check,
  Star,
  RefreshCw,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { Beneficiary, UserRole, AttendanceSession, AirtimeRecord } from '../types';
import {
  DuplicateBeneficiaryCluster,
  DuplicateSessionCluster,
  DuplicateAirtimeRecordCluster,
  testNameAgainstBeneficiaries,
  DuplicateNameTestResult
} from '../utils/duplicateDetector';

interface DuplicateRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiaryDuplicates: DuplicateBeneficiaryCluster[];
  sessionDuplicates?: DuplicateSessionCluster[];
  airtimeDuplicates?: DuplicateAirtimeRecordCluster[];
  allBeneficiaries?: Beneficiary[];
  onDeleteBeneficiary: (id: string) => void;
  onBatchDeleteBeneficiaries?: (ids: string[]) => void;
  onDeleteSession?: (sessionId: string) => void;
  onDeleteAirtimeRecord?: (recordId: string) => void;
  currentRole: UserRole;
}

export const DuplicateRecordsModal: React.FC<DuplicateRecordsModalProps> = ({
  isOpen,
  onClose,
  beneficiaryDuplicates,
  sessionDuplicates = [],
  airtimeDuplicates = [],
  allBeneficiaries = [],
  onDeleteBeneficiary,
  onBatchDeleteBeneficiaries,
  onDeleteSession,
  onDeleteAirtimeRecord,
  currentRole,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'sessions' | 'airtime'>('members');
  const [memberSubFilter, setMemberSubFilter] = useState<'ALL' | 'NAMES_ONLY' | 'PHONES_ONLY'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  // Overridden primary IDs per cluster (allows user to designate which record to keep)
  const [customPrimaryMap, setCustomPrimaryMap] = useState<Record<string, string>>({});

  // Live Name Detector / Dictator Test Tool state
  const [testInputName, setTestInputName] = useState<string>('');
  const [testResult, setTestResult] = useState<DuplicateNameTestResult | null>(null);

  if (!isOpen) return null;

  // Filter clusters based on subFilter
  const filteredClusters = beneficiaryDuplicates.filter(c => {
    if (memberSubFilter === 'NAMES_ONLY') {
      return c.reasonType === 'SAME_NAME' || c.reasonType === 'SAME_ALIAS' || c.reasonType === 'SAME_NAME_AND_PHONE';
    }
    if (memberSubFilter === 'PHONES_ONLY') {
      return c.reasonType === 'SAME_PHONE' || c.reasonType === 'SAME_NAME_AND_PHONE';
    }
    return true;
  });

  const nameClustersCount = beneficiaryDuplicates.filter(
    c => c.reasonType === 'SAME_NAME' || c.reasonType === 'SAME_ALIAS' || c.reasonType === 'SAME_NAME_AND_PHONE'
  ).length;

  const phoneClustersCount = beneficiaryDuplicates.filter(
    c => c.reasonType === 'SAME_PHONE' || c.reasonType === 'SAME_NAME_AND_PHONE'
  ).length;

  const totalMemberDupes = beneficiaryDuplicates.reduce((acc, c) => acc + c.duplicates.length, 0);
  const totalSessionDupes = sessionDuplicates.reduce((acc, c) => acc + (c.sessions.length - 1), 0);
  const totalAirtimeDupes = airtimeDuplicates.reduce((acc, c) => acc + (c.records.length - 1), 0);
  const totalAllDupes = totalMemberDupes + totalSessionDupes + totalAirtimeDupes;

  // Handler: Test name against directory live
  const handleRunLiveNameTest = (nameToTest: string) => {
    setTestInputName(nameToTest);
    if (!nameToTest.trim()) {
      setTestResult(null);
      return;
    }
    const res = testNameAgainstBeneficiaries(nameToTest, allBeneficiaries);
    setTestResult(res);
  };

  // Handler: Set custom primary record for a cluster
  const handleSetPrimary = (clusterKey: string, memberId: string) => {
    setCustomPrimaryMap(prev => ({ ...prev, [clusterKey]: memberId }));
    setFeedbackMessage('⭐ Updated primary record selection for this cluster.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Handler: Delete single beneficiary
  const handleDeleteBeneficiaryWithFeedback = (b: Beneficiary) => {
    setDeletingId(b.id);
    onDeleteBeneficiary(b.id);
    setFeedbackMessage(`🗑️ Deleted duplicate record: "${b.fullName}" (${b.phoneNumber || 'No phone'}). Permanently removed.`);
    setTimeout(() => {
      setDeletingId(null);
      setFeedbackMessage(null);
    }, 4000);
  };

  // Handler: Delete all redundant in a cluster
  const handleBatchDeleteCluster = (cluster: DuplicateBeneficiaryCluster) => {
    const selectedPrimaryId = customPrimaryMap[cluster.clusterKey] || cluster.primary.id;
    const idsToDelete = cluster.allMembers.filter(m => m.id !== selectedPrimaryId).map(m => m.id);
    if (idsToDelete.length === 0) return;

    if (onBatchDeleteBeneficiaries) {
      onBatchDeleteBeneficiaries(idsToDelete);
    } else {
      idsToDelete.forEach(id => onDeleteBeneficiary(id));
    }

    const primaryMember = cluster.allMembers.find(m => m.id === selectedPrimaryId) || cluster.primary;
    setFeedbackMessage(`✅ Cleaned up ${idsToDelete.length} redundant duplicate(s) for "${primaryMember.fullName}".`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Handler: Delete all duplicates across all clusters
  const handleDeleteAllMemberDuplicates = () => {
    const allDupeIds: string[] = [];
    beneficiaryDuplicates.forEach(c => {
      const selectedPrimaryId = customPrimaryMap[c.clusterKey] || c.primary.id;
      const redundant = c.allMembers.filter(m => m.id !== selectedPrimaryId);
      redundant.forEach(d => allDupeIds.push(d.id));
    });

    if (allDupeIds.length === 0) return;

    if (onBatchDeleteBeneficiaries) {
      onBatchDeleteBeneficiaries(allDupeIds);
    } else {
      allDupeIds.forEach(id => onDeleteBeneficiary(id));
    }

    setConfirmDeleteAll(false);
    setFeedbackMessage(`🎉 All ${allDupeIds.length} duplicate member records have been permanently deleted!`);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-purple-950/95 via-slate-950 to-purple-950/90 border border-amber-500/40 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-purple-800/50 bg-purple-900/40 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-600/20 border border-amber-500/50 text-amber-300 flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-extrabold text-white font-cinzel">
                  Duplicate Name &amp; Record Detector &amp; Cleanup
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                  {totalAllDupes} Duplicate{totalAllDupes === 1 ? '' : 's'} Detected
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                Strict single-to-single &amp; group-to-group name detector with one-click permanent deletion. Deletions are securely preserved in the deletion registry.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback notification toast */}
        {feedbackMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 shadow-lg animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{feedbackMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-4 border-b border-purple-800/40 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'members'
                  ? 'bg-amber-500 text-purple-950 shadow-md font-extrabold'
                  : 'bg-purple-900/40 text-purple-300 hover:bg-purple-800/50'
              }`}
            >
              <Users className="w-4 h-4" />
              Member Directory ({totalMemberDupes})
            </button>

            {sessionDuplicates.length > 0 && (
              <button
                onClick={() => setActiveTab('sessions')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'sessions'
                    ? 'bg-amber-500 text-purple-950 shadow-md font-extrabold'
                    : 'bg-purple-900/40 text-purple-300 hover:bg-purple-800/50'
                }`}
              >
                Attendance Sessions ({totalSessionDupes})
              </button>
            )}

            {airtimeDuplicates.length > 0 && (
              <button
                onClick={() => setActiveTab('airtime')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'airtime'
                    ? 'bg-amber-500 text-purple-950 shadow-md font-extrabold'
                    : 'bg-purple-900/40 text-purple-300 hover:bg-purple-800/50'
                }`}
              >
                Airtime Records ({totalAirtimeDupes})
              </button>
            )}
          </div>

          {activeTab === 'members' && totalMemberDupes > 0 && (
            <div>
              {!confirmDeleteAll ? (
                <button
                  onClick={() => setConfirmDeleteAll(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete All {totalMemberDupes} Duplicates
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-500/60 p-1.5 rounded-xl">
                  <span className="text-[11px] text-rose-200 font-bold px-1">
                    Delete {totalMemberDupes} records permanently?
                  </span>
                  <button
                    onClick={handleDeleteAllMemberDuplicates}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer shadow-sm"
                  >
                    Yes, Delete All
                  </button>
                  <button
                    onClick={() => setConfirmDeleteAll(false)}
                    className="px-2 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              
              {/* Interactive Live Name Duplicate Tester / Dictator */}
              <div className="p-4 rounded-2xl bg-purple-900/30 border border-amber-500/40 shadow-inner space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs sm:text-sm font-extrabold text-white">
                      🧪 Live Duplicate Name Detector &amp; Simulator
                    </h4>
                  </div>
                  <span className="text-[10px] text-purple-300 font-mono">
                    Scans {allBeneficiaries.length} members with strict rules
                  </span>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={testInputName}
                      onChange={(e) => handleRunLiveNameTest(e.target.value)}
                      placeholder="Type any name (e.g. 'NK', 'nk', 'Johnson Juliet', 'Sister Becky')..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl bg-purple-950/80 border border-purple-700 text-xs text-white placeholder-purple-400 focus:outline-none focus:border-amber-400"
                    />
                    {testInputName && (
                      <button
                        onClick={() => {
                          setTestInputName('');
                          setTestResult(null);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleRunLiveNameTest(testInputName)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-black text-xs cursor-pointer shadow-md shrink-0"
                  >
                    Test Name
                  </button>
                </div>

                {/* Quick test preset chips */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-purple-300">
                  <span className="font-semibold text-purple-400">Quick tests:</span>
                  {['NK', 'nk', 'Nk', 'nK', 'N.K.', 'Juliet Imasuen', 'Imasuen Juliet'].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleRunLiveNameTest(chip)}
                      className="px-2 py-0.5 rounded-lg bg-purple-800/40 hover:bg-purple-800 text-amber-200 border border-purple-700/60 font-mono cursor-pointer transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Live Test Result Card */}
                {testResult && (
                  <div className={`p-3 rounded-xl border text-xs animate-fadeIn ${
                    testResult.isDuplicateMatch
                      ? 'bg-amber-950/70 border-amber-500/50 text-amber-200'
                      : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {testResult.isDuplicateMatch ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <div>
                          <strong className="text-white font-bold">
                            {testResult.isDuplicateMatch ? '⚠️ Duplicate Name Detected!' : '✨ Clean & Unique'}
                          </strong>
                          {testResult.matchedBeneficiary && (
                            <span className="ml-1.5 font-mono text-[11px] text-amber-300">
                              Matches member: <strong>{testResult.matchedBeneficiary.fullName}</strong> ({testResult.matchedBeneficiary.category})
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-purple-900/60 text-[10px] font-mono text-purple-200 shrink-0">
                        {testResult.confidence}% confidence
                      </span>
                    </div>
                    {testResult.ruleExplanation && (
                      <p className="text-[11px] text-purple-200 mt-1 pl-6">
                        {testResult.ruleExplanation}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Sub-Filter Controls */}
              {beneficiaryDuplicates.length > 0 && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-purple-300 font-semibold mr-1">Filter by:</span>
                    <button
                      onClick={() => setMemberSubFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        memberSubFilter === 'ALL'
                          ? 'bg-purple-800 text-white border border-purple-500 shadow-sm'
                          : 'bg-purple-950/60 text-purple-300 hover:bg-purple-900/60'
                      }`}
                    >
                      All Types ({beneficiaryDuplicates.length})
                    </button>
                    <button
                      onClick={() => setMemberSubFilter('NAMES_ONLY')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        memberSubFilter === 'NAMES_ONLY'
                          ? 'bg-amber-500 text-purple-950 font-black shadow-sm'
                          : 'bg-purple-950/60 text-amber-300 hover:bg-purple-900/60'
                      }`}
                    >
                      <span>🔍 Duplicate Names ({nameClustersCount})</span>
                    </button>
                    <button
                      onClick={() => setMemberSubFilter('PHONES_ONLY')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        memberSubFilter === 'PHONES_ONLY'
                          ? 'bg-indigo-600 text-white font-black shadow-sm'
                          : 'bg-purple-950/60 text-indigo-300 hover:bg-purple-900/60'
                      }`}
                    >
                      <span>📱 Duplicate Phones ({phoneClustersCount})</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-purple-400 font-mono">
                    Showing {filteredClusters.length} cluster{filteredClusters.length === 1 ? '' : 's'}
                  </span>
                </div>
              )}

              {/* Duplicate Clusters List */}
              {filteredClusters.length === 0 ? (
                <div className="py-12 text-center text-purple-300 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-emerald-300">
                    {beneficiaryDuplicates.length === 0 ? 'No Duplicate Records Found' : 'No Duplicates in Selected Filter'}
                  </h4>
                  <p className="text-xs text-purple-300/80 max-w-md mx-auto">
                    {beneficiaryDuplicates.length === 0
                      ? 'All registered members comply with strict name and phone uniqueness rules. The directory is completely clean!'
                      : 'Switch filters above to inspect other duplicate categories.'}
                  </p>
                </div>
              ) : (
                filteredClusters.map((cluster, idx) => {
                  const selectedPrimaryId = customPrimaryMap[cluster.clusterKey] || cluster.primary.id;
                  const primaryMember = cluster.allMembers.find(m => m.id === selectedPrimaryId) || cluster.primary;
                  const redundantMembers = cluster.allMembers.filter(m => m.id !== selectedPrimaryId);

                  return (
                    <div
                      key={cluster.clusterKey || idx}
                      className="rounded-2xl bg-purple-950/60 border border-amber-500/40 overflow-hidden shadow-lg"
                    >
                      {/* Cluster Header */}
                      <div className="p-3.5 sm:p-4 bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/30 text-amber-300 flex items-center justify-center text-xs font-extrabold">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-extrabold text-amber-200">
                                {cluster.reasonLabel}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                                {redundantMembers.length} Redundant Duplicate{redundantMembers.length === 1 ? '' : 's'}
                              </span>
                            </div>
                            <p className="text-[11px] text-purple-300">
                              Conflict match: <strong className="text-white">{cluster.matchedValue}</strong>
                            </p>
                          </div>
                        </div>

                        {redundantMembers.length > 0 && (
                          <button
                            onClick={() => handleBatchDeleteCluster(cluster)}
                            className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Redundant ({redundantMembers.length})
                          </button>
                        )}
                      </div>

                      {/* Member Cards in Cluster */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Primary Record */}
                        <div className="p-4 rounded-xl bg-purple-900/40 border-2 border-emerald-500/50 relative space-y-2.5 shadow-md">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold flex items-center gap-1 border border-emerald-500/40">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Primary Record (Kept)
                            </span>
                            <span className="text-[10px] font-mono text-purple-400">ID: {primaryMember.id}</span>
                          </div>

                          <div>
                            <h4 className="text-sm font-extrabold text-white">{primaryMember.fullName}</h4>
                            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-mono mt-0.5">
                              <Phone className="w-3 h-3" />
                              {primaryMember.phoneNumber ? `${primaryMember.phoneNumber} (${primaryMember.network})` : 'No phone recorded'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-purple-300 flex-wrap pt-1">
                            <span className="px-2 py-0.5 rounded-lg bg-purple-800/40 font-bold">
                              {primaryMember.category}
                            </span>
                            {primaryMember.totalReceivedAmount !== undefined && (
                              <span className="text-emerald-400 font-bold">
                                ₦{primaryMember.totalReceivedAmount.toLocaleString()} Received
                              </span>
                            )}
                            {primaryMember.lastDisbursedDate && (
                              <span className="text-purple-400">
                                Last: {primaryMember.lastDisbursedDate}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Duplicate Records for Deletion */}
                        {redundantMembers.map(dupe => (
                          <div
                            key={dupe.id}
                            className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 relative space-y-2.5 shadow-md"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-extrabold flex items-center gap-1 border border-rose-500/40">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                Redundant Duplicate (For Deletion)
                              </span>
                              <span className="text-[10px] font-mono text-purple-400">ID: {dupe.id}</span>
                            </div>

                            <div>
                              <h4 className="text-sm font-extrabold text-rose-200">{dupe.fullName}</h4>
                              <div className="flex items-center gap-1.5 text-xs text-amber-300/90 font-mono mt-0.5">
                                <Phone className="w-3 h-3" />
                                {dupe.phoneNumber ? `${dupe.phoneNumber} (${dupe.network})` : 'No phone recorded'}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-purple-300 flex-wrap pt-1">
                              <span className="px-2 py-0.5 rounded-lg bg-purple-800/40 font-bold">
                                {dupe.category}
                              </span>
                              {dupe.notes && (
                                <span className="text-purple-400 italic text-[10px] truncate max-w-[150px]">
                                  {dupe.notes}
                                </span>
                              )}
                            </div>

                            <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between gap-2">
                              {/* Option to keep this one instead */}
                              <button
                                type="button"
                                onClick={() => handleSetPrimary(cluster.clusterKey, dupe.id)}
                                className="text-[11px] text-amber-300 hover:text-amber-200 underline font-semibold flex items-center gap-1 cursor-pointer"
                                title="Swap and keep this record as Primary instead"
                              >
                                <Star className="w-3 h-3 text-amber-400" />
                                <span>Keep this instead</span>
                              </button>

                              {/* Delete duplicate button */}
                              <button
                                onClick={() => handleDeleteBeneficiaryWithFeedback(dupe)}
                                disabled={deletingId === dupe.id}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {deletingId === dupe.id ? 'Deleting...' : 'Delete Duplicate'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Attendance Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              {sessionDuplicates.length === 0 ? (
                <div className="py-12 text-center text-purple-300 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs">No duplicate attendance sessions detected.</p>
                </div>
              ) : (
                sessionDuplicates.map((cluster, idx) => (
                  <div
                    key={cluster.clusterKey || idx}
                    className="p-4 rounded-2xl bg-purple-950/60 border border-amber-500/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {cluster.serviceName} ({cluster.serviceDate})
                        </h4>
                        <p className="text-xs text-amber-300">
                          {cluster.sessions.length} sessions recorded on the same date for this service
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {cluster.sessions.map((s, sIdx) => (
                        <div
                          key={s.id}
                          className={`p-3 rounded-xl border ${
                            sIdx === 0
                              ? 'bg-purple-900/40 border-emerald-500/40'
                              : 'bg-rose-950/30 border-rose-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white">{s.serviceName}</span>
                            <span className="text-purple-400 font-mono text-[10px]">{s.id}</span>
                          </div>
                          <div className="text-[11px] text-purple-300 mt-1">
                            {s.records?.length || 0} attendees • Recorded by: {s.recordedBy}
                          </div>
                          {sIdx > 0 && onDeleteSession && (
                            <div className="mt-2.5 pt-2 border-t border-purple-800/40 flex justify-end">
                              <button
                                onClick={() => onDeleteSession(s.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete Duplicate Session
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Airtime Records Tab */}
          {activeTab === 'airtime' && (
            <div className="space-y-4">
              {airtimeDuplicates.length === 0 ? (
                <div className="py-12 text-center text-purple-300 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs">No duplicate airtime transaction receipts detected.</p>
                </div>
              ) : (
                airtimeDuplicates.map((cluster, idx) => (
                  <div
                    key={cluster.receiptNo || idx}
                    className="p-4 rounded-2xl bg-purple-950/60 border border-amber-500/30 space-y-3"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-white">Receipt: {cluster.receiptNo}</h4>
                      <p className="text-xs text-amber-300">{cluster.records.length} records share this receipt number</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {cluster.records.map((r, rIdx) => (
                        <div
                          key={r.id}
                          className={`p-3 rounded-xl border ${
                            rIdx === 0
                              ? 'bg-purple-900/40 border-emerald-500/40'
                              : 'bg-rose-950/30 border-rose-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white">{r.beneficiaryName}</span>
                            <span className="text-emerald-400 font-mono">₦{r.amount.toLocaleString()}</span>
                          </div>
                          <div className="text-[11px] text-purple-300 mt-1">
                            {r.phoneNumber} ({r.network}) • {r.distributionDate}
                          </div>
                          {rIdx > 0 && onDeleteAirtimeRecord && (
                            <div className="mt-2.5 pt-2 border-t border-purple-800/40 flex justify-end">
                              <button
                                onClick={() => onDeleteAirtimeRecord(r.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete Duplicate Receipt
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-purple-800/50 bg-purple-950/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-purple-300">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {totalMemberDupes > 0
                ? `${totalMemberDupes} redundant duplicate record(s) available for permanent deletion.`
                : 'Directory verified clean. No duplicate conflicts exist.'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-800 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
