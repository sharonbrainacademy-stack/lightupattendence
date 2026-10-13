import React, { useState } from 'react';
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
  Info
} from 'lucide-react';
import { Beneficiary, UserRole, AttendanceSession, AirtimeRecord } from '../types';
import {
  DuplicateBeneficiaryCluster,
  DuplicateSessionCluster,
  DuplicateAirtimeRecordCluster
} from '../utils/duplicateDetector';

interface DuplicateRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiaryDuplicates: DuplicateBeneficiaryCluster[];
  sessionDuplicates?: DuplicateSessionCluster[];
  airtimeDuplicates?: DuplicateAirtimeRecordCluster[];
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
  onDeleteBeneficiary,
  onBatchDeleteBeneficiaries,
  onDeleteSession,
  onDeleteAirtimeRecord,
  currentRole,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'sessions' | 'airtime'>('members');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalMemberDupes = beneficiaryDuplicates.reduce((acc, c) => acc + c.duplicates.length, 0);
  const totalSessionDupes = sessionDuplicates.reduce((acc, c) => acc + (c.sessions.length - 1), 0);
  const totalAirtimeDupes = airtimeDuplicates.reduce((acc, c) => acc + (c.records.length - 1), 0);
  const totalAllDupes = totalMemberDupes + totalSessionDupes + totalAirtimeDupes;

  const handleDeleteBeneficiaryWithFeedback = (b: Beneficiary) => {
    setDeletingId(b.id);
    onDeleteBeneficiary(b.id);
    setFeedbackMessage(`🗑️ Deleted duplicate record: "${b.fullName}" (${b.phoneNumber}). It will stay permanently deleted.`);
    setTimeout(() => {
      setDeletingId(null);
      setFeedbackMessage(null);
    }, 4000);
  };

  const handleBatchDeleteCluster = (cluster: DuplicateBeneficiaryCluster) => {
    const idsToDelete = cluster.duplicates.map(d => d.id);
    if (idsToDelete.length === 0) return;

    if (onBatchDeleteBeneficiaries) {
      onBatchDeleteBeneficiaries(idsToDelete);
    } else {
      idsToDelete.forEach(id => onDeleteBeneficiary(id));
    }

    setFeedbackMessage(`✅ Cleaned up ${idsToDelete.length} duplicate record(s) for "${cluster.primary.fullName}".`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleDeleteAllMemberDuplicates = () => {
    const allDupeIds: string[] = [];
    beneficiaryDuplicates.forEach(c => {
      c.duplicates.forEach(d => allDupeIds.push(d.id));
    });

    if (allDupeIds.length === 0) return;

    if (onBatchDeleteBeneficiaries) {
      onBatchDeleteBeneficiaries(allDupeIds);
    } else {
      allDupeIds.forEach(id => onDeleteBeneficiary(id));
    }

    setFeedbackMessage(`🎉 All ${allDupeIds.length} duplicate member records permanently deleted!`);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-purple-950/95 via-slate-950 to-purple-950/90 border border-amber-500/40 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-purple-800/50 bg-purple-900/40 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-white font-cinzel">
                  Duplicate Records Inspector &amp; Cleanup
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                  {totalAllDupes} Duplicate{totalAllDupes === 1 ? '' : 's'} Detected
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                Permanently identify and delete redundant duplicate records. Deletions are securely preserved in the deletion registry and will never restore upon refresh.
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
          <div className="flex items-center gap-2">
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

          {activeTab === 'members' && totalMemberDupes > 1 && (
            <button
              onClick={handleDeleteAllMemberDuplicates}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete All {totalMemberDupes} Duplicates
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-5">
              {beneficiaryDuplicates.length === 0 ? (
                <div className="py-12 text-center text-purple-300 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-emerald-300">No Duplicate Members Found</h4>
                  <p className="text-xs text-purple-300/80 max-w-md mx-auto">
                    All registered members have unique phone numbers, names, and aliases. The directory is clean.
                  </p>
                </div>
              ) : (
                beneficiaryDuplicates.map((cluster, idx) => (
                  <div
                    key={cluster.clusterKey || idx}
                    className="rounded-2xl bg-purple-950/60 border border-amber-500/30 overflow-hidden shadow-lg"
                  >
                    {/* Cluster Header */}
                    <div className="p-3.5 sm:p-4 bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/30 text-amber-300 flex items-center justify-center text-xs font-extrabold">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-amber-200">
                              {cluster.reasonLabel}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-300">
                              {cluster.duplicates.length} Redundant Duplicate{cluster.duplicates.length === 1 ? '' : 's'}
                            </span>
                          </div>
                          <p className="text-[11px] text-purple-300">
                            Conflict detected: <strong className="text-white">{cluster.matchedValue}</strong>
                          </p>
                        </div>
                      </div>

                      {cluster.duplicates.length > 0 && (
                        <button
                          onClick={() => handleBatchDeleteCluster(cluster)}
                          className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Redundant ({cluster.duplicates.length})
                        </button>
                      )}
                    </div>

                    {/* Member Cards in Cluster */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Primary Record */}
                      <div className="p-4 rounded-xl bg-purple-900/40 border-2 border-emerald-500/40 relative space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Primary Record (Keep)
                          </span>
                          <span className="text-[10px] font-mono text-purple-400">ID: {cluster.primary.id}</span>
                        </div>

                        <div>
                          <h4 className="text-sm font-extrabold text-white">{cluster.primary.fullName}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-mono mt-0.5">
                            <Phone className="w-3 h-3" />
                            {cluster.primary.phoneNumber} ({cluster.primary.network})
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-purple-300 flex-wrap pt-1">
                          <span className="px-2 py-0.5 rounded-lg bg-purple-800/40">
                            {cluster.primary.category}
                          </span>
                          {cluster.primary.totalReceivedAmount !== undefined && (
                            <span className="text-emerald-400 font-bold">
                              ₦{cluster.primary.totalReceivedAmount.toLocaleString()} Received
                            </span>
                          )}
                          {cluster.primary.lastDisbursedDate && (
                            <span className="text-purple-400">
                              Last: {cluster.primary.lastDisbursedDate}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Duplicate Records */}
                      {cluster.duplicates.map(dupe => (
                        <div
                          key={dupe.id}
                          className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 relative space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-extrabold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Duplicate Entry for Deletion
                            </span>
                            <span className="text-[10px] font-mono text-purple-400">ID: {dupe.id}</span>
                          </div>

                          <div>
                            <h4 className="text-sm font-extrabold text-rose-200">{dupe.fullName}</h4>
                            <div className="flex items-center gap-1.5 text-xs text-amber-300/90 font-mono mt-0.5">
                              <Phone className="w-3 h-3" />
                              {dupe.phoneNumber} ({dupe.network})
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-purple-300 flex-wrap pt-1">
                            <span className="px-2 py-0.5 rounded-lg bg-purple-800/40">
                              {dupe.category}
                            </span>
                            {dupe.notes && (
                              <span className="text-purple-400 italic text-[10px] truncate max-w-[150px]">
                                {dupe.notes}
                              </span>
                            )}
                          </div>

                          <div className="pt-2 border-t border-rose-500/20 flex items-center justify-end">
                            <button
                              onClick={() => handleDeleteBeneficiaryWithFeedback(dupe)}
                              disabled={deletingId === dupe.id}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {deletingId === dupe.id ? 'Deleting...' : 'Delete Duplicate'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {cluster.sessions.map((s, sIdx) => (
                        <div
                          key={s.id}
                          className={`p-3 rounded-xl border ${
                            sIdx === 0
                              ? 'bg-purple-900/30 border-emerald-500/30'
                              : 'bg-rose-950/20 border-rose-500/40'
                          } space-y-2`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white">
                              {sIdx === 0 ? 'Primary Session' : `Duplicate #${sIdx}`}
                            </span>
                            <span className="text-[10px] text-purple-400">ID: {s.id}</span>
                          </div>
                          <div className="text-xs text-purple-300">
                            Attendees: <strong className="text-white">{s.records?.length || 0}</strong>
                          </div>
                          {sIdx > 0 && onDeleteSession && (
                            <button
                              onClick={() => {
                                onDeleteSession(s.id);
                                setFeedbackMessage(`🗑️ Duplicate attendance session deleted: ${s.id}`);
                                setTimeout(() => setFeedbackMessage(null), 4000);
                              }}
                              className="w-full mt-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete Duplicate Session
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Airtime Tab */}
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
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">
                        Duplicate Receipt: <span className="text-amber-300 font-mono">{cluster.receiptNo}</span>
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {cluster.records.map((r, rIdx) => (
                        <div
                          key={r.id}
                          className={`p-3 rounded-xl border ${
                            rIdx === 0
                              ? 'bg-purple-900/30 border-emerald-500/30'
                              : 'bg-rose-950/20 border-rose-500/40'
                          } space-y-2`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white">{r.beneficiaryName}</span>
                            <span className="text-emerald-400 font-bold">₦{r.amount}</span>
                          </div>
                          <div className="text-[11px] text-purple-300">
                            {r.phoneNumber} • {r.distributionDate}
                          </div>
                          {rIdx > 0 && onDeleteAirtimeRecord && (
                            <button
                              onClick={() => {
                                onDeleteAirtimeRecord(r.id);
                                setFeedbackMessage(`🗑️ Duplicate airtime record deleted: ${r.receiptNo}`);
                                setTimeout(() => setFeedbackMessage(null), 4000);
                              }}
                              className="w-full mt-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete Duplicate Record
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Educational Note */}
          <div className="p-3.5 rounded-2xl bg-purple-900/30 border border-purple-800/40 flex items-start gap-2.5 text-xs text-purple-300">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-200">Storage Deletion Guarantee: </span>
              Every deletion executed here is permanently recorded in your browser&apos;s local deletion registry and synced to the database. Even when you refresh or restart your browser, deleted records are strictly blocked from returning.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-purple-800/50 bg-purple-900/40 flex items-center justify-between">
          <span className="text-xs text-purple-300">
            {totalAllDupes === 0
              ? '✨ All directories and logs are duplicate-free'
              : `Found ${totalAllDupes} records needing attention`}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-800 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
