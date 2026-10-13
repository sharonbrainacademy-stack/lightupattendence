import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { RecordsLibrary } from './components/RecordsLibrary';
import { ReportsSummary } from './components/ReportsSummary';
import { BeneficiariesDirectory } from './components/BeneficiariesDirectory';
import { AttendanceTracker } from './components/AttendanceTracker';
import { BulkMessaging } from './components/BulkMessaging';
import { AdminModal } from './components/AdminModal';
import { Footer } from './components/Footer';
import { UserRole, AuditLog, Beneficiary, AttendanceSession, BulkMessageLog, MinistryGroup } from './types';
import { GroupSwitchModal } from './components/GroupSwitchModal';
import {
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
  batchDeleteBeneficiaries,
  getAttendanceSessions,
  saveAttendanceSession,
  deleteAttendanceSession,
  getBulkMessageLogs,
  addBulkMessageLog,
  subscribeToBeneficiaries,
  subscribeToAttendanceSessions,
  subscribeToAuditLogs,
  subscribeToBulkLogs,
  purgePeaceGroupAndResetToEsther,
  forceHardRefreshApp,
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
        <div className="p-8 text-center text-amber-200 bg-purple-950/80 rounded-3xl border border-amber-500/30 max-w-lg mx-auto my-12 space-y-4">
          <h3 className="text-xl font-bold font-cinzel text-amber-300">Application Notice</h3>
          <p className="text-xs text-purple-200">
            A temporary display issue occurred. Refreshing the view or returning to Overview will restore state.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 text-purple-950 font-bold text-xs cursor-pointer shadow-lg"
          >
            Refresh App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [bulkLogs, setBulkLogs] = useState<BulkMessageLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'beneficiaries' | 'attendance' | 'bulk_msg' | 'records' | 'reports'>('dashboard');
  
  // Navigation transfer state for BulkMessaging
  const [bulkMsgTargetCategory, setBulkMsgTargetCategory] = useState<string>('ALL');
  const [bulkMsgPrePhones, setBulkMsgPrePhones] = useState<string[]>([]);
  const [bulkMsgPreNames, setBulkMsgPreNames] = useState<string[]>([]);

  // User & Access state
  const [currentRole, setRoleState] = useState<UserRole>('Admin');
  const [currentUserName, setUserNameState] = useState<string>('Bro Stephen');

  // Active Ministry Group State (Esther Group vs Peace Group)
  const [activeGroup, setActiveGroupState] = useState<MinistryGroup>(() => getActiveGroup());
  const [authenticatedGroup, setAuthenticatedGroup] = useState<MinistryGroup | null>(() => getActiveGroup());
  const [pendingTab, setPendingTab] = useState<'beneficiaries' | 'attendance' | 'bulk_msg' | null>(null);
  const [isGroupSwitchModalOpen, setIsGroupSwitchModalOpen] = useState(false);

  // Modal states
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

  const handleSelectTab = (tab: 'dashboard' | 'beneficiaries' | 'attendance' | 'bulk_msg' | 'records' | 'reports') => {
    const protectedTabs = ['beneficiaries', 'attendance', 'bulk_msg'];
    if (protectedTabs.includes(tab) && !isAuthenticated) {
      setPendingTab(tab as any);
      setIsGroupSwitchModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  // Load initial state, purge unauthorized peace group members, and subscribe to real-time Cloud Firestore updates
  useEffect(() => {
    // Purge any residual Peace Group members from local storage & Firestore
    const cleanBeneficiaries = purgePeaceGroupAndResetToEsther();
    setBeneficiaries(cleanBeneficiaries);
    setAttendanceSessions(getAttendanceSessions());
    setBulkLogs(getBulkMessageLogs());
    setAuditLogs(getAuditLogs());
    setRoleState(getCurrentUserRole());
    setUserNameState(getCurrentUserName());

    // Subscribe to live multi-device real-time sync
    const unsubBeneficiaries = subscribeToBeneficiaries((bList) => setBeneficiaries(bList));
    const unsubAttendance = subscribeToAttendanceSessions((sList) => setAttendanceSessions(sList));
    const unsubAudit = subscribeToAuditLogs((aList) => setAuditLogs(aList));
    const unsubBulk = subscribeToBulkLogs((mList) => setBulkLogs(mList));

    return () => {
      unsubBeneficiaries();
      unsubAttendance();
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
    setAuditLogs(getAuditLogs());
  };

  // Delete Beneficiary Handler
  const handleDeleteBeneficiary = (id: string) => {
    const updated = deleteBeneficiary(id, currentUserName, currentRole);
    setBeneficiaries(updated);
    setAuditLogs(getAuditLogs());
  };

  // Batch Delete Beneficiaries Handler
  const handleBatchDeleteBeneficiaries = (ids: string[]) => {
    const updated = batchDeleteBeneficiaries(ids, currentUserName, currentRole);
    setBeneficiaries(updated);
    setAuditLogs(getAuditLogs());
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
    setAttendanceSessions(getAttendanceSessions());
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
        onSwitchGroupDirect={handleGroupSwitched}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onLogout={handleLogout}
        onSelectTab={handleSelectTab}
        activeTab={activeTab}
        onForceRefreshApp={forceHardRefreshApp}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-8">
        
        <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
          <Dashboard
            attendanceSessions={attendanceSessions}
            beneficiaries={beneficiaries}
            activeGroup={activeGroup}
            isAuthenticated={isAuthenticated}
            onOpenGroupSwitchModal={() => setIsGroupSwitchModalOpen(true)}
            onSwitchGroupDirect={handleGroupSwitched}
            onNavigate={handleSelectTab}
          />
        </div>

        <div className={activeTab === 'attendance' ? 'block' : 'hidden'}>
          <ErrorBoundary>
            <AttendanceTracker
              beneficiaries={beneficiaries}
              attendanceSessions={attendanceSessions}
              currentRole={currentRole}
              currentUserName={currentUserName}
              activeGroup={activeGroup}
              onOpenGroupSwitchModal={() => setIsGroupSwitchModalOpen(true)}
              onSwitchGroupDirect={handleGroupSwitched}
              onSaveSession={handleSaveAttendanceSession}
              onDeleteSession={handleDeleteAttendanceSession}
              onUpdateBeneficiary={handleUpdateBeneficiary}
              onNavigateToBulkMsg={handleNavigateToBulkMsg}
            />
          </ErrorBoundary>
        </div>

        <div className={activeTab === 'records' ? 'block' : 'hidden'}>
          <RecordsLibrary
            attendanceSessions={attendanceSessions}
            beneficiaries={beneficiaries}
            currentRole={currentRole}
            currentUserName={currentUserName}
            activeGroup={activeGroup}
            onDeleteSession={handleDeleteAttendanceSession}
            onTakeNewAttendance={() => setActiveTab('attendance')}
            onSwitchGroupDirect={handleGroupSwitched}
          />
        </div>

        <div className={activeTab === 'beneficiaries' ? 'block' : 'hidden'}>
          <BeneficiariesDirectory
            beneficiaries={beneficiaries}
            currentRole={currentRole}
            currentUserName={currentUserName}
            activeGroup={activeGroup}
            onOpenGroupSwitchModal={() => setIsGroupSwitchModalOpen(true)}
            onSwitchGroupDirect={handleGroupSwitched}
            onAddBeneficiary={handleAddBeneficiary}
            onUpdateBeneficiary={handleUpdateBeneficiary}
            onDeleteBeneficiary={handleDeleteBeneficiary}
            onBatchDeleteBeneficiaries={handleBatchDeleteBeneficiaries}
          />
        </div>

        <div className={activeTab === 'bulk_msg' ? 'block' : 'hidden'}>
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
        </div>

        <div className={activeTab === 'reports' ? 'block' : 'hidden'}>
          <ReportsSummary
            attendanceSessions={attendanceSessions}
            beneficiaries={beneficiaries}
            activeGroup={activeGroup}
          />
        </div>

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

      {/* Royal Ministry Footer */}
      <Footer />

    </div>
  );
}
