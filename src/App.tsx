import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { AirtimeForm } from './components/AirtimeForm';
import { ReceiptCard } from './components/ReceiptCard';
import { RecordsLibrary } from './components/RecordsLibrary';
import { ReportsSummary } from './components/ReportsSummary';
import { BeneficiariesDirectory } from './components/BeneficiariesDirectory';
import { AttendanceTracker } from './components/AttendanceTracker';
import { BulkMessaging } from './components/BulkMessaging';
import { AdminModal } from './components/AdminModal';
import { ProofModal } from './components/ProofModal';
import { Footer } from './components/Footer';
import { AirtimeRecord, UserRole, AuditLog, Beneficiary, AttendanceSession, BulkMessageLog, MinistryGroup } from './types';
import { GroupSwitchModal } from './components/GroupSwitchModal';
import {
  getStoredRecords,
  addRecord,
  deleteRecord,
  getAuditLogs,
  getCurrentUserRole,
  setCurrentUserRole,
  getCurrentUserName,
  setCurrentUserName,
  getActiveGroup,
  setActiveGroup,
  getBeneficiaries,
  addBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  disburseAirtimeOneClick,
  getAttendanceSessions,
  saveAttendanceSession,
  deleteAttendanceSession,
  getBulkMessageLogs,
  addBulkMessageLog,
  subscribeToBeneficiaries,
  subscribeToAttendanceSessions,
  subscribeToRecords,
  subscribeToAuditLogs,
  subscribeToBulkLogs,
} from './utils/storage';

// Error Boundary to prevent dark blank screens on UI errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('UI Render Error Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-8 text-center rounded-3xl bg-purple-950/90 border border-amber-500/40 text-amber-100 max-w-xl mx-auto space-y-4 shadow-2xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl border border-amber-500/30">
            📋
          </div>
          <h3 className="text-lg font-extrabold text-amber-300 font-cinzel">
            Attendance Register Reset Needed
          </h3>
          <p className="text-xs text-purple-200">
            A temporary display error was caught while loading session records. Click below to reload the attendance register cleanly.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-purple-950 font-extrabold text-xs shadow-lg hover:bg-amber-400 cursor-pointer"
          >
            🔄 Reload Attendance Register
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [records, setRecords] = useState<AirtimeRecord[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [bulkLogs, setBulkLogs] = useState<BulkMessageLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'beneficiaries' | 'attendance' | 'bulk_msg' | 'distribution' | 'records' | 'reports'>('dashboard');
  
  // Navigation transfer state for BulkMessaging
  const [bulkMsgTargetCategory, setBulkMsgTargetCategory] = useState<string>('ALL');
  const [bulkMsgPrePhones, setBulkMsgPrePhones] = useState<string[]>([]);
  const [bulkMsgPreNames, setBulkMsgPreNames] = useState<string[]>([]);

  // User & Access state
  const [currentRole, setRoleState] = useState<UserRole>('Admin');
  const [currentUserName, setUserNameState] = useState<string>('Bro Stephen');

  // Active Ministry Group State (Esther Group vs Peace Group)
  const [activeGroup, setActiveGroupState] = useState<MinistryGroup>(() => getActiveGroup());
  const [authenticatedGroup, setAuthenticatedGroup] = useState<MinistryGroup | null>(null);
  const [pendingTab, setPendingTab] = useState<'beneficiaries' | 'attendance' | 'bulk_msg' | 'distribution' | null>(null);
  const [isGroupSwitchModalOpen, setIsGroupSwitchModalOpen] = useState(false);

  // Modal states
  const [selectedReceiptRecord, setSelectedReceiptRecord] = useState<AirtimeRecord | null>(null);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const isAuthenticated = authenticatedGroup !== null;

  const handleGroupSwitched = (newGroup: MinistryGroup) => {
    setActiveGroupState(newGroup);
    setAuthenticatedGroup(newGroup);
    setActiveGroup(newGroup);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  const handleLogout = () => {
    setAuthenticatedGroup(null);
    setActiveTab('dashboard');
  };

  const handleSelectTab = (tab: 'dashboard' | 'beneficiaries' | 'attendance' | 'bulk_msg' | 'distribution' | 'records' | 'reports') => {
    const protectedTabs = ['beneficiaries', 'attendance', 'bulk_msg', 'distribution'];
    if (protectedTabs.includes(tab) && !isAuthenticated) {
      setPendingTab(tab as any);
      setIsGroupSwitchModalOpen(true);
      return;
    }
    setSelectedReceiptRecord(null);
    setActiveTab(tab);
  };

  // Load initial state and subscribe to real-time Cloud Firestore updates
  useEffect(() => {
    setRecords(getStoredRecords());
    setBeneficiaries(getBeneficiaries());
    setAttendanceSessions(getAttendanceSessions());
    setBulkLogs(getBulkMessageLogs());
    setAuditLogs(getAuditLogs());
    setRoleState(getCurrentUserRole());
    setUserNameState(getCurrentUserName());

    // Subscribe to live multi-device real-time sync
    const unsubBeneficiaries = subscribeToBeneficiaries((bList) => setBeneficiaries(bList));
    const unsubAttendance = subscribeToAttendanceSessions((sList) => setAttendanceSessions(sList));
    const unsubRecords = subscribeToRecords((rList) => setRecords(rList));
    const unsubAudit = subscribeToAuditLogs((aList) => setAuditLogs(aList));
    const unsubBulk = subscribeToBulkLogs((mList) => setBulkLogs(mList));

    return () => {
      unsubBeneficiaries();
      unsubAttendance();
      unsubRecords();
      unsubAudit();
      unsubBulk();
    };
  }, []);

  // Attendance Handlers
  const handleSaveAttendanceSession = (session: AttendanceSession) => {
    const updated = saveAttendanceSession(session, currentUserName, currentRole);
    setAttendanceSessions(updated);
    setAuditLogs(getAuditLogs());
  };

  const handleDeleteAttendanceSession = (id: string) => {
    const updated = deleteAttendanceSession(id, currentUserName, currentRole);
    setAttendanceSessions(updated);
    setAuditLogs(getAuditLogs());
  };

  const handleNavigateToBulkMsg = (category: string, prePhones: string[] = [], preNames: string[] = []) => {
    setBulkMsgTargetCategory(category);
    setBulkMsgPrePhones(prePhones);
    setBulkMsgPreNames(preNames);
    setActiveTab('bulk_msg');
  };

  const handleLogBulkMessage = (log: BulkMessageLog) => {
    addBulkMessageLog(log);
    setBulkLogs(getBulkMessageLogs());
  };

  // Save new record handler
  const handleSaveRecord = (newRecord: AirtimeRecord) => {
    const updated = addRecord(newRecord, currentUserName, currentRole);
    setRecords(updated);
    setAuditLogs(getAuditLogs());
    
    // Immediately display the generated receipt for the new transaction!
    setSelectedReceiptRecord(newRecord);
  };

  // ⚡ 1-Click Airtime Transfer Handler
  const handleOneClickDispatch = (
    beneficiary: Beneficiary,
    amount: number,
    ministerName: string,
    receiptNo: string,
    evidenceSvgUrl?: string
  ) => {
    const result = disburseAirtimeOneClick(
      beneficiary,
      amount,
      ministerName,
      currentRole,
      receiptNo,
      evidenceSvgUrl
    );

    setRecords(result.updatedRecords);
    setBeneficiaries(result.updatedBeneficiaries);
    setAuditLogs(getAuditLogs());

    // Immediately open the newly generated official receipt!
    setSelectedReceiptRecord(result.newRecord);
  };

  // Add Beneficiary Handler
  const handleAddBeneficiary = (b: Beneficiary) => {
    const updated = addBeneficiary(b, currentUserName, currentRole);
    setBeneficiaries(updated);
    setAuditLogs(getAuditLogs());
  };

  // Update Beneficiary Handler
  const handleUpdateBeneficiary = (updatedB: Beneficiary) => {
    const updated = updateBeneficiary(updatedB, currentUserName, currentRole);
    setBeneficiaries(updated);
    setAttendanceSessions(getAttendanceSessions());
    setRecords(getStoredRecords());
    setAuditLogs(getAuditLogs());
  };

  // Delete Beneficiary Handler
  const handleDeleteBeneficiary = (id: string) => {
    const updated = deleteBeneficiary(id, currentUserName, currentRole);
    setBeneficiaries(updated);
    setAuditLogs(getAuditLogs());
  };

  // Delete record handler
  const handleDeleteRecord = (recordId: string) => {
    const updated = deleteRecord(recordId, currentUserName, currentRole);
    setRecords(updated);
    setAuditLogs(getAuditLogs());
    if (selectedReceiptRecord?.id === recordId) {
      setSelectedReceiptRecord(null);
    }
  };

  // Role change handler
  const handleRoleChanged = (newRole: UserRole, newName: string) => {
    setRoleState(newRole);
    setUserNameState(newName);
    setCurrentUserRole(newRole);
    setCurrentUserName(newName);
  };

  // Refresh records from storage after restore
  const handleDataRestored = () => {
    setRecords(getStoredRecords());
    setBeneficiaries(getBeneficiaries());
    setAuditLogs(getAuditLogs());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-purple-950">
      
      {/* Royal Navigation Header */}
      <Header
        currentRole={currentRole}
        userName={currentUserName}
        activeGroup={activeGroup}
        isAuthenticated={isAuthenticated}
        onOpenGroupSwitchModal={() => setIsGroupSwitchModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onLogout={handleLogout}
        onSelectTab={handleSelectTab}
        activeTab={activeTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-8">
        
        {/* If a receipt is active, render Receipt Card view */}
        {selectedReceiptRecord ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedReceiptRecord(null)}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-purple-900/40 px-3 py-1.5 rounded-xl border border-purple-800/80 w-fit"
            >
              ← Back to All Records
            </button>
            <ReceiptCard
              record={selectedReceiptRecord}
              onClose={() => setSelectedReceiptRecord(null)}
              onOpenProofModal={(img) => setSelectedProofUrl(img)}
            />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                records={records}
                beneficiaries={beneficiaries}
                activeGroup={activeGroup}
                isAuthenticated={isAuthenticated}
                onOpenGroupSwitchModal={() => setIsGroupSwitchModalOpen(true)}
                onNavigate={handleSelectTab}
                onViewRecord={(rec) => setSelectedReceiptRecord(rec)}
              />
            )}

            {activeTab === 'beneficiaries' && (
              <BeneficiariesDirectory
                beneficiaries={beneficiaries}
                currentRole={currentRole}
                currentUserName={currentUserName}
                activeGroup={activeGroup}
                onOpenGroupSwitchModal={() => setIsGroupSwitchModalOpen(true)}
                onOneClickDispatch={handleOneClickDispatch}
                onAddBeneficiary={handleAddBeneficiary}
                onUpdateBeneficiary={handleUpdateBeneficiary}
                onDeleteBeneficiary={handleDeleteBeneficiary}
              />
            )}

            {activeTab === 'attendance' && (
              <ErrorBoundary>
                <AttendanceTracker
                  beneficiaries={beneficiaries}
                  attendanceSessions={attendanceSessions}
                  currentRole={currentRole}
                  currentUserName={currentUserName}
                  activeGroup={activeGroup}
                  onOpenGroupSwitchModal={() => setIsGroupSwitchModalOpen(true)}
                  onSaveSession={handleSaveAttendanceSession}
                  onDeleteSession={handleDeleteAttendanceSession}
                  onUpdateBeneficiary={handleUpdateBeneficiary}
                  onNavigateToBulkMsg={handleNavigateToBulkMsg}
                />
              </ErrorBoundary>
            )}

            {activeTab === 'bulk_msg' && (
              <BulkMessaging
                beneficiaries={beneficiaries}
                attendanceSessions={attendanceSessions}
                currentRole={currentRole}
                currentUserName={currentUserName}
                activeGroup={activeGroup}
                initialCategory={bulkMsgTargetCategory}
                initialPreSelectedPhones={bulkMsgPrePhones}
                initialPreSelectedNames={bulkMsgPreNames}
                onLogMessage={handleLogBulkMessage}
              />
            )}

            {activeTab === 'distribution' && (
              <AirtimeForm
                currentUserName={currentUserName}
                activeGroup={activeGroup}
                onSaveRecord={handleSaveRecord}
                onCancel={() => setActiveTab('dashboard')}
              />
            )}

            {activeTab === 'records' && (
              <RecordsLibrary
                records={records}
                currentRole={currentRole}
                currentUserName={currentUserName}
                activeGroup={activeGroup}
                onViewRecord={(rec) => setSelectedReceiptRecord(rec)}
                onDeleteRecord={handleDeleteRecord}
                onNewDistribution={() => setActiveTab('distribution')}
                onOpenProofModal={(img) => setSelectedProofUrl(img)}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsSummary records={records} activeGroup={activeGroup} />
            )}
          </>
        )}

      </main>

      {/* Modals */}
      <GroupSwitchModal
        isOpen={isGroupSwitchModalOpen}
        onClose={() => setIsGroupSwitchModalOpen(false)}
        currentGroup={activeGroup}
        isAuthenticated={isAuthenticated}
        onGroupSwitched={handleGroupSwitched}
        onOpenAdminSettings={() => setIsAdminModalOpen(true)}
      />

      {isAdminModalOpen && (
        <AdminModal
          currentRole={currentRole}
          userName={currentUserName}
          auditLogs={auditLogs}
          onClose={() => setIsAdminModalOpen(false)}
          onRoleChanged={handleRoleChanged}
          onDataRestored={handleDataRestored}
        />
      )}

      {selectedProofUrl && (
        <ProofModal
          imageUrl={selectedProofUrl}
          onClose={() => setSelectedProofUrl(null)}
        />
      )}

      {/* Royal Ministry Footer */}
      <Footer />

    </div>
  );
}
