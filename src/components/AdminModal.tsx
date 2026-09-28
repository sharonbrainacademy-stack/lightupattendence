import React, { useState, useEffect } from 'react';
import { Shield, Key, Lock, UserCheck, Database, FileText, Download, Upload, Check, AlertCircle, X, History, Sparkles, CreditCard, RefreshCw } from 'lucide-react';
import { UserRole, AuditLog } from '../types';
import { getAdminPassword, setAdminPassword, exportBackupJSON, importBackupJSON } from '../utils/storage';
import { getVTPassConfig, saveVTPassConfig, VTPassConfig } from '../utils/vtpassService';

interface AdminModalProps {
  currentRole: UserRole;
  userName: string;
  auditLogs: AuditLog[];
  onClose: () => void;
  onRoleChanged: (newRole: UserRole, newName: string) => void;
  onDataRestored: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  currentRole,
  userName,
  auditLogs,
  onClose,
  onRoleChanged,
  onDataRestored,
}) => {
  const [activeTab, setActiveTab] = useState<'AUTH' | 'ROLE' | 'AUDIT' | 'BACKUP' | 'VTPASS'>('ROLE');
  
  // VTPass Config State
  const [vtpassForm, setVtpassForm] = useState<VTPassConfig>({
    apiKey: '',
    secretKey: '',
    publicKey: '',
    mode: 'live'
  });
  const [vtpassSaveMsg, setVtpassSaveMsg] = useState('');
  const [vtpassBalanceStatus, setVtpassBalanceStatus] = useState<string>('');
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  useEffect(() => {
    setVtpassForm(getVTPassConfig());
  }, []);

  const handleSaveVTPass = (e: React.FormEvent) => {
    e.preventDefault();
    saveVTPassConfig(vtpassForm);
    setVtpassSaveMsg('✅ VTPass credentials saved to local ministry settings!');
    setTimeout(() => setVtpassSaveMsg(''), 4000);
  };

  const handleCheckVTPassBalance = async () => {
    setIsCheckingBalance(true);
    setVtpassBalanceStatus('Connecting to VTPass API...');
    try {
      const res = await fetch('/api/vtpass/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vtpassForm)
      });
      const data = await res.json();
      if (res.ok && data.configured && data.data) {
        if (data.data.code === "000" && data.data.contents) {
          setVtpassBalanceStatus(`💰 VTPass Wallet Balance: ₦${data.data.contents.balance.toLocaleString()}`);
        } else {
          setVtpassBalanceStatus(`Response: ${data.data.response_description || JSON.stringify(data.data)}`);
        }
      } else if (!data.configured) {
        setVtpassBalanceStatus('⚠️ Please enter your VTPass API Key & Secret Key first.');
      } else {
        setVtpassBalanceStatus(`Error: ${data.error || 'Failed to fetch balance'}`);
      }
    } catch (err: any) {
      setVtpassBalanceStatus(`Network Error: ${err.message}`);
    } finally {
      setIsCheckingBalance(false);
    }
  };
  
  // Password Auth State
  const [inputPassword, setInputPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);

  // Change Password State
  const [newPassword, setNewPassword] = useState('');
  const [passChangedMsg, setPassChangedMsg] = useState('');

  // Role Form
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [nameInput, setNameInput] = useState(userName);

  // Backup / Restore
  const [importStatus, setImportStatus] = useState('');

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const currentPass = getAdminPassword();
    if (inputPassword === currentPass) {
      setAuthSuccess(true);
      setAuthError('');
      onRoleChanged('Admin', nameInput || 'Bro Stephen');
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      setAuthError('Incorrect Admin Password. Try default: lightup2026');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    setAdminPassword(newPassword.trim());
    setPassChangedMsg('Admin password updated successfully!');
    setNewPassword('');
    setTimeout(() => setPassChangedMsg(''), 3000);
  };

  const handleRoleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === 'Admin' && currentRole !== 'Admin' && !authSuccess) {
      setActiveTab('AUTH');
      return;
    }
    onRoleChanged(selectedRole, nameInput.trim() || 'Ministry Volunteer');
    onClose();
  };

  const handleExportBackup = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LightUp_Outreach_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupJSON(content);
      if (success) {
        setImportStatus('Backup restored successfully!');
        onDataRestored();
        setTimeout(() => setImportStatus(''), 3000);
      } else {
        setImportStatus('Failed to restore backup. Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-3xl bg-purple-950 border-2 border-amber-500/40 p-6 sm:p-8 shadow-2xl text-white space-y-6 relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold font-cinzel text-amber-300">
                🔐 Ministry Admin &amp; Access Controls
              </h3>
              <p className="text-xs text-purple-200/80">
                Manage roles, view audit logs, change admin password &amp; export database backups.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2.5 rounded-2xl bg-purple-900 hover:bg-rose-600 text-amber-300 hover:text-white transition-all border border-purple-700/60 flex items-center gap-1.5 font-bold text-xs"
          >
            <X className="w-5 h-5" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex bg-purple-900/40 p-1 rounded-2xl border border-purple-800/60 text-xs font-bold gap-1">
          <button
            onClick={() => setActiveTab('ROLE')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ROLE' ? 'bg-amber-500 text-purple-950 font-extrabold' : 'text-purple-300 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Switch Role</span>
          </button>

          <button
            onClick={() => setActiveTab('AUTH')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'AUTH' ? 'bg-amber-500 text-purple-950 font-extrabold' : 'text-purple-300 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Admin Auth</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'AUDIT' ? 'bg-amber-500 text-purple-950 font-extrabold' : 'text-purple-300 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>

          <button
            onClick={() => setActiveTab('VTPASS')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'VTPASS' ? 'bg-amber-500 text-purple-950 font-extrabold' : 'text-purple-300 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>VTPass API</span>
          </button>

          <button
            onClick={() => setActiveTab('BACKUP')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'BACKUP' ? 'bg-amber-500 text-purple-950 font-extrabold' : 'text-purple-300 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Backup</span>
          </button>
        </div>

        {/* Tab 1: Switch Role & Name */}
        {activeTab === 'ROLE' && (
          <form onSubmit={handleRoleSave} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-amber-300">Your Full Name / Title</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Bro Stephen"
                className="w-full px-4 py-3 rounded-xl bg-purple-900/40 border border-purple-700 text-white text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-amber-300">Select Access Role</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('Admin')}
                  className={`p-4 rounded-xl border text-left space-y-1 transition-all ${
                    selectedRole === 'Admin'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-purple-900/30 border-purple-800 text-purple-300'
                  }`}
                >
                  <div className="font-bold text-sm text-white">Admin (Full Access)</div>
                  <div className="text-[10px] text-purple-300">Can add, edit, delete &amp; manage password</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('Minister')}
                  className={`p-4 rounded-xl border text-left space-y-1 transition-all ${
                    selectedRole === 'Minister'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-purple-900/30 border-purple-800 text-purple-300'
                  }`}
                >
                  <div className="font-bold text-sm text-white">Minister / Volunteer</div>
                  <div className="text-[10px] text-purple-300">Disburse airtime &amp; view receipts</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('Auditor')}
                  className={`p-4 rounded-xl border text-left space-y-1 transition-all ${
                    selectedRole === 'Auditor'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-purple-900/30 border-purple-800 text-purple-300'
                  }`}
                >
                  <div className="font-bold text-sm text-white">View-Only Auditor</div>
                  <div className="text-[10px] text-purple-300">Leadership transparency audit access</div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-extrabold text-sm"
            >
              Save Profile &amp; Switch Role
            </button>
          </form>
        )}

        {/* Tab 2: Admin Password Verification & Change */}
        {activeTab === 'AUTH' && (
          <div className="space-y-6">
            <form onSubmit={handleVerifyPassword} className="space-y-3 p-4 rounded-2xl bg-purple-900/30 border border-purple-800/60">
              <label className="block text-xs font-bold uppercase text-amber-300">Verify Admin Password</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="Enter admin password (default: lightup2026)"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-purple-950 border border-purple-700 text-white text-sm"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-extrabold text-xs"
                >
                  Verify
                </button>
              </div>

              {authError && (
                <div className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500 text-xs text-emerald-300 font-bold flex items-center justify-between gap-2 animate-fadeIn">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Admin Privileges Verified! Opening Dashboard...</span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-purple-950 font-extrabold text-xs shadow-md cursor-pointer"
                  >
                    🚀 Open Dashboard
                  </button>
                </div>
              )}
            </form>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-3 p-4 rounded-2xl bg-purple-900/30 border border-purple-800/60">
              <label className="block text-xs font-bold uppercase text-amber-300">Set New Admin Password</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-purple-950 border border-purple-700 text-white text-sm"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-700 text-amber-300 font-bold text-xs border border-purple-600"
                >
                  Update Password
                </button>
              </div>

              {passChangedMsg && (
                <div className="text-xs text-emerald-400 font-semibold">{passChangedMsg}</div>
              )}
            </form>
          </div>
        )}

        {/* Tab 3: Audit Trail Log */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-3">
            <div className="text-xs text-purple-300">All changes and distributions are automatically logged with timestamp:</div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-purple-900/40 border border-purple-800/60 text-xs space-y-1">
                  <div className="flex items-center justify-between text-amber-300 font-bold">
                    <span>{log.user} ({log.role})</span>
                    <span className="text-[10px] text-purple-300 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-white font-medium">{log.details}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: VTPass API Configuration & Wallet Check */}
        {activeTab === 'VTPASS' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/60 to-slate-900 border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-amber-300 flex items-center gap-2 font-cinzel">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>⚡ VTPass Live Airtime Auto-Topup API</span>
                  </h4>
                  <p className="text-xs text-purple-200/90 mt-1">
                    Connect your <strong>VTPass Merchant Account</strong> (vtpass.com) to allow 1-click automatic airtime dispatch directly from your VTPass Wallet balance.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveVTPass} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-300 mb-1">VTPass API Key</label>
                    <input
                      type="text"
                      value={vtpassForm.apiKey}
                      onChange={(e) => setVtpassForm({ ...vtpassForm, apiKey: e.target.value })}
                      placeholder="e.g. 5d8a... (from VTPass account)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-950 border border-purple-700 text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-300 mb-1">VTPass Secret Key</label>
                    <input
                      type="password"
                      value={vtpassForm.secretKey}
                      onChange={(e) => setVtpassForm({ ...vtpassForm, secretKey: e.target.value })}
                      placeholder="e.g. SK_... (from VTPass account)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-950 border border-purple-700 text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-300 mb-1">VTPass Public Key (Optional)</label>
                    <input
                      type="text"
                      value={vtpassForm.publicKey}
                      onChange={(e) => setVtpassForm({ ...vtpassForm, publicKey: e.target.value })}
                      placeholder="e.g. PK_... (if applicable)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-950 border border-purple-700 text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-300 mb-1">Account Mode</label>
                    <select
                      value={vtpassForm.mode}
                      onChange={(e) => setVtpassForm({ ...vtpassForm, mode: e.target.value as 'live' | 'sandbox' })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-950 border border-purple-700 text-white text-xs font-extrabold"
                    >
                      <option value="live">🟢 Live Production Account</option>
                      <option value="sandbox">🟡 Sandbox Testing Account</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-extrabold text-xs shadow-md cursor-pointer"
                  >
                    💾 Save VTPass API Settings
                  </button>

                  <button
                    type="button"
                    onClick={handleCheckVTPassBalance}
                    disabled={isCheckingBalance}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-700 text-amber-300 border border-purple-600 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBalance ? 'animate-spin' : ''}`} />
                    <span>Check Wallet Balance</span>
                  </button>
                </div>

                {vtpassSaveMsg && (
                  <div className="text-xs font-bold text-emerald-400 p-2.5 bg-emerald-950/60 rounded-xl border border-emerald-700">
                    {vtpassSaveMsg}
                  </div>
                )}

                {vtpassBalanceStatus && (
                  <div className="text-xs font-bold text-amber-200 p-3 bg-purple-950 rounded-xl border border-purple-700 font-mono">
                    {vtpassBalanceStatus}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Tab 4: Database Backup & Restore */}
        {activeTab === 'BACKUP' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-purple-900/30 border border-purple-800/60 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-400" />
                <span>Export Ministry Database Backup</span>
              </h4>
              <p className="text-xs text-purple-200">
                Download a complete JSON backup file containing all airtime distributions, receipt evidence, and audit logs for safe offline storage.
              </p>
              <button
                onClick={handleExportBackup}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-extrabold text-xs shadow-md"
              >
                📥 Download Backup JSON
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-purple-900/30 border border-purple-800/60 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Restore Backup File</span>
              </h4>
              <p className="text-xs text-purple-200">
                Upload a previously saved Light Up Prayer House JSON backup file to restore records.
              </p>
              <label className="inline-block px-5 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-700 text-amber-300 font-bold text-xs border border-purple-600 cursor-pointer">
                <span>📤 Select Backup File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              {importStatus && (
                <div className="text-xs font-bold text-emerald-400 mt-2">{importStatus}</div>
              )}
            </div>
          </div>
        )}

        {/* Footer Close Button */}
        <div className="pt-4 border-t border-purple-800/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-purple-900 hover:bg-rose-600 text-amber-200 hover:text-white font-extrabold text-xs transition-all border border-purple-700/80 flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            <span>Close Admin Panel</span>
          </button>
        </div>

      </div>
    </div>
  );
};
