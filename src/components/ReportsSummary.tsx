import React, { useState, useMemo } from 'react';
import { FileText, Printer, Download, Sparkles, Layers, ShieldCheck, TrendingUp, Users, HeartHandshake, PhoneCall, Award } from 'lucide-react';
import { AirtimeRecord, NetworkType } from '../types';
import { formatNaira } from '../utils/receiptGenerator';
import { getNetworkBadgeStyle } from '../utils/networkDetector';

interface ReportsSummaryProps {
  records: AirtimeRecord[];
}

export const ReportsSummary: React.FC<ReportsSummaryProps> = ({ records }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH'>('ALL');

  // Filter records by period
  const periodRecords = useMemo(() => {
    if (selectedPeriod === 'ALL') return records;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return records.filter((r) => {
      const recDate = new Date(r.distributionDate);
      if (selectedPeriod === 'THIS_MONTH') {
        return recDate.getFullYear() === currentYear && recDate.getMonth() === currentMonth;
      }
      if (selectedPeriod === 'LAST_MONTH') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const year = currentMonth === 0 ? currentYear - 1 : currentYear;
        return recDate.getFullYear() === year && recDate.getMonth() === lastMonth;
      }
      return true;
    });
  }, [records, selectedPeriod]);

  // Total Disbursed
  const totalAmount = periodRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalBeneficiaries = new Set(periodRecords.map((r) => r.beneficiaryName.toLowerCase().trim())).size;

  // Breakdown by Purpose
  const purposeBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    periodRecords.forEach((r) => {
      if (!map[r.purpose]) {
        map[r.purpose] = { count: 0, total: 0 };
      }
      map[r.purpose].count += 1;
      map[r.purpose].total += r.amount;
    });
    return map;
  }, [periodRecords]);

  // Breakdown by Network
  const networkBreakdown = useMemo(() => {
    const map: Record<NetworkType, { count: number; total: number }> = {
      MTN: { count: 0, total: 0 },
      Glo: { count: 0, total: 0 },
      Airtel: { count: 0, total: 0 },
      '9Mobile': { count: 0, total: 0 },
      Other: { count: 0, total: 0 },
    };
    periodRecords.forEach((r) => {
      const net = r.network || 'Other';
      if (!map[net]) map[net] = { count: 0, total: 0 };
      map[net].count += 1;
      map[net].total += r.amount;
    });
    return map;
  }, [periodRecords]);

  // Breakdown by Minister
  const ministerBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    periodRecords.forEach((r) => {
      const minister = r.distributedBy || 'Ministry Volunteer';
      if (!map[minister]) map[minister] = { count: 0, total: 0 };
      map[minister].count += 1;
      map[minister].total += r.amount;
    });
    return map;
  }, [periodRecords]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950 via-purple-900 to-slate-950 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-cinzel text-white flex items-center gap-2">
            <span>📊 Ministry Reports &amp; Transparency Audit</span>
          </h2>
          <p className="text-xs text-amber-200/80 mt-1">
            Comprehensive financial breakdown by outreach purpose, network provider, and minister disburser.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector Chips */}
          <div className="flex bg-purple-950 p-1 rounded-xl border border-purple-800/80 text-xs font-bold">
            <button
              onClick={() => setSelectedPeriod('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedPeriod === 'ALL' ? 'bg-amber-500 text-purple-950 font-bold' : 'text-purple-300 hover:text-white'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setSelectedPeriod('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedPeriod === 'THIS_MONTH' ? 'bg-amber-500 text-purple-950 font-bold' : 'text-purple-300 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setSelectedPeriod('LAST_MONTH')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedPeriod === 'LAST_MONTH' ? 'bg-amber-500 text-purple-950 font-bold' : 'text-purple-300 hover:text-white'
              }`}
            >
              Last Month
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Audit Summary</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-5 rounded-2xl bg-purple-900/30 border border-purple-800/50 space-y-2">
          <div className="text-xs font-bold uppercase text-purple-300">Total Airtime Disbursed</div>
          <div className="text-2xl sm:text-3xl font-extrabold font-cinzel text-amber-300">
            {formatNaira(totalAmount)}
          </div>
          <div className="text-[11px] text-slate-400">100% Accounted for in Ministry Audit</div>
        </div>

        <div className="p-5 rounded-2xl bg-purple-900/30 border border-purple-800/50 space-y-2">
          <div className="text-xs font-bold uppercase text-purple-300">Beneficiaries Reached</div>
          <div className="text-2xl sm:text-3xl font-extrabold font-cinzel text-white">
            {totalBeneficiaries} <span className="text-xs font-sans text-purple-300">Individuals</span>
          </div>
          <div className="text-[11px] text-slate-400">Across {periodRecords.length} Distributions</div>
        </div>

        <div className="p-5 rounded-2xl bg-purple-900/30 border border-purple-800/50 space-y-2">
          <div className="text-xs font-bold uppercase text-purple-300">Average Gift Amount</div>
          <div className="text-2xl sm:text-3xl font-extrabold font-cinzel text-emerald-400">
            {formatNaira(periodRecords.length ? totalAmount / periodRecords.length : 0)}
          </div>
          <div className="text-[11px] text-slate-400">Per outreach beneficiary</div>
        </div>

      </div>

      {/* Purpose & Network Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Purpose Category Breakdown */}
        <div className="p-6 rounded-3xl bg-purple-950/60 border border-purple-800/50 space-y-4">
          <div className="flex items-center justify-between border-b border-purple-800/60 pb-3">
            <h3 className="text-base font-bold font-cinzel text-white flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-amber-400" />
              <span>Breakdown by Outreach Category</span>
            </h3>
            <span className="text-xs text-purple-300 font-semibold">{Object.keys(purposeBreakdown).length} Categories</span>
          </div>

          <div className="space-y-3">
            {Object.entries(purposeBreakdown).map(([purpose, stat]) => {
              const percentage = totalAmount > 0 ? (stat.total / totalAmount) * 100 : 0;
              return (
                <div key={purpose} className="space-y-1.5 p-3 rounded-xl bg-purple-900/30 border border-purple-800/40">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white">{purpose}</span>
                    <span className="text-amber-300 font-cinzel">{formatNaira(stat.total)} ({stat.count} gifts)</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-purple-950 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  <div className="text-[10px] text-purple-300 text-right">
                    {percentage.toFixed(1)}% of total outreach disbursement
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Network Breakdown */}
        <div className="p-6 rounded-3xl bg-purple-950/60 border border-purple-800/50 space-y-4">
          <div className="flex items-center justify-between border-b border-purple-800/60 pb-3">
            <h3 className="text-base font-bold font-cinzel text-white flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-emerald-400" />
              <span>Telecom Network Distribution</span>
            </h3>
            <span className="text-xs text-purple-300 font-semibold">Nigerian Telecoms</span>
          </div>

          <div className="space-y-3">
            {Object.entries(networkBreakdown).map(([net, stat]) => {
              if (stat.count === 0) return null;
              const badgeStyle = getNetworkBadgeStyle(net as NetworkType);
              const percentage = totalAmount > 0 ? (stat.total / totalAmount) * 100 : 0;

              return (
                <div key={net} className="p-3.5 rounded-xl bg-purple-900/30 border border-purple-800/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                      {net}
                    </span>
                    <span className="text-emerald-400 font-cinzel text-sm">{formatNaira(stat.total)}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>{stat.count} Transfers</span>
                    <span>{percentage.toFixed(1)}% Share</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Minister Disbursement Audit Table */}
      <div className="p-6 rounded-3xl bg-purple-950/60 border border-purple-800/50 space-y-4">
        <h3 className="text-base font-bold font-cinzel text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <span>Disbursement Log by Minister / Volunteer</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-purple-200">
            <thead className="bg-purple-900/60 text-amber-300 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3 rounded-l-xl">Minister / Volunteer Name</th>
                <th className="p-3">Gifts Handled</th>
                <th className="p-3">Total Amount Disbursed</th>
                <th className="p-3 rounded-r-xl">Share (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-800/40">
              {Object.entries(ministerBreakdown).map(([minister, stat]) => {
                const percentage = totalAmount > 0 ? (stat.total / totalAmount) * 100 : 0;
                return (
                  <tr key={minister} className="hover:bg-purple-900/30 transition-colors">
                    <td className="p-3 font-bold text-white">{minister}</td>
                    <td className="p-3 text-purple-200">{stat.count} Transactions</td>
                    <td className="p-3 font-extrabold font-cinzel text-amber-300">{formatNaira(stat.total)}</td>
                    <td className="p-3 text-slate-300">{percentage.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Audit Statement for Leadership */}
      <div className="printable-area p-6 rounded-3xl bg-purple-950 border border-amber-500/30 text-center space-y-3">
        <div className="text-xs font-bold text-amber-400 font-cinzel uppercase tracking-widest">
          LIGHT UP PRAYER HOUSE • FAMILY OUTREACH
        </div>
        <div className="text-sm font-semibold text-white">
          OFFICIAL TRANSPARENCY &amp; FINANCIAL AUDIT STATEMENT
        </div>
        <p className="text-xs text-purple-200/80 max-w-2xl mx-auto italic">
          All airtime distribution records contained herein represent direct blessing gifts disbaled to members, widows, youths, elderly, and visitors. Every record is stored with verifiable screenshot proof and receipt documentation.
        </p>
        <div className="pt-2 text-[11px] text-amber-300/80">
          Certified by Ministry Leadership • Generated on {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};
