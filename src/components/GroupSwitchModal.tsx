import React, { useState } from 'react';
import { Lock, Key, X, CheckCircle2, ShieldCheck, Eye, EyeOff, Sparkles, ArrowRightLeft } from 'lucide-react';
import { MinistryGroup } from '../types';
import { verifyGroupSwitchPassword, setActiveGroup } from '../utils/storage';

interface GroupSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGroup: MinistryGroup;
  isAuthenticated?: boolean;
  onGroupSwitched: (newGroup: MinistryGroup) => void;
  onOpenAdminSettings?: () => void;
}

export const GroupSwitchModal: React.FC<GroupSwitchModalProps> = ({
  isOpen,
  onClose,
  currentGroup,
  isAuthenticated = false,
  onGroupSwitched,
  onOpenAdminSettings,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<MinistryGroup>(currentGroup);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Please enter a password.');
      return;
    }

    if (isAuthenticated && selectedTarget === currentGroup) {
      setErrorMsg(`You are already managing ${currentGroup}. Select a different group to switch.`);
      return;
    }

    const isValid = verifyGroupSwitchPassword(selectedTarget, password);
    if (isValid) {
      setErrorMsg('');
      setSuccessMsg(`Access granted! Logged in to ${selectedTarget}...`);
      setActiveGroup(selectedTarget);
      onGroupSwitched(selectedTarget);
      setTimeout(() => {
        setPassword('');
        setSuccessMsg('');
        onClose();
      }, 700);
    } else {
      setErrorMsg(`Incorrect password for ${selectedTarget}. Enter the group password or your Admin master password.`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md p-6 bg-gradient-to-b from-slate-900 via-purple-950/90 to-slate-950 border border-amber-500/40 rounded-3xl shadow-2xl text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-purple-300 hover:text-amber-300 rounded-full hover:bg-purple-900/50 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-600/30 border border-amber-500/40 flex items-center justify-center shadow-inner">
            <Lock className="w-6 h-6 text-amber-400 fill-amber-400/20" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-cinzel text-amber-200 flex items-center gap-2">
              <span>{isAuthenticated ? 'Switch Ministry Group' : 'Group Admin Authentication'}</span>
              <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                Protected
              </span>
            </h2>
            <p className="text-xs text-purple-200">
              {isAuthenticated
                ? 'Enter password to switch active group administration'
                : 'Log in with group password to perform special ministry operations'}
            </p>
          </div>
        </div>

        {/* Current Active Group Indicator */}
        <div className="p-3 mb-4 rounded-2xl bg-purple-900/40 border border-purple-800/60 flex items-center justify-between text-xs">
          <span className="text-slate-300">Currently Active:</span>
          <span className={`font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
            currentGroup === 'Peace Group'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
          }`}>
            <span>{currentGroup === 'Peace Group' ? '🕊️' : '🌸'}</span>
            <span>{currentGroup}</span>
          </span>
        </div>

        {/* Group Selection Cards */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-purple-200 mb-2">
            Select Destination Group:
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setSelectedTarget('Esther Group');
                setErrorMsg('');
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                selectedTarget === 'Esther Group'
                  ? 'bg-pink-950/60 border-pink-500 text-pink-100 ring-2 ring-pink-500/40 shadow-lg'
                  : 'bg-purple-950/40 border-purple-800 text-purple-300 hover:border-purple-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">🌸</span>
                {selectedTarget === 'Esther Group' && (
                  <CheckCircle2 className="w-4 h-4 text-pink-400" />
                )}
              </div>
              <span className="font-bold text-xs mt-1">Esther Group</span>
              <span className="text-[10px] text-pink-300/80">Benin Daily Fellowship</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTarget('Peace Group');
                setErrorMsg('');
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                selectedTarget === 'Peace Group'
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/40 shadow-lg'
                  : 'bg-purple-950/40 border-purple-800 text-purple-300 hover:border-purple-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">🕊️</span>
                {selectedTarget === 'Peace Group' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <span className="font-bold text-xs mt-1">Peace Group</span>
              <span className="text-[10px] text-emerald-300/80">New Fellowship Outreach</span>
            </button>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-amber-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Enter Password to Unlock {selectedTarget}:</span>
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder={`Enter ${selectedTarget} password or Admin master password`}
                autoFocus
                className="w-full px-4 py-2.5 pr-10 rounded-xl bg-purple-950/80 border border-purple-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-slate-100 placeholder-purple-400/60 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-amber-300 p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errorMsg && (
              <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </p>
            )}
            {successMsg && (
              <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{successMsg}</span>
              </p>
            )}
          </div>

          {/* Quick Help / Default Passwords Box */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-purple-800/50 text-[11px] text-purple-300 space-y-1">
            <div className="flex items-center gap-1 text-amber-300 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Password Verification Info:</span>
            </div>
            <p className="text-slate-300">
              Each admin can use their Admin Master Password (<code className="text-amber-300 bg-purple-900/60 px-1 py-0.5 rounded font-mono">lightup2026</code>) or the group switch password:
            </p>
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
              <div className="p-1.5 rounded bg-purple-900/40 border border-purple-700/50">
                <span className="text-pink-300">🌸 Esther Group:</span> <code className="text-amber-200">esther2026</code>
              </div>
              <div className="p-1.5 rounded bg-purple-900/40 border border-purple-700/50">
                <span className="text-emerald-300">🕊️ Peace Group:</span> <code className="text-amber-200">peace2026</code>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-purple-700 hover:bg-purple-900/50 text-purple-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-purple-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Key className="w-4 h-4 fill-purple-950/30" />
              <span>Unlock &amp; Switch to {selectedTarget}</span>
            </button>
          </div>
        </form>

        {/* Change Passwords Link */}
        {onOpenAdminSettings && (
          <div className="mt-4 pt-3 border-t border-purple-800/50 text-center">
            <button
              onClick={() => {
                onClose();
                onOpenAdminSettings();
              }}
              className="text-[11px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
            >
              Need to change group passwords? Open Admin Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
