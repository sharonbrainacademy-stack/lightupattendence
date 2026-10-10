import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Sparkles,
  TrendingUp,
  Users,
  CheckCircle2,
  Calendar,
  XCircle,
  Clock,
  Award,
  AlertTriangle,
  ArrowRightLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { AttendanceSession, Beneficiary, MinistryGroup } from '../types';

interface ReportsSummaryProps {
  attendanceSessions?: AttendanceSession[];
  beneficiaries?: Beneficiary[];
  activeGroup?: MinistryGroup;
}

export const ReportsSummary: React.FC<ReportsSummaryProps> = ({
  attendanceSessions = [],
  beneficiaries = [],
  activeGroup = 'Esther Group',
}) => {
  const [selectedGroup, setSelectedGroup] = useState<'ALL' | 'Esther Group' | 'Peace Group'>(activeGroup);

  React.useEffect(() => {
    setSelectedGroup(activeGroup);
  }, [activeGroup]);

  // Determine group of session
  const getSessionGroup = (s: AttendanceSession): 'Peace Group' | 'Esther Group' => {
    if (
      s.serviceName?.toLowerCase().includes('peace') ||
      s.notes?.toLowerCase().includes('peace') ||
      s.records?.some(r => r.category === 'Peace Group')
    ) {
      return 'Peace Group';
    }
    return 'Esther Group';
  };

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return attendanceSessions.filter(s => {
      if (selectedGroup === 'ALL') return true;
      return getSessionGroup(s) === selectedGroup;
    });
  }, [attendanceSessions, selectedGroup]);

  // Member attendance leaderboard
  const memberConsistency = useMemo(() => {
    const memberMap: Record<string, {
      fullName: string;
      phoneNumber: string;
      category: string;
      totalMeetings: number;
      presentCount: number;
      absentCount: number;
      lateCount: number;
    }> = {};

    filteredSessions.forEach(session => {
      session.records?.forEach(rec => {
        const id = rec.beneficiaryId || rec.fullName;
        if (!memberMap[id]) {
          memberMap[id] = {
            fullName: rec.fullName,
            phoneNumber: rec.phoneNumber,
            category: rec.category,
            totalMeetings: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0
          };
        }
        memberMap[id].totalMeetings++;
        if (rec.status === 'Present') memberMap[id].presentCount++;
        else if (rec.status === 'Late') memberMap[id].lateCount++;
        else if (rec.status === 'Absent') memberMap[id].absentCount++;
      });
    });

    const list = Object.values(memberMap).map(m => {
      const rate = m.totalMeetings > 0
        ? Math.round(((m.presentCount + m.lateCount) / m.totalMeetings) * 100)
        : 0;
      return { ...m, rate };
    });

    return list.sort((a, b) => b.rate - a.rate || b.presentCount - a.presentCount);
  }, [filteredSessions]);

  // Top faithful attendees
  const faithfulMembers = memberConsistency.filter(m => m.rate >= 80).slice(0, 10);
  // Frequent absentees needing follow up
  const absenteeAlerts = memberConsistency.filter(m => m.absentCount >= 2 || m.rate < 50).slice(0, 10);

  // Turnout rates by service type
  const serviceTypeStats = useMemo(() => {
    const map: Record<string, { count: number; totalRoster: number; totalPresent: number }> = {};
    filteredSessions.forEach(s => {
      const type = s.serviceType || 'Daily Morning Devotional';
      if (!map[type]) {
        map[type] = { count: 0, totalRoster: 0, totalPresent: 0 };
      }
      const present = s.records?.filter(r => r.status === 'Present' || r.status === 'Late').length || 0;
      map[type].count++;
      map[type].totalRoster += s.records?.length || 0;
      map[type].totalPresent += present;
    });

    return Object.entries(map).map(([type, data]) => {
      const rate = data.totalRoster > 0 ? Math.round((data.totalPresent / data.totalRoster) * 100) : 0;
      return { type, ...data, rate };
    });
  }, [filteredSessions]);

  // Export Analytics to Excel
  const handleExportAnalyticsExcel = () => {
    const memberRows = memberConsistency.map(m => ({
      'Full Name': m.fullName,
      'Phone': m.phoneNumber,
      'Group': m.category,
      'Meetings Held': m.totalMeetings,
      'Present': m.presentCount,
      'Late': m.lateCount,
      'Absent': m.absentCount,
      'Attendance Rate': `${m.rate}%`
    }));

    const ws = XLSX.utils.json_to_sheet(memberRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Member Consistency');
    XLSX.writeFile(wb, `LightUp_Attendance_Audit_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export PDF Report
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(74, 20, 140);
    doc.text('LIGHT UP PRAYER HOUSE — FAMILY OUTREACH', 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Official Attendance Audit & Consistency Report (${selectedGroup})`, 14, 28);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 14, 34);

    let y = 44;
    doc.setFont('helvetica', 'bold');
    doc.text('Top Faithful Attendees (High Turnout)', 14, y);
    y += 6;

    faithfulMembers.slice(0, 15).forEach((m, i) => {
      doc.setFont('helvetica', 'normal');
      doc.text(`${i + 1}. ${m.fullName} (${m.phoneNumber}) — ${m.rate}% Turnout (${m.presentCount} attended)`, 14, y);
      y += 5.5;
    });

    doc.save(`LightUp_Attendance_Report_${selectedGroup}.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-amber-500/30 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Ministry Roll Call Audit &amp; Analytics</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-cinzel text-amber-100 flex items-center gap-3 flex-wrap">
              <span>Attendance Reports &amp; Turnout Metrics</span>
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/90 max-w-2xl">
              Comprehensive attendance statistics, member faithfulness rankings, absentee alerts, and meeting service breakdown for Light Up Prayer House.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-purple-900/60 border border-purple-700">
              <button
                type="button"
                onClick={() => setSelectedGroup('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedGroup === 'ALL'
                    ? 'bg-amber-500 text-purple-950 font-black'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                All Groups
              </button>
              <button
                type="button"
                onClick={() => setSelectedGroup('Esther Group')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedGroup === 'Esther Group'
                    ? 'bg-pink-600 text-white font-black'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                🌸 Esther Group
              </button>
              <button
                type="button"
                onClick={() => setSelectedGroup('Peace Group')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedGroup === 'Peace Group'
                    ? 'bg-emerald-600 text-white font-black'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                🕊️ Peace Group
              </button>
            </div>

            <button
              onClick={handleExportAnalyticsExcel}
              className="px-3.5 py-2 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-emerald-300 border border-purple-700 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel Audit</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="px-3.5 py-2 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-purple-700 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Service Type Turnout Breakdown */}
      <div className="p-5 rounded-3xl bg-purple-950/70 border border-purple-800/80 shadow-xl space-y-4">
        <h3 className="text-base font-extrabold text-amber-100 font-cinzel flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span>Attendance Turnout by Service Type</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {serviceTypeStats.map(st => (
            <div key={st.type} className="p-4 rounded-2xl bg-purple-900/40 border border-purple-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-200">{st.type}</span>
                <span className="text-lg font-black font-cinzel text-emerald-400">{st.rate}%</span>
              </div>
              <div className="text-[11px] text-purple-300 font-mono">
                {st.count} sessions held • {st.totalPresent} attendances
              </div>
              <div className="w-full h-1.5 rounded-full bg-purple-950 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${st.rate}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Faithful Attendees Column */}
        <div className="p-5 rounded-3xl bg-purple-950/70 border border-purple-800/80 shadow-xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-purple-800/80">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <h4 className="text-sm font-extrabold text-amber-100 font-cinzel">
                Top Faithful Attendees (High Turnout)
              </h4>
              <p className="text-[10px] text-purple-300">Consistent members in morning devotionals</p>
            </div>
          </div>

          <div className="space-y-2">
            {faithfulMembers.map((m, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-purple-900/30 border border-purple-800/60 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-amber-100">{m.fullName}</div>
                  <div className="text-[10px] text-purple-300 font-mono">{m.phoneNumber} • {m.category}</div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black font-cinzel text-emerald-400">{m.rate}%</span>
                  <div className="text-[10px] text-emerald-300/80 font-mono">{m.presentCount} present</div>
                </div>
              </div>
            ))}

            {faithfulMembers.length === 0 && (
              <div className="p-6 text-center text-xs text-purple-400 italic">
                No attendance sessions recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Absentees Follow-up Alert Column */}
        <div className="p-5 rounded-3xl bg-purple-950/70 border border-purple-800/80 shadow-xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-purple-800/80">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <div>
              <h4 className="text-sm font-extrabold text-amber-100 font-cinzel">
                Absentee Follow-Up Watchlist
              </h4>
              <p className="text-[10px] text-purple-300">Members with multiple absences needing prayer &amp; check-in</p>
            </div>
          </div>

          <div className="space-y-2">
            {absenteeAlerts.map((m, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/60 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-rose-200">{m.fullName}</div>
                  <div className="text-[10px] text-rose-300/80 font-mono">{m.phoneNumber} • {m.category}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    🔴 {m.absentCount} Absent
                  </span>
                  <div className="text-[10px] text-purple-300 font-mono mt-0.5">{m.rate}% rate</div>
                </div>
              </div>
            ))}

            {absenteeAlerts.length === 0 && (
              <div className="p-6 text-center text-xs text-purple-400 italic">
                All members are currently attending faithfully!
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
