import React, { useState, useEffect } from 'react';
import { Flame, Shield, UserCheck, Wifi, WifiOff, Key, Database, BookOpen, ArrowRightLeft, Lock, LogOut, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { UserRole, MinistryGroup } from '../types';
import { PWAInstallPrompt } from './PWAInstallPrompt';

interface HeaderProps {
  currentRole: UserRole;
  userName: string;
  activeGroup: MinistryGroup;
  isAuthenticated: boolean;
  onOpenGroupSwitchModal: () => void;
  onOpenAdminModal: () => void;
  onLogout: () => void;
  onSelectTab: (tab: 'dashboard' | 'beneficiaries' | 'attendance' | 'bulk_msg' | 'distribution' | 'records' | 'reports') => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  userName,
  activeGroup,
  isAuthenticated,
  onOpenGroupSwitchModal,
  onOpenAdminModal,
  onLogout,
  onSelectTab,
  activeTab,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-purple-950/90 backdrop-blur-md border-b border-amber-500/30 shadow-lg">
      {/* Top Banner with Ministry Brand */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo & Ministry Name */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-0.5 shadow-md shadow-amber-500/20 group cursor-pointer" onClick={() => onSelectTab('dashboard')}>
              <div className="w-full h-full bg-purple-950 rounded-[14px] flex items-center justify-center">
                <Flame className="w-7 h-7 text-amber-400 fill-amber-400/20 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight font-cinzel bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                  LIGHT UP PRAYER HOUSE
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 tracking-wider">
                  FAMILY OUTREACH
                </span>
              </div>
              <p className="text-xs text-amber-200/80 font-medium tracking-wide flex items-center gap-1.5 mt-0.5">
                <span>We Move By Fire</span>
                <span className="text-amber-500">•</span>
                <span>Pray</span>
                <span className="text-amber-500">•</span>
                <span>Believe</span>
                <span className="text-amber-500">•</span>
                <span>Rise</span>
                <span className="text-amber-500">•</span>
                <span>Overcome</span>
              </p>
            </div>
          </div>

          {/* Right Controls & Authentication Status */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap">
            {/* Group Admin Auth Mode Pill */}
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenGroupSwitchModal}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 ${
                    activeGroup === 'Peace Group'
                      ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200 hover:bg-emerald-900 shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                      : 'bg-pink-950/90 border-pink-500/60 text-pink-200 hover:bg-pink-900 shadow-pink-950/40 ring-1 ring-pink-500/30'
                  }`}
                  title="Click to switch active group"
                >
                  <span className="text-sm">{activeGroup === 'Peace Group' ? '🕊️' : '🌸'}</span>
                  <div className="text-left leading-tight">
                    <div className="text-[9px] uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                      <span>Admin Logged In</span>
                    </div>
                    <div className="font-extrabold flex items-center gap-1 text-white">
                      <span>{activeGroup}</span>
                      <ArrowRightLeft className="w-3 h-3 opacity-70" />
                    </div>
                  </div>
                </button>

                <button
                  onClick={onLogout}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  title="Lock admin session and return to Public Summary Mode"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Lock Session</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenGroupSwitchModal}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-purple-950 font-extrabold text-xs shadow-md shadow-amber-500/20 border border-amber-300 transition-all cursor-pointer hover:scale-105"
                title="Log in with group password to perform special operations"
              >
                <Lock className="w-3.5 h-3.5 fill-purple-950" />
                <span>🔐 Group Admin Login</span>
              </button>
            )}

            {/* PWA Install Button */}
            <PWAInstallPrompt />

            {/* Network Status Badge */}
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${isOnline ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-200 border-amber-500/40'}`}>
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline font-medium">Online Sync</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-medium">Offline Mode</span>
                </>
              )}
            </div>

            {/* Admin Settings Button */}
            {isAuthenticated && (
              <button
                onClick={onOpenAdminModal}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 text-amber-200 text-xs font-semibold border border-purple-700/60 transition-all shadow-sm group"
                title="Click to access Admin settings"
              >
                <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-[10px] text-purple-300 uppercase font-bold tracking-wider">{currentRole}</div>
                  <div className="truncate max-w-[110px] text-amber-100">{userName}</div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 mt-3 overflow-x-auto no-scrollbar pt-1 border-t border-purple-900/60 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-purple-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-purple-200 hover:bg-purple-900/50 hover:text-amber-300'
            }`}
          >
            🏠 Public Summary
          </button>

          <button
            onClick={() => onSelectTab('beneficiaries')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'beneficiaries'
                ? 'bg-amber-500 text-purple-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-purple-200 hover:bg-purple-900/50 hover:text-amber-300'
            }`}
          >
            <span>👥 Beneficiary Directory</span>
            {!isAuthenticated && <Lock className="w-3 h-3 text-amber-400/80 inline ml-0.5" />}
          </button>

          <button
            onClick={() => onSelectTab('attendance')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-amber-500 text-purple-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-purple-200 hover:bg-purple-900/50 hover:text-amber-300'
            }`}
          >
            <span>📅 Roll Call Attendance</span>
            {!isAuthenticated && <Lock className="w-3 h-3 text-amber-400/80 inline ml-0.5" />}
          </button>

          <button
            onClick={() => onSelectTab('bulk_msg')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'bulk_msg'
                ? 'bg-amber-500 text-purple-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-purple-200 hover:bg-purple-900/50 hover:text-amber-300'
            }`}
          >
            <span>💬 Bulk Follow-Up</span>
            {!isAuthenticated && <Lock className="w-3 h-3 text-amber-400/80 inline ml-0.5" />}
          </button>

          <button
            onClick={() => onSelectTab('distribution')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'distribution'
                ? 'bg-amber-500 text-purple-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-purple-200 hover:bg-purple-900/50 hover:text-amber-300'
            }`}
          >
            <span>📲 New Airtime Transfer</span>
            {!isAuthenticated && <Lock className="w-3 h-3 text-amber-400/80 inline ml-0.5" />}
          </button>

          <button
            onClick={() => onSelectTab('records')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'records'
                ? 'bg-amber-500 text-purple-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-purple-200 hover:bg-purple-900/50 hover:text-amber-300'
            }`}
          >
            📋 Records &amp; Evidence
          </button>

          <button
            onClick={() => onSelectTab('reports')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-amber-500 text-purple-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-purple-200 hover:bg-purple-900/50 hover:text-amber-300'
            }`}
          >
            📊 Ministry Audit &amp; Reports
          </button>
        </nav>
      </div>
    </header>
  );
};
