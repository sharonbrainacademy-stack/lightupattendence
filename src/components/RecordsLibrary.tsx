import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Trash2,
  Eye,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  PlusCircle,
  Sparkles,
  ArrowUpDown,
  BookOpen,
  ArrowRightLeft,
  X,
  Edit3,
  Save,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { AttendanceSession, AttendanceRecordItem, Beneficiary, UserRole, MinistryGroup } from '../types';

interface RecordsLibraryProps {
  attendanceSessions: AttendanceSession[];
  beneficiaries: Beneficiary[];
  currentRole: UserRole;
  currentUserName: string;
  activeGroup?: MinistryGroup;
  onDeleteSession: (sessionId: string) => void;
  onTakeNewAttendance: () => void;
  onSelectSession?: (session: AttendanceSession) => void;
  onUpdateSession?: (session: AttendanceSession) => void;
  onEditSessionInTracker?: (sessionId: string) => void;
  onSwitchGroupDirect?: (group: MinistryGroup) => void;
}

export const RecordsLibrary: React.FC<RecordsLibraryProps> = ({
  attendanceSessions,
  beneficiaries = [],
  currentRole,
  currentUserName,
  activeGroup = 'Esther Group',
  onDeleteSession,
  onTakeNewAttendance,
  onSelectSession,
  onUpdateSession,
  onEditSessionInTracker,
  onSwitchGroupDirect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<'ALL' | 'Esther Group' | 'Peace Group'>(activeGroup);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('ALL');
  const [dateSort, setDateSort] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [viewingSession, setViewingSession] = useState<AttendanceSession | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalStatusFilter, setModalStatusFilter] = useState<'ALL' | 'Present' | 'Late' | 'Absent' | 'Excused'>('ALL');
  const [sessionToDelete, setSessionToDelete] = useState<AttendanceSession | null>(null);

  // Edit Date & Session Details State
  const [editingDateSession, setEditingDateSession] = useState<AttendanceSession | null>(null);
  const [editDateValue, setEditDateValue] = useState<string>('');
  const [editTitleValue, setEditTitleValue] = useState<string>('');
  const [editTypeValue, setEditTypeValue] = useState<AttendanceSession['serviceType']>('Daily Morning Devotional');
  const [editNotesValue, setEditNotesValue] = useState<string>('');
  const [editSuccessNotice, setEditSuccessNotice] = useState<string | null>(null);

  const handleOpenEditDate = (session: AttendanceSession) => {
    setEditingDateSession(session);
    setEditDateValue(session.serviceDate);
    setEditTitleValue(session.serviceName);
    setEditTypeValue(session.serviceType);
    setEditNotesValue(session.notes || '');
  };

  const handleSaveEditedDate = () => {
    if (!editingDateSession || !editDateValue) return;

    const updatedSession: AttendanceSession = {
      ...editingDateSession,
      serviceDate: editDateValue,
      serviceName: editTitleValue.trim() || editingDateSession.serviceName,
      serviceType: editTypeValue || editingDateSession.serviceType,
      notes: editNotesValue,
      updatedAt: new Date().toISOString()
    };

    if (onUpdateSession) {
      onUpdateSession(updatedSession);
    }

    if (viewingSession && viewingSession.id === editingDateSession.id) {
      setViewingSession(updatedSession);
    }

    setEditSuccessNotice(`✅ Attendance record date successfully changed to ${editDateValue}!`);
    setTimeout(() => setEditSuccessNotice(null), 4500);
    setEditingDateSession(null);
  };

  // Sync group filter when activeGroup prop changes
  React.useEffect(() => {
    setSelectedGroupFilter(activeGroup);
  }, [activeGroup]);

  // Determine group of a session
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

  // Filter attendance sessions
  const filteredSessions = useMemo(() => {
    return attendanceSessions
      .filter((s) => {
        const group = getSessionGroup(s);
        if (selectedGroupFilter !== 'ALL' && group !== selectedGroupFilter) {
          return false;
        }

        if (selectedServiceType !== 'ALL' && s.serviceType !== selectedServiceType) {
          return false;
        }

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchesMeta =
            s.serviceName.toLowerCase().includes(q) ||
            s.serviceDate.includes(q) ||
            s.serviceType.toLowerCase().includes(q) ||
            s.recordedBy.toLowerCase().includes(q) ||
            (s.notes && s.notes.toLowerCase().includes(q));

          const matchesAttendee = s.records?.some(r =>
            r.fullName.toLowerCase().includes(q) || r.phoneNumber.includes(q)
          );

          if (!matchesMeta && !matchesAttendee) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.serviceDate).getTime();
        const timeB = new Date(b.serviceDate).getTime();
        return dateSort === 'NEWEST' ? timeB - timeA : timeA - timeB;
      });
  }, [attendanceSessions, selectedGroupFilter, selectedServiceType, searchTerm, dateSort]);

  // Compute aggregate stats across filtered sessions
  const aggregateStats = useMemo(() => {
    const totalSessions = filteredSessions.length;
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let totalRecordCount = 0;

    filteredSessions.forEach(s => {
      s.records?.forEach(r => {
        totalRecordCount++;
        if (r.status === 'Present') totalPresent++;
        else if (r.status === 'Late') totalLate++;
        else if (r.status === 'Absent') totalAbsent++;
      });
    });

    const averageRate = totalRecordCount > 0
      ? Math.round(((totalPresent + totalLate) / totalRecordCount) * 100)
      : 0;

    return { totalSessions, totalPresent, totalLate, totalAbsent, totalRecordCount, averageRate };
  }, [filteredSessions]);

  // Unique service types for filter dropdown
  const uniqueServiceTypes = useMemo(() => {
    const set = new Set<string>();
    attendanceSessions.forEach(s => {
      if (s.serviceType) set.add(s.serviceType);
    });
    return Array.from(set);
  }, [attendanceSessions]);

  // Export all filtered sessions summary to Excel
  const handleExportAllToExcel = () => {
    const dataRows: any[] = [];
    filteredSessions.forEach(s => {
      const present = s.records?.filter(r => r.status === 'Present').length || 0;
      const late = s.records?.filter(r => r.status === 'Late').length || 0;
      const absent = s.records?.filter(r => r.status === 'Absent').length || 0;
      const total = s.records?.length || 0;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      dataRows.push({
        'Date': s.serviceDate,
        'Meeting / Service': s.serviceName,
        'Ministry Group': getSessionGroup(s),
        'Service Type': s.serviceType,
        'Recorded By': s.recordedBy,
        'Total Roster': total,
        'Present': present,
        'Late': late,
        'Absent': absent,
        'Attendance %': `${rate}%`,
        'Notes': s.notes || ''
      });
    });

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance History');
    XLSX.writeFile(wb, `LightUp_Attendance_Records_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export specific session details to Excel
  const handleExportSessionToExcel = (session: AttendanceSession) => {
    const rows = (session.records || []).map((r, idx) => ({
      'S/N': idx + 1,
      'Full Name': r.fullName,
      'Phone Number': r.phoneNumber,
      'Group / Category': r.category,
      'Attendance Status': r.status,
      'Check-in Time': r.checkInTime || '05:00 AM',
      'Meeting Date': session.serviceDate,
      'Service': session.serviceName,
      'Recorded By': session.recordedBy
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roll Call Register');
    XLSX.writeFile(wb, `Attendance_${session.serviceDate}_${session.serviceName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  // Export all filtered sessions summary to CSV
  const handleExportAllToCSV = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const groupLabel = selectedGroupFilter === 'Peace Group' ? 'PEACE GROUP' : selectedGroupFilter === 'ALL' ? 'ALL GROUPS' : 'ESTHER GROUP BENIN';
    const fileGroup = selectedGroupFilter === 'Peace Group' ? 'Peace_Group' : selectedGroupFilter === 'ALL' ? 'All_Groups' : 'Esther_Group_Benin';

    const titleBlock = [
      `"","LIGHT UP PRAYER HOUSE — ${groupLabel} ATTENDANCE SESSIONS SUMMARY"`,
      `"","MINISTRY GROUP: ${groupLabel}"`,
      `"","Export Date: ${todayStr} | Total Sessions Recorded: ${filteredSessions.length}"`,
      ''
    ];

    const headers = [
      'Meeting Date',
      'Meeting / Service Name',
      'Ministry Group',
      'Service Type',
      'Recorded By',
      'Total Roster Count',
      'Present Count',
      'Late Count',
      'Absent Count',
      'Turnout Rate (%)',
      'Notes'
    ];

    const rows = filteredSessions.map(s => {
      const present = s.records?.filter(r => r.status === 'Present').length || 0;
      const late = s.records?.filter(r => r.status === 'Late').length || 0;
      const absent = s.records?.filter(r => r.status === 'Absent').length || 0;
      const total = s.records?.length || 0;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      return [
        `"${s.serviceDate}"`,
        `"${(s.serviceName || '').replace(/"/g, '""')}"`,
        `"${getSessionGroup(s)}"`,
        `"${s.serviceType || ''}"`,
        `"${(s.recordedBy || '').replace(/"/g, '""')}"`,
        total.toString(),
        present.toString(),
        late.toString(),
        absent.toString(),
        `"${rate}%"`,
        `"${(s.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [
      ...titleBlock,
      headers.join(','),
      ...rows
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LightUp_${fileGroup}_Attendance_Sessions_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export specific session details to CSV
  const handleExportSessionToCSV = (session: AttendanceSession) => {
    const groupLabel = getSessionGroup(session);
    const fileGroup = groupLabel.replace(/\s+/g, '_');
    const records = session.records || [];
    const presentCount = records.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const rate = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

    const titleBlock = [
      `"","LIGHT UP PRAYER HOUSE — ${groupLabel.toUpperCase()} SESSION ATTENDANCE REGISTER"`,
      `"","Meeting Date: ${session.serviceDate} | Service Type: ${session.serviceType} | Program: ${(session.serviceName || '').replace(/"/g, '""')}"`,
      `"","Recorded By: ${(session.recordedBy || '').replace(/"/g, '""')} | Total Roster: ${records.length} | Present: ${presentCount} | Attendance Rate: ${rate}%"`,
      ''
    ];

    const headers = [
      'S/N',
      'Member Full Name',
      'Phone Number',
      'Ministry Group',
      'Attendance Status',
      'Check-in Time'
    ];

    const rows = records.map((r, idx) => [
      (idx + 1).toString(),
      `"${(r.fullName || '').replace(/"/g, '""')}"`,
      `"${r.phoneNumber || ''}"`,
      `"${r.category || ''}"`,
      r.status,
      `"${r.checkInTime || '05:00 AM'}"`
    ].join(','));

    const csvContent = [
      ...titleBlock,
      headers.join(','),
      ...rows
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LightUp_${fileGroup}_Attendance_${session.serviceDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export specific session to PDF
  const handleExportSessionToPDF = (session: AttendanceSession) => {
    const doc = new jsPDF();
    const groupName = getSessionGroup(session);
    
    // Header
    doc.setFontSize(16);
    doc.setTextColor(74, 20, 140);
    doc.text('LIGHT UP PRAYER HOUSE — FAMILY OUTREACH', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Official Attendance Register • ${groupName}`, 14, 28);
    
    doc.setFontSize(10);
    doc.text(`Service: ${session.serviceName} (${session.serviceType})`, 14, 36);
    doc.text(`Date: ${session.serviceDate}   |   Recorded by: ${session.recordedBy}`, 14, 42);
    if (session.notes) {
      doc.text(`Notes: ${session.notes}`, 14, 48);
    }

    const present = session.records?.filter(r => r.status === 'Present').length || 0;
    const late = session.records?.filter(r => r.status === 'Late').length || 0;
    const absent = session.records?.filter(r => r.status === 'Absent').length || 0;
    const total = session.records?.length || 0;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    doc.text(`Total: ${total}   |   Present: ${present}   |   Late: ${late}   |   Absent: ${absent}   |   Rate: ${rate}%`, 14, session.notes ? 54 : 48);

    let startY = session.notes ? 62 : 56;
    doc.line(14, startY - 2, 196, startY - 2);

    // Table Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('#', 14, startY);
    doc.text('Member Name', 24, startY);
    doc.text('Phone', 95, startY);
    doc.text('Group', 140, startY);
    doc.text('Status', 175, startY);
    doc.line(14, startY + 2, 196, startY + 2);

    doc.setFont('helvetica', 'normal');
    let y = startY + 7;

    (session.records || []).forEach((r, idx) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(String(idx + 1), 14, y);
      doc.text(r.fullName.slice(0, 35), 24, y);
      doc.text(r.phoneNumber, 95, y);
      doc.text(r.category?.slice(0, 18) || '', 140, y);
      doc.text(r.status, 175, y);
      y += 5.5;
    });

    doc.save(`Attendance_${session.serviceDate}_Register.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Card */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-amber-500/30 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Attendance Records &amp; Archives</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-cinzel text-amber-100 flex items-center gap-3 flex-wrap">
              <span>Attendance History &amp; Meeting Registers</span>
              <span className={`text-xs px-3 py-1 rounded-full font-sans font-bold border flex items-center gap-1.5 ${
                activeGroup === 'Peace Group'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
              }`}>
                <span>{activeGroup === 'Peace Group' ? '🕊️' : '🌸'}</span>
                <span>Active: {activeGroup}</span>
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/90 max-w-2xl">
              Permanent attendance logs and meeting registers for Light Up Prayer House. Search past dates, inspect member roll calls, and export official reports to Excel or PDF.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onSwitchGroupDirect && (
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-purple-900/60 border border-purple-700 shadow-inner">
                <button
                  type="button"
                  onClick={() => onSwitchGroupDirect('Esther Group')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeGroup === 'Esther Group'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                      : 'text-purple-300 hover:text-white'
                  }`}
                  title="Switch to Esther Group"
                >
                  <span>🌸 Esther Group</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchGroupDirect('Peace Group')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
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

            <button
              onClick={onTakeNewAttendance}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-purple-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer border border-amber-300"
            >
              <PlusCircle className="w-4 h-4 fill-purple-950" />
              <span>Take Attendance</span>
            </button>

            <button
              onClick={handleExportAllToCSV}
              className="px-4 py-2.5 rounded-2xl bg-purple-900/80 hover:bg-purple-800 text-pink-300 border border-purple-700 text-xs font-extrabold flex items-center gap-2 shadow-lg cursor-pointer"
              title={`Download ${selectedGroupFilter === 'ALL' ? 'all' : selectedGroupFilter} records as CSV spreadsheet`}
            >
              <Download className="w-4 h-4 text-pink-400" />
              <span>Export CSV ({selectedGroupFilter === 'Esther Group' ? 'Esther Only' : selectedGroupFilter === 'Peace Group' ? 'Peace Only' : 'All'})</span>
            </button>

            <button
              onClick={handleExportAllToExcel}
              className="px-4 py-2.5 rounded-2xl bg-purple-900/80 hover:bg-purple-800 text-emerald-300 border border-purple-700 text-xs font-extrabold flex items-center gap-2 shadow-lg cursor-pointer"
              title="Download entire history as Excel spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-purple-950/70 border border-purple-800/80 shadow-md">
          <div className="flex items-center justify-between text-purple-300 text-xs font-semibold">
            <span>Meetings Recorded</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-cinzel text-amber-200 mt-1">
            {aggregateStats.totalSessions}
          </div>
          <div className="text-[11px] text-purple-400 mt-0.5">
            Past meeting registers
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-purple-950/70 border border-purple-800/80 shadow-md">
          <div className="flex items-center justify-between text-purple-300 text-xs font-semibold">
            <span>Average Turnout</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-cinzel text-emerald-400 mt-1">
            {aggregateStats.averageRate}%
          </div>
          <div className="text-[11px] text-purple-400 mt-0.5">
            Present + Late rate
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-purple-950/70 border border-purple-800/80 shadow-md">
          <div className="flex items-center justify-between text-purple-300 text-xs font-semibold">
            <span>Total Attendees</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-cinzel text-emerald-300 mt-1">
            {(aggregateStats.totalPresent + aggregateStats.totalLate).toLocaleString()}
          </div>
          <div className="text-[11px] text-purple-400 mt-0.5">
            Cumulative attendances
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-purple-950/70 border border-purple-800/80 shadow-md">
          <div className="flex items-center justify-between text-purple-300 text-xs font-semibold">
            <span>Total Absentees</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black font-cinzel text-rose-400 mt-1">
            {aggregateStats.totalAbsent.toLocaleString()}
          </div>
          <div className="text-[11px] text-purple-400 mt-0.5">
            Follow-up candidates
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {editSuccessNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border-2 border-emerald-500 text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-fadeIn shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{editSuccessNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-purple-950/60 border border-purple-800/70 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search meetings by date, service name, attendee name, notes..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-purple-900/40 border border-purple-700/80 text-xs sm:text-sm text-purple-100 placeholder-purple-400 focus:outline-none focus:border-amber-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Group Filter */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedGroupFilter('ALL')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all border ${
                selectedGroupFilter === 'ALL'
                  ? 'bg-amber-500 text-purple-950 border-amber-400 font-extrabold shadow-md'
                  : 'bg-purple-900/40 text-purple-200 border-purple-700 hover:bg-purple-900/80'
              }`}
            >
              All Groups
            </button>
            <button
              onClick={() => setSelectedGroupFilter('Esther Group')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all border ${
                selectedGroupFilter === 'Esther Group'
                  ? 'bg-pink-600 text-white border-pink-400 font-extrabold shadow-md'
                  : 'bg-purple-900/40 text-purple-200 border-purple-700 hover:bg-purple-900/80'
              }`}
            >
              🌸 Esther Group
            </button>
            <button
              onClick={() => setSelectedGroupFilter('Peace Group')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all border ${
                selectedGroupFilter === 'Peace Group'
                  ? 'bg-emerald-600 text-white border-emerald-400 font-extrabold shadow-md'
                  : 'bg-purple-900/40 text-purple-200 border-purple-700 hover:bg-purple-900/80'
              }`}
            >
              🕊️ Peace Group
            </button>
          </div>

          {/* Service Type Dropdown */}
          <select
            value={selectedServiceType}
            onChange={(e) => setSelectedServiceType(e.target.value)}
            className="w-full md:w-auto px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-700/80 text-xs text-purple-200 focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">All Service Types</option>
            {uniqueServiceTypes.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {/* Sort */}
          <button
            onClick={() => setDateSort(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
            className="w-full md:w-auto px-3 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-900 text-purple-200 border border-purple-700/80 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <span>{dateSort === 'NEWEST' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-purple-300 pt-1 border-t border-purple-900/60">
          <div>
            Showing <span className="font-bold text-amber-300">{filteredSessions.length}</span> recorded attendance registers
          </div>
          {searchTerm && (
            <div className="text-amber-300 font-semibold">
              Search results for "{searchTerm}"
            </div>
          )}
        </div>
      </div>

      {/* Attendance Registers Ledger Cards */}
      <div className="space-y-3">
        {filteredSessions.map((session) => {
          const sessionGroup = getSessionGroup(session);
          const presentCount = session.records?.filter(r => r.status === 'Present').length || 0;
          const lateCount = session.records?.filter(r => r.status === 'Late').length || 0;
          const absentCount = session.records?.filter(r => r.status === 'Absent').length || 0;
          const excusedCount = session.records?.filter(r => r.status === 'Excused').length || 0;
          const totalMembers = session.records?.length || 0;
          const turnoutRate = totalMembers > 0
            ? Math.round(((presentCount + lateCount) / totalMembers) * 100)
            : 0;

          return (
            <div
              key={session.id}
              className="p-4 sm:p-5 rounded-2xl bg-purple-950/70 border border-purple-800/80 hover:border-purple-600 transition-all shadow-md space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      📅 {session.serviceDate}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                      sessionGroup === 'Peace Group'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                    }`}>
                      {sessionGroup === 'Peace Group' ? '🕊️ Peace Group' : '🌸 Esther Group'}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-lg bg-purple-900/60 text-purple-300 border border-purple-700/60">
                      {session.serviceType}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-extrabold text-amber-100 font-cinzel">
                    {session.serviceName}
                  </h3>

                  <div className="text-xs text-purple-300 flex items-center gap-2 flex-wrap">
                    <span>Recorded by: <strong className="text-amber-200">{session.recordedBy}</strong></span>
                    {session.notes && (
                      <>
                        <span className="text-purple-600">•</span>
                        <span className="italic text-purple-300/90 truncate max-w-md">{session.notes}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Turnout Percentage Badge */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-black font-cinzel text-amber-300">
                      {turnoutRate}%
                    </div>
                    <div className="text-[10px] text-purple-300 font-bold uppercase">
                      Turnout Rate
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setViewingSession(session)}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-purple-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                      title="Inspect full roll call register"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Register</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditDate(session)}
                      className="px-2.5 py-2 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-amber-500/50 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                      title="Edit the date, title, or service type of this attendance record"
                    >
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit Date</span>
                    </button>

                    {onEditSessionInTracker && (
                      <button
                        onClick={() => onEditSessionInTracker(session.id)}
                        className="px-2.5 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-indigo-300 border border-purple-700/80 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                        title="Open and edit roll call in Attendance Sheet"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Edit Roll Call</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleExportSessionToCSV(session)}
                      className="p-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-pink-300 border border-purple-700/80 cursor-pointer"
                      title="Export to CSV (.csv)"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleExportSessionToExcel(session)}
                      className="p-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-emerald-300 border border-purple-700/80 cursor-pointer"
                      title="Export to Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleExportSessionToPDF(session)}
                      className="p-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-amber-300 border border-purple-700/80 cursor-pointer"
                      title="Export PDF Register"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    {currentRole === 'Admin' && (
                      <button
                        onClick={() => setSessionToDelete(session)}
                        className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 cursor-pointer"
                        title="Delete session record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendance Breakdown Pills & Progress Bar */}
              <div className="pt-2 border-t border-purple-900/60 space-y-2">
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                      🟢 {presentCount} Present
                    </span>
                    {lateCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                        🟡 {lateCount} Late
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold">
                      🔴 {absentCount} Absent
                    </span>
                    {excusedCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold">
                        🟣 {excusedCount} Excused
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-purple-300 font-mono">
                    Total Roster: <strong className="text-amber-200">{totalMembers}</strong> members
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-purple-950 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${totalMembers > 0 ? (presentCount / totalMembers) * 100 : 0}%` }}
                  />
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${totalMembers > 0 ? (lateCount / totalMembers) * 100 : 0}%` }}
                  />
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${totalMembers > 0 ? (absentCount / totalMembers) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {filteredSessions.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-purple-950/40 border border-purple-900 space-y-3">
            <BookOpen className="w-12 h-12 text-purple-400 mx-auto opacity-40" />
            <h4 className="text-base font-bold text-amber-200">No attendance records found</h4>
            <p className="text-xs text-purple-300 max-w-sm mx-auto">
              There are no saved attendance registers matching your filter criteria. Click below to take your first roll call!
            </p>
            <button
              onClick={onTakeNewAttendance}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-bold text-xs cursor-pointer shadow-md inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Take Attendance Now</span>
            </button>
          </div>
        )}
      </div>

      {/* Viewing Register Modal */}
      {viewingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 border border-amber-500/40 p-6 shadow-2xl space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-purple-800/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>{viewingSession.serviceDate}</span>
                  </span>
                  
                  <button
                    onClick={() => handleOpenEditDate(viewingSession)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                    title="Click to edit the date of this attendance record"
                  >
                    <Edit3 className="w-3 h-3 text-amber-300" />
                    <span>Edit Date</span>
                  </button>

                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                    getSessionGroup(viewingSession) === 'Peace Group'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                  }`}>
                    {getSessionGroup(viewingSession) === 'Peace Group' ? '🕊️ Peace Group' : '🌸 Esther Group'}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-amber-100 font-cinzel">
                  {viewingSession.serviceName}
                </h3>
                <p className="text-xs text-purple-300">
                  {viewingSession.serviceType} • Recorded by: <strong>{viewingSession.recordedBy}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {onEditSessionInTracker && (
                  <button
                    onClick={() => {
                      const sId = viewingSession.id;
                      setViewingSession(null);
                      onEditSessionInTracker(sId);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white border border-purple-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Edit roll call marks directly in Attendance Tracker"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                    <span className="hidden sm:inline">Edit Roll Call</span>
                  </button>
                )}

                <button
                  onClick={() => handleExportSessionToCSV(viewingSession)}
                  className="px-3 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-pink-300 border border-purple-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CSV</span>
                </button>
                <button
                  onClick={() => handleExportSessionToExcel(viewingSession)}
                  className="px-3 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-emerald-300 border border-purple-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
                <button
                  onClick={() => handleExportSessionToPDF(viewingSession)}
                  className="px-3 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-amber-300 border border-purple-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={() => setViewingSession(null)}
                  className="p-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Turnout Summary Bar in Modal */}
            <div className="p-3.5 rounded-2xl bg-purple-950/80 border border-purple-800/80 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setModalStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    modalStatusFilter === 'ALL'
                      ? 'bg-amber-500 text-purple-950'
                      : 'bg-purple-900/40 text-purple-300 hover:text-white'
                  }`}
                >
                  All ({(viewingSession.records || []).length})
                </button>
                <button
                  onClick={() => setModalStatusFilter('Present')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    modalStatusFilter === 'Present'
                      ? 'bg-emerald-500 text-purple-950'
                      : 'bg-emerald-950/40 text-emerald-300 hover:text-emerald-200'
                  }`}
                >
                  🟢 Present ({(viewingSession.records || []).filter(r => r.status === 'Present').length})
                </button>
                <button
                  onClick={() => setModalStatusFilter('Late')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    modalStatusFilter === 'Late'
                      ? 'bg-amber-500 text-purple-950'
                      : 'bg-amber-950/40 text-amber-300 hover:text-amber-200'
                  }`}
                >
                  🟡 Late ({(viewingSession.records || []).filter(r => r.status === 'Late').length})
                </button>
                <button
                  onClick={() => setModalStatusFilter('Absent')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    modalStatusFilter === 'Absent'
                      ? 'bg-rose-500 text-white'
                      : 'bg-rose-950/40 text-rose-300 hover:text-rose-200'
                  }`}
                >
                  🔴 Absent ({(viewingSession.records || []).filter(r => r.status === 'Absent').length})
                </button>
              </div>

              {/* Search Inside Modal */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  placeholder="Filter attendee name or phone..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-purple-900/40 border border-purple-700/80 text-xs text-purple-100 placeholder-purple-400 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Member Register Table */}
            <div className="rounded-2xl border border-purple-800/80 overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-purple-950 text-amber-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-purple-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Member Name</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Group</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/60 bg-purple-950/40">
                    {(viewingSession.records || [])
                      .filter(r => {
                        if (modalStatusFilter !== 'ALL' && r.status !== modalStatusFilter) return false;
                        if (modalSearchTerm.trim()) {
                          const q = modalSearchTerm.toLowerCase();
                          return r.fullName.toLowerCase().includes(q) || r.phoneNumber.includes(q);
                        }
                        return true;
                      })
                      .map((rec, idx) => (
                        <tr key={rec.beneficiaryId || idx} className="hover:bg-purple-900/30 transition-colors">
                          <td className="py-2.5 px-3 text-purple-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-amber-100">
                            {rec.fullName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-purple-300">
                            {rec.phoneNumber}
                          </td>
                          <td className="py-2.5 px-3 text-purple-300">
                            {rec.category}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              rec.status === 'Present'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : rec.status === 'Late'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : rec.status === 'Excused'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}>
                              {rec.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-purple-300 text-[11px]">
                            {rec.checkInTime || '05:00 AM'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-purple-900/60">
              <span className="text-xs text-purple-300">
                Light Up Prayer House • Roll Call Audit Verification
              </span>
              <button
                onClick={() => setViewingSession(null)}
                className="px-4 py-2 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-amber-200 text-xs font-bold cursor-pointer"
              >
                Close Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-purple-950 to-slate-950 border border-rose-500/40 p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-white font-cinzel">
              Delete Attendance Session?
            </h3>
            <p className="text-xs text-purple-300">
              Are you sure you want to delete the attendance register for <strong className="text-amber-300">{sessionToDelete.serviceName}</strong> ({sessionToDelete.serviceDate})? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteSession(sessionToDelete.id);
                  setSessionToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Attendance Record Date & Details */}
      {editingDateSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 border-2 border-amber-500/60 p-6 shadow-2xl space-y-5 text-white">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-purple-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Calendar className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black font-cinzel text-amber-200">
                    Edit Attendance Record Date
                  </h3>
                  <p className="text-[11px] text-purple-300">
                    Modify the recorded meeting date or service details
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingDateSession(null)}
                className="p-1.5 rounded-xl bg-purple-900/60 hover:bg-rose-900/80 text-purple-200 hover:text-white cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Session Summary */}
            <div className="p-3.5 rounded-2xl bg-purple-900/40 border border-purple-800/80 space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-purple-300">Target Session Record</div>
              <div className="text-xs font-bold text-amber-300 font-mono">
                {editingDateSession.serviceName}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-purple-200 font-mono pt-0.5">
                <span>Current Date: <strong className="text-rose-300">{editingDateSession.serviceDate}</strong></span>
                <span>•</span>
                <span>{editingDateSession.records?.filter(r => r.status === 'Present' || r.status === 'Late').length || 0} Present</span>
                <span>/</span>
                <span>{editingDateSession.records?.length || 0} Total</span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              
              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-amber-300">
                  New Attendance Date: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={editDateValue}
                  onChange={(e) => setEditDateValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-purple-900/70 border border-amber-500/60 text-white text-xs font-bold font-mono focus:outline-none focus:border-amber-400 shadow-inner"
                />

                {/* Quick Date Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-purple-300">Quick set:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setEditDateValue(today);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-purple-900 hover:bg-purple-800 text-[10px] text-amber-300 border border-purple-700 font-mono cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                      setEditDateValue(yesterday);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-purple-900 hover:bg-purple-800 text-[10px] text-amber-300 border border-purple-700 font-mono cursor-pointer"
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - (d.getDay() || 7));
                      setEditDateValue(d.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-purple-900 hover:bg-purple-800 text-[10px] text-amber-300 border border-purple-700 font-mono cursor-pointer"
                  >
                    Last Sunday
                  </button>
                </div>
              </div>

              {/* Service / Program Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-amber-300">
                  Service / Meeting Title:
                </label>
                <input
                  type="text"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  placeholder="e.g. Daily Morning Devotional Prayers"
                  className="w-full px-3.5 py-2 rounded-xl bg-purple-900/60 border border-purple-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Service Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-amber-300">
                  Service Type:
                </label>
                <select
                  value={editTypeValue}
                  onChange={(e) => setEditTypeValue(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-purple-900/60 border border-purple-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                >
                  <option value="Daily Morning Devotional">🌅 Daily Morning Devotional Prayers</option>
                  <option value="Sunday Service">⛪ Sunday Service</option>
                  <option value="Mid-Week Service">🔥 Mid-Week Service</option>
                  <option value="Night Vigil">🌙 Night Vigil</option>
                  <option value="Special Revival">⚡ Special Revival</option>
                  <option value="Youth Fellowship">🙌 Youth Fellowship</option>
                  <option value="Ministers Meeting">👑 Ministers Meeting</option>
                  <option value="Other">📌 Other Outreach</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-amber-300">
                  Meeting Notes / Remarks (Optional):
                </label>
                <textarea
                  rows={2}
                  value={editNotesValue}
                  onChange={(e) => setEditNotesValue(e.target.value)}
                  placeholder="Add any notes about this service..."
                  className="w-full px-3.5 py-2 rounded-xl bg-purple-900/60 border border-purple-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

            </div>

            {/* Explanatory Notice */}
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/80 text-[11px] text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                All <strong>{editingDateSession.records?.length || 0} member attendance statuses</strong> will be safely preserved and migrated to the new date (<strong>{editDateValue}</strong>).
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-purple-800">
              {onEditSessionInTracker ? (
                <button
                  type="button"
                  onClick={() => {
                    const sId = editingDateSession.id;
                    setEditingDateSession(null);
                    onEditSessionInTracker(sId);
                  }}
                  className="text-xs text-indigo-300 hover:text-indigo-200 underline font-semibold cursor-pointer"
                >
                  Edit individual member marks &rarr;
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDateSession(null)}
                  className="px-4 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveEditedDate}
                  disabled={!editDateValue}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-purple-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Save New Date</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
