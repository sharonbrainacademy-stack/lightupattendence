import React from 'react';
import { PlusCircle, FileText, Share2, Layers, Flame, ArrowUpRight, CheckCircle2, ShieldCheck, HeartHandshake, Users, PhoneCall, Sparkles, Zap, Calendar, MessageSquare, ArrowRightLeft } from 'lucide-react';
import { AirtimeRecord, Beneficiary, MinistryGroup } from '../types';
import { formatNaira } from '../utils/receiptGenerator';
import { getNetworkBadgeStyle } from '../utils/networkDetector';

interface DashboardProps {
  records: AirtimeRecord[];
  beneficiaries?: Beneficiary[];
  activeGroup?: MinistryGroup;
  isAuthenticated?: boolean;
  onOpenGroupSwitchModal?: () => void;
  onSwitchGroupDirect?: (group: MinistryGroup) => void;
  onNavigate: (tab: 'dashboard' | 'beneficiaries' | 'attendance' | 'bulk_msg' | 'distribution' | 'records' | 'reports') => void;
  onViewRecord: (record: AirtimeRecord) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  records,
  beneficiaries = [],
  activeGroup = 'Esther Group',
  isAuthenticated = false,
  onOpenGroupSwitchModal,
  onSwitchGroupDirect,
  onNavigate,
  onViewRecord,
}) => {
  // Filter records and beneficiaries strictly for the active group
  const groupRecords = records.filter(r => {
    if (activeGroup === 'Peace Group') {
      return r.purpose === 'Peace Group' || r.purpose.toLowerCase().includes('peace');
    } else {
      return r.purpose === 'Esther Group Benin' || r.purpose.toLowerCase().includes('esther') || (!r.purpose.toLowerCase().includes('peace'));
    }
  });

  const groupBeneficiaries = beneficiaries.filter(b => {
    if (activeGroup === 'Peace Group') {
      return b.category === 'Peace Group' || b.notes?.toLowerCase().includes('peace');
    } else {
      return b.category === 'Esther Group Benin' || b.notes?.toLowerCase().includes('esther') || (!b.category.toLowerCase().includes('peace') && !b.notes?.toLowerCase().includes('peace'));
    }
  });

  const totalAmount = groupRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalBeneficiaries = groupBeneficiaries.length;
  const recentRecords = groupRecords.slice(0, 5);

  // Top purpose calculation
  const purposeCounts: Record<string, number> = {};
  groupRecords.forEach((r) => {
    purposeCounts[r.purpose] = (purposeCounts[r.purpose] || 0) + 1;
  });
  let topPurpose = activeGroup === 'Peace Group' ? 'Peace Group' : 'Esther Group Benin';
  let maxCount = 0;
  Object.entries(purposeCounts).forEach(([purpose, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topPurpose = purpose;
    }
  });

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
              <span>Official Transparency & Audit Records</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-cinzel text-white tracking-tight leading-tight">
              Airtime Distribution &amp; Evidence System
            </h2>
            <p className="text-amber-200/90 text-sm sm:text-base font-medium">
              LIGHT UP PRAYER HOUSE • FAMILY OUTREACH
            </p>
            <p className="text-slate-300 text-xs sm:text-sm italic font-serif">
              &quot;Freely you have received; freely give.&quot; — Matthew 10:8
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => onNavigate('distribution')}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-purple-950 font-extrabold shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm"
            >
              <PlusCircle className="w-5 h-5 stroke-[2.5]" />
              <span>➕ New Distribution</span>
            </button>
            <button
              onClick={() => onNavigate('records')}
              className="px-5 py-3 rounded-2xl bg-purple-900/80 hover:bg-purple-800 text-amber-200 font-bold border border-purple-700/60 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <FileText className="w-5 h-5 text-amber-400" />
              <span>📋 View All Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Ministry Group Focus & Quick Switcher */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
        activeGroup === 'Peace Group'
          ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-purple-950 border-emerald-500/40 text-emerald-100'
          : 'bg-gradient-to-r from-pink-950/70 via-slate-900 to-purple-950 border-pink-500/40 text-pink-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner ${
            activeGroup === 'Peace Group' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
          }`}>
            {activeGroup === 'Peace Group' ? '🕊️' : '🌸'}
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
              Active Congregation Group
            </div>
            <div className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>{activeGroup}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/80 text-amber-300 font-mono border border-purple-700">
                {beneficiaries.filter(b => activeGroup === 'Peace Group' 
                  ? (b.category === 'Peace Group' || b.notes?.includes('Peace')) 
                  : (b.category === 'Esther Group Benin' || b.notes?.includes('Esther'))
                ).length} Registered Members
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSwitchGroupDirect && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-purple-900/60 border border-purple-700">
              <button
                type="button"
                onClick={() => onSwitchGroupDirect('Esther Group')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeGroup === 'Esther Group'
                    ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                    : 'text-purple-300 hover:text-white'
                }`}
                title="Switch to Esther Group (Benin)"
              >
                <span>🌸 Esther Group</span>
              </button>
              <button
                type="button"
                onClick={() => onSwitchGroupDirect('Peace Group')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeGroup === 'Peace Group'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                    : 'text-purple-300 hover:text-white'
                }`}
                title="Switch to Peace Group"
              >
                <span>🕊️ Peace Group</span>
              </button>
            </div>
          )}

          {onOpenGroupSwitchModal && (
            <button
              onClick={onOpenGroupSwitchModal}
              className="px-3.5 py-2 rounded-xl bg-purple-900/70 hover:bg-purple-800 border border-purple-600 text-xs font-bold text-amber-300 hover:text-amber-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02]"
              title="Manage Group Passwords and Security"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Group Security</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Airtime Sent */}
        <div className="p-5 rounded-2xl bg-purple-900/30 border border-purple-800/50 backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Total Airtime Sent</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-cinzel text-amber-300">
              {formatNaira(totalAmount)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Documented &amp; Verified</span>
            </div>
          </div>
        </div>

        {/* Total Beneficiaries */}
        <div className="p-5 rounded-2xl bg-purple-900/30 border border-purple-800/50 backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Total Beneficiaries</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-cinzel text-white">
              {totalBeneficiaries} <span className="text-xs font-sans text-purple-300">People</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Widows, Youths, Elderly &amp; Visitors
            </div>
          </div>
        </div>

        {/* Total Distributions */}
        <div className="p-5 rounded-2xl bg-purple-900/30 border border-purple-800/50 backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Total Transactions</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-cinzel text-emerald-300">
              {records.length} <span className="text-xs font-sans text-emerald-200">Gifts</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              With full evidence receipts attached
            </div>
          </div>
        </div>

        {/* Top Outreach Purpose */}
        <div className="p-5 rounded-2xl bg-purple-900/30 border border-purple-800/50 backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Top Outreach Category</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-amber-200 truncate">
              {topPurpose}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {maxCount} Distributions Recorded
            </div>
          </div>
        </div>

      </div>

      {/* Quick Action Grid */}
      <div className="p-5 rounded-2xl bg-purple-950/60 border border-purple-800/40 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          <span>Quick Ministry Actions</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          
          <button
            onClick={() => onNavigate('beneficiaries')}
            className="p-4 rounded-xl bg-gradient-to-br from-amber-400/20 via-amber-500/30 to-amber-600/10 hover:from-amber-400/30 hover:to-amber-500/40 border border-amber-500/60 text-amber-200 text-left space-y-2 transition-all group shadow-md"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/30 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 fill-amber-300" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white">⚡ 1-Click Send</div>
              <div className="text-[11px] text-amber-200/80">Airtime to members</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('attendance')}
            className="p-4 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 border border-purple-800/60 text-purple-200 text-left space-y-2 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">📅 Attendance</div>
              <div className="text-[11px] text-purple-300/70">Mark &amp; record roll call</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('bulk_msg')}
            className="p-4 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 border border-purple-800/60 text-purple-200 text-left space-y-2 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">💬 Bulk Messaging</div>
              <div className="text-[11px] text-purple-300/70">WhatsApp &amp; SMS outreach</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('distribution')}
            className="p-4 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 border border-purple-800/60 text-purple-200 text-left space-y-2 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">➕ Custom Form</div>
              <div className="text-[11px] text-purple-300/70">New recipient transfer</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('records')}
            className="p-4 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 border border-purple-800/60 text-purple-200 text-left space-y-2 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">📋 View Records</div>
              <div className="text-[11px] text-purple-300/70">Search &amp; filter evidence</div>
            </div>
          </button>

          <button
            onClick={() => {
              if (records.length > 0) onViewRecord(records[0]);
              else onNavigate('distribution');
            }}
            className="p-4 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 border border-purple-800/60 text-purple-200 text-left space-y-2 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">📄 Share Receipt</div>
              <div className="text-[11px] text-purple-300/70">WhatsApp / Image / PDF</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="p-4 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 border border-purple-800/60 text-purple-200 text-left space-y-2 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">📊 Audit Summary</div>
              <div className="text-[11px] text-purple-300/70">Leadership reports</div>
            </div>
          </button>

        </div>
      </div>

      {/* Recent Distributions Feed */}
      <div className="p-5 rounded-2xl bg-purple-950/40 border border-purple-800/40 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-cinzel flex items-center gap-2">
              <span>Recent Airtime Blessings</span>
              <span className="text-xs font-sans px-2 py-0.5 rounded-full bg-purple-800/60 text-amber-300 font-semibold">
                {recentRecords.length} Latest
              </span>
            </h3>
            <p className="text-xs text-slate-400">Click any transaction to view official receipt &amp; evidence proof screenshot</p>
          </div>
          <button
            onClick={() => onNavigate('records')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            <span>See All</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {recentRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <PhoneCall className="w-12 h-12 text-purple-500 mx-auto opacity-40" />
            <p className="text-sm font-medium">No airtime distributions recorded yet.</p>
            <button
              onClick={() => onNavigate('distribution')}
              className="px-4 py-2 rounded-xl bg-amber-500 text-purple-950 font-bold text-xs"
            >
              ➕ Record First Distribution
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentRecords.map((rec) => {
              const badgeStyle = getNetworkBadgeStyle(rec.network);
              return (
                <div
                  key={rec.id}
                  onClick={() => onViewRecord(rec)}
                  className="p-3.5 rounded-xl bg-purple-900/30 hover:bg-purple-900/60 border border-purple-800/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-700/60 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0">
                      LU
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors flex items-center gap-2">
                        <span>{rec.beneficiaryName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                          {rec.network}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{rec.phoneNumber}</span>
                        <span>•</span>
                        <span className="text-purple-300">{rec.purpose}</span>
                        <span>•</span>
                        <span>{rec.distributionDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-purple-800/40">
                    <div className="text-left sm:text-right">
                      <div className="text-base font-extrabold text-emerald-400 font-cinzel">
                        {formatNaira(rec.amount)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Ref: {rec.receiptNo}
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-purple-800/40 group-hover:bg-amber-500 group-hover:text-purple-950 text-amber-300 transition-all">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scripture & Ministry Affirmation Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950 via-purple-900 to-purple-950 border border-amber-500/20 text-center space-y-2">
        <p className="text-amber-300 font-cinzel text-sm sm:text-base font-bold">
          &quot;Every good gift and every perfect gift is from above, and cometh down from the Father of lights...&quot;
        </p>
        <p className="text-amber-200/70 text-xs font-semibold">James 1:17</p>
      </div>
    </div>
  );
};
