import React, { useState, useEffect } from 'react';
import { Flame, Shield, UserCheck, Wifi, WifiOff, Key, Database, BookOpen } from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  currentRole: UserRole;
  userName: string;
  onOpenAdminModal: () => void;
  onSelectTab: (tab: 'dashboard' | 'beneficiaries' | 'attendance' | 'bulk_msg' | 'distribution' | 'records' | 'reports') => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  userName,
  onOpenAdminModal,
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

          {/* Right Controls & Role Badge */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5">
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

            {/* Current User & Role Pill */}
            <button
              onClick={onOpenAdminModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 text-amber-200 text-xs font-semibold border border-purple-700/60 transition-all shadow-sm group"
              title="Click to access Admin settings or switch role"
            >
              <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform">
                {currentRole === 'Admin' ? <Shield className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left">
                <div className="text-[10px] text-purple-300 uppercase font-bold tracking-wider">{currentRole}</div>
                <div className="truncate max-w-[110px] sm:max-w-[140px] text-amber-100">{userName}</div>
              </div>
              <Key className="w-3.5 h-3.5 text-amber-400 opacity-60 group-hover:opacity-100 ml-1" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 mt-3 overflow-x-auto no-scrollbar pt-1 border-t border-purple-900/60 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-purple-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-purple-200 hover:bg-purple-900/50 hover:text-amber-300'
            }`}
          >
            🏠 Dashboard
          </button>

          <button
            onClick={() => onSelectTab('beneficiaries')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'beneficiaries'
                ? 'bg-amber-500 text-purple-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-purple-200 hover:bg-purple-900/50 hover:text-amber-300'
            }`}
          >
            👥 Beneficiary Directory &amp; Airtime
          </button>

          <button
            onClick={() => onSelectTab('attendance')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-amber-500 text-purple-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-purple-200 hover:bg-purple-900/50 hover:text-amber-300'
            }`}
          >
            📅 Attendance Register
          </button>

          <button
            onClick={() => onSelectTab('bulk_msg')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bulk_msg'
                ? 'bg-amber-500 text-purple-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-purple-200 hover:bg-purple-900/50 hover:text-amber-300'
            }`}
          >
            💬 Bulk Follow-Up
          </button>

          <button
            onClick={() => onSelectTab('distribution')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'distribution'
                ? 'bg-amber-500 text-purple-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-purple-200 hover:bg-purple-900/50 hover:text-amber-300'
            }`}
          >
            📲 New Airtime Transfer
          </button>

          <button
            onClick={() => onSelectTab('records')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'records'
                ? 'bg-amber-500 text-purple-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-purple-200 hover:bg-purple-900/50 hover:text-amber-300'
            }`}
          >
            📋 Records & Evidence
          </button>

          <button
            onClick={() => onSelectTab('reports')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-amber-500 text-purple-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-purple-200 hover:bg-purple-900/50 hover:text-amber-300'
            }`}
          >
            📊 Ministry Audit & Reports
          </button>

          <button
            onClick={onOpenAdminModal}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-purple-950 font-extrabold flex items-center gap-1.5 whitespace-nowrap shadow-md hover:from-amber-400 hover:to-amber-300 transition-all cursor-pointer border border-amber-300"
          >
            <Shield className="w-4 h-4 text-purple-950" />
            <span>🔐 Admin Panel</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
