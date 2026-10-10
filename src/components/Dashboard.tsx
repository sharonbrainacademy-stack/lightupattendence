import React from 'react';
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Sparkles,
  ArrowRightLeft,
  Flame,
  PlusCircle,
  BookOpen,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Eye,
  Check
} from 'lucide-react';
import { AttendanceSession, Beneficiary, MinistryGroup } from '../types';

interface DashboardProps {
  attendanceSessions?: AttendanceSession[];
  beneficiaries?: Beneficiary[];
  activeGroup?: MinistryGroup;
  isAuthenticated?: boolean;
  onOpenGroupSwitchModal?: () => void;
  onSwitchGroupDirect?: (group: MinistryGroup) => void;
  onNavigate: (tab: 'dashboard' | 'beneficiaries' | 'attendance' | 'bulk_msg' | 'records' | 'reports') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  attendanceSessions = [],
  beneficiaries = [],
  activeGroup = 'Esther Group',
  isAuthenticated = false,
  onOpenGroupSwitchModal,
  onSwitchGroupDirect,
  onNavigate,
}) => {
  // Filter beneficiaries strictly for the active group
  const groupBeneficiaries = beneficiaries.filter(b => {
    if (activeGroup === 'Peace Group') {
      return b.category === 'Peace Group' || Boolean(b.notes && b.notes.toLowerCase().includes('peace'));
    } else {
      return b.category === 'Esther Group Benin' || Boolean(b.notes && b.notes.toLowerCase().includes('esther')) || (!b.category?.toLowerCase().includes('peace') && !b.notes?.toLowerCase().includes('peace'));
    }
  });

  // Filter attendance sessions strictly for the active group
  const groupSessions = attendanceSessions.filter(s => {
    const isPeaceSession =
      s.serviceName?.toLowerCase().includes('peace') ||
      s.notes?.toLowerCase().includes('peace') ||
      s.records?.some(r => r.category === 'Peace Group');

    return activeGroup === 'Peace Group' ? isPeaceSession : !isPeaceSession;
  });

  const totalMembers = groupBeneficiaries.length;
  const totalSessions = groupSessions.length;

  // Turnout stats
  let totalPresent = 0;
  let totalLate = 0;
  let totalAbsent = 0;
  let totalRosterCount = 0;

  groupSessions.forEach(s => {
    s.records?.forEach(r => {
      totalRosterCount++;
      if (r.status === 'Present') totalPresent++;
      else if (r.status === 'Late') totalLate++;
      else if (r.status === 'Absent') totalAbsent++;
    });
  });

  const averageTurnout = totalRosterCount > 0
    ? Math.round(((totalPresent + totalLate) / totalRosterCount) * 100)
    : 0;

  // Today's attendance session check
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySession = groupSessions.find(s => s.serviceDate === todayStr);

  const todayPresent = todaySession?.records?.filter(r => r.status === 'Present').length || 0;
  const todayLate = todaySession?.records?.filter(r => r.status === 'Late').length || 0;
  const todayAbsent = todaySession?.records?.filter(r => r.status === 'Absent').length || 0;

  const recentSessions = [...groupSessions]
    .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900 via-purple-950 to-slate-950 border border-amber-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Roll Call &amp; Meeting Records</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-cinzel text-white tracking-tight leading-tight">
              Daily Attendance &amp; Records System
            </h2>
            <p className="text-amber-200/90 text-sm sm:text-base font-medium">
              LIGHT UP PRAYER HOUSE • FAMILY OUTREACH
            </p>
            <p className="text-slate-300 text-xs sm:text-sm italic font-serif">
              &quot;We Move By Fire — Pray • Believe • Rise • Overcome&quot;
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => onNavigate('attendance')}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-purple-950 font-extrabold shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Calendar className="w-5 h-5 stroke-[2.5]" />
              <span>📅 Take Roll Call</span>
            </button>
            <button
              onClick={() => onNavigate('records')}
              className="px-5 py-3 rounded-2xl bg-purple-900/80 hover:bg-purple-800 text-amber-200 font-bold border border-purple-700/60 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <FileText className="w-5 h-5 text-amber-400" />
              <span>📋 View Attendance History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Ministry Group Switcher Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/90 via-purple-900/70 to-indigo-950/90 border border-purple-700/80 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-md ${
            activeGroup === 'Peace Group'
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-500/20'
              : 'bg-gradient-to-br from-pink-500 to-pink-700 text-white shadow-pink-500/20'
          }`}>
            {activeGroup === 'Peace Group' ? '🕊️' : '🌸'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold font-cinzel text-white">
                {activeGroup === 'Peace Group' ? 'Peace Group' : 'Esther Group (Benin)'}
              </h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                activeGroup === 'Peace Group'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
              }`}>
                Active Scope
              </span>
            </div>
            <p className="text-xs text-purple-300">
              Showing attendance metrics and members for <strong>{activeGroup}</strong> ({totalMembers} registered members).
            </p>
          </div>
        </div>

        {/* 1-Click Group Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {onSwitchGroupDirect && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-purple-900/60 border border-purple-700">
              <button
                type="button"
                onClick={() => onSwitchGroupDirect('Esther Group')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeGroup === 'Esther Group'
                    ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                    : 'text-purple-300 hover:text-white hover:bg-purple-800/40'
                }`}
                title="Switch view to Esther Group (Benin)"
              >
                <span>🌸 Esther Group</span>
              </button>
              <button
                type="button"
                onClick={() => onSwitchGroupDirect('Peace Group')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeGroup === 'Peace Group'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                    : 'text-purple-300 hover:text-white hover:bg-purple-800/40'
                }`}
                title="Switch view to Peace Group"
              >
                <span>🕊️ Peace Group</span>
              </button>
            </div>
          )}

          {onOpenGroupSwitchModal && (
            <button
              onClick={onOpenGroupSwitchModal}
              className="px-3.5 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-amber-300 border border-purple-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Manage Passwords"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Group Security</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Registered Members */}
        <div
          onClick={() => onNavigate('beneficiaries')}
          className="p-5 rounded-2xl bg-purple-950/70 border border-purple-800/80 hover:border-amber-500/50 transition-all shadow-md cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Registered Members</span>
            <div className="p-2 rounded-xl bg-purple-900/60 text-amber-400 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black font-cinzel text-amber-200 mt-2">
            {totalMembers}
          </div>
          <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
            <span>In {activeGroup}</span>
            <span className="text-amber-400">→ View directory</span>
          </p>
        </div>

        {/* Metric 2: Meetings Conducted */}
        <div
          onClick={() => onNavigate('records')}
          className="p-5 rounded-2xl bg-purple-950/70 border border-purple-800/80 hover:border-amber-500/50 transition-all shadow-md cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Recorded Meetings</span>
            <div className="p-2 rounded-xl bg-purple-900/60 text-indigo-400 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black font-cinzel text-white mt-2">
            {totalSessions}
          </div>
          <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
            <span>Past attendance registers</span>
            <span className="text-indigo-400">→ View history</span>
          </p>
        </div>

        {/* Metric 3: Average Turnout */}
        <div
          onClick={() => onNavigate('reports')}
          className="p-5 rounded-2xl bg-purple-950/70 border border-purple-800/80 hover:border-amber-500/50 transition-all shadow-md cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Average Turnout</span>
            <div className="p-2 rounded-xl bg-purple-900/60 text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black font-cinzel text-emerald-400 mt-2">
            {averageTurnout}%
          </div>
          <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
            <span>Present + Late attendance</span>
            <span className="text-emerald-400">→ Analytics</span>
          </p>
        </div>

        {/* Metric 4: Today's Roll Call */}
        <div
          onClick={() => onNavigate('attendance')}
          className={`p-5 rounded-2xl border transition-all shadow-md cursor-pointer group ${
            todaySession
              ? 'bg-emerald-950/40 border-emerald-700/60 hover:border-emerald-500'
              : 'bg-amber-950/40 border-amber-700/60 hover:border-amber-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Today's Roll Call</span>
            <div className={`p-2 rounded-xl group-hover:scale-110 transition-transform ${
              todaySession ? 'bg-emerald-900/60 text-emerald-400' : 'bg-amber-900/60 text-amber-400'
            }`}>
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-black font-cinzel mt-2 flex items-center gap-2">
            {todaySession ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <Check className="w-5 h-5" /> Recorded
              </span>
            ) : (
              <span className="text-amber-300 flex items-center gap-1.5">
                <Clock className="w-5 h-5" /> Pending Roll Call
              </span>
            )}
          </div>
          <p className="text-xs text-purple-300 mt-1">
            {todaySession
              ? `🟢 ${todayPresent + todayLate} Present • 🔴 ${todayAbsent} Absent`
              : 'Click to start morning roll call'}
          </p>
        </div>

      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('attendance')}
          className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/80 to-purple-950 border border-purple-700/80 hover:border-amber-400 text-left transition-all shadow-md group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs text-amber-300 font-bold">Open Register →</span>
          </div>
          <h4 className="text-sm font-extrabold text-amber-100 font-cinzel mt-3">Take Roll Call Attendance</h4>
          <p className="text-[11px] text-purple-300 mt-0.5">Auto-mark via WhatsApp or Zoom pasted lists or manual mark.</p>
        </button>

        <button
          onClick={() => onNavigate('records')}
          className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/80 to-purple-950 border border-purple-700/80 hover:border-amber-400 text-left transition-all shadow-md group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs text-indigo-300 font-bold">Browse All →</span>
          </div>
          <h4 className="text-sm font-extrabold text-amber-100 font-cinzel mt-3">Attendance History Archive</h4>
          <p className="text-[11px] text-purple-300 mt-0.5">Inspect past meeting registers and export to Excel or PDF.</p>
        </button>

        <button
          onClick={() => onNavigate('beneficiaries')}
          className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/80 to-purple-950 border border-purple-700/80 hover:border-amber-400 text-left transition-all shadow-md group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs text-purple-300 font-bold">Manage Members →</span>
          </div>
          <h4 className="text-sm font-extrabold text-amber-100 font-cinzel mt-3">Member Roster Directory</h4>
          <p className="text-[11px] text-purple-300 mt-0.5">Manage registered attendees, phone numbers, and Zoom aliases.</p>
        </button>

        <button
          onClick={() => onNavigate('bulk_msg')}
          className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/80 to-purple-950 border border-purple-700/80 hover:border-amber-400 text-left transition-all shadow-md group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs text-emerald-300 font-bold">Follow Up →</span>
          </div>
          <h4 className="text-sm font-extrabold text-amber-100 font-cinzel mt-3">Follow Up on Absentees</h4>
          <p className="text-[11px] text-purple-300 mt-0.5">Send pastoral encouragement and check-in texts via WhatsApp.</p>
        </button>
      </div>

      {/* Recent Meeting Attendance Records Table */}
      <div className="p-5 sm:p-6 rounded-3xl bg-purple-950/70 border border-purple-800/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-amber-100 font-cinzel">
                Recent Meeting Attendance Registers
              </h3>
              <p className="text-xs text-purple-300">
                Latest roll call sessions for {activeGroup}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('records')}
            className="px-3.5 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-amber-300 border border-purple-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>View All Records ({totalSessions})</span>
            <span>→</span>
          </button>
        </div>

        {recentSessions.length > 0 ? (
          <div className="divide-y divide-purple-900/60">
            {recentSessions.map(session => {
              const present = session.records?.filter(r => r.status === 'Present').length || 0;
              const late = session.records?.filter(r => r.status === 'Late').length || 0;
              const absent = session.records?.filter(r => r.status === 'Absent').length || 0;
              const total = session.records?.length || 0;
              const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

              return (
                <div
                  key={session.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-purple-900/20 px-2 rounded-xl transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-amber-300 font-bold">
                        📅 {session.serviceDate}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-900/80 text-purple-300 border border-purple-700/60">
                        {session.serviceType}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-amber-100">
                      {session.serviceName}
                    </div>
                    <div className="text-xs text-purple-300">
                      Recorded by: {session.recordedBy}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-black font-cinzel text-amber-300">{rate}%</div>
                      <div className="text-[10px] text-purple-300 font-mono">
                        🟢 {present + late} Present • 🔴 {absent} Absent
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate('records')}
                      className="px-3 py-1.5 rounded-xl bg-purple-900/80 hover:bg-amber-500 hover:text-purple-950 text-amber-200 border border-purple-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-purple-400 italic">
            No attendance sessions recorded for {activeGroup} yet. Click &quot;Take Roll Call&quot; to begin!
          </div>
        )}
      </div>

    </div>
  );
};
