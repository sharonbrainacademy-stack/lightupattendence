import React, { useState, useMemo, useEffect } from 'react';
import { Send, MessageSquare, Smartphone, Copy, Check, Users, Sparkles, Filter, Phone, CheckCircle2, ShieldCheck, Flame, RefreshCw } from 'lucide-react';
import { Beneficiary, AttendanceSession, BulkMessageLog, UserRole, MinistryGroup } from '../types';
import { getVTPassConfig } from '../utils/vtpassService';

interface BulkMessagingProps {
  beneficiaries: Beneficiary[];
  attendanceSessions: AttendanceSession[];
  currentRole: UserRole;
  currentUserName: string;
  activeGroup?: MinistryGroup;
  initialCategory?: string;
  initialPreSelectedPhones?: string[];
  initialPreSelectedNames?: string[];
  onLogMessage: (log: BulkMessageLog) => void;
}

export const BulkMessaging: React.FC<BulkMessagingProps> = ({
  beneficiaries,
  attendanceSessions,
  currentRole,
  currentUserName,
  activeGroup = 'Esther Group',
  initialCategory = 'ALL',
  initialPreSelectedPhones = [],
  initialPreSelectedNames = [],
  onLogMessage
}) => {
  // Audience selection state
  const [audienceCategory, setAudienceCategory] = useState<string>(initialCategory);
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(() => new Set(initialPreSelectedPhones));

  // Pre-loaded templates
  const TEMPLATES = [
    {
      id: 'morning_devotional_followup',
      label: '🌅 Morning Devotional Follow-Up',
      text: `Grace and Peace from Light Up Prayer House! We missed you at this morning's Daily Devotional Prayers (05:00 AM WAT). We pray God's covenant grace and protection upon your day! Let us know if you have any prayer request! 🔥`
    },
    {
      id: 'morning_devotional_reminder',
      label: '⏰ Daily Morning Prayer Reminder',
      text: `Shalom Beloved! Remember to connect to our Daily Morning Devotional Prayers tomorrow at 05:00 AM WAT. Come expecting prophetic breakthroughs and covenant answers!`
    },
    {
      id: 'absent_followup',
      label: '💌 General Absent Follow-Up',
      text: `Grace and Peace from Light Up Prayer House! We missed you at our service. We pray God's mighty blessings over your week. Let us know if you have any prayer request! We Pray, Believe, Rise, and Overcome! 🔥`
    },
    {
      id: 'prayer_encouragement',
      label: '🙏 Prophetic Prayer & Blessing',
      text: `Beloved, we speak peace and divine acceleration into your life today! May the Lord fight your battles and grant you divine favour in all your endeavors! We Move By Fire — Pray • Believe • Rise • Overcome! 🔥`
    }
  ];

  const [messageText, setMessageText] = useState<string>(TEMPLATES[0].text);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // VTPass SMS Dispatch State
  const [isSendingVTPassSMS, setIsSendingVTPassSMS] = useState(false);
  const [vtpassSmsResult, setVtpassSmsResult] = useState<string | null>(null);

  // Sync default audience category when activeGroup changes
  useEffect(() => {
    if (initialCategory === 'ALL') {
      if (activeGroup === 'Peace Group') {
        setAudienceCategory('PEACE_GROUP');
      } else {
        setAudienceCategory('ESTHER_GROUP');
      }
    }
  }, [activeGroup, initialCategory]);

  // Sync selected phones when audience category changes
  useEffect(() => {
    if (initialPreSelectedPhones.length > 0 && audienceCategory === 'ABSENT_MEMBERS') {
      setSelectedPhones(new Set(initialPreSelectedPhones));
      return;
    }

    if (audienceCategory === 'ALL') {
      setSelectedPhones(new Set(beneficiaries.map(b => b.phoneNumber)));
    } else if (audienceCategory === 'ESTHER_GROUP') {
      const estherMembers = beneficiaries.filter(b => b.category === 'Esther Group Benin' || b.notes?.includes('Esther Group'));
      setSelectedPhones(new Set(estherMembers.map(b => b.phoneNumber)));
    } else if (audienceCategory === 'PEACE_GROUP') {
      const peaceMembers = beneficiaries.filter(b => b.category === 'Peace Group' || b.notes?.includes('Peace'));
      setSelectedPhones(new Set(peaceMembers.map(b => b.phoneNumber)));
    } else if (audienceCategory === 'PASTORS') {
      const pastors = beneficiaries.filter(b => b.category === 'Pastor / Minister Care');
      setSelectedPhones(new Set(pastors.map(b => b.phoneNumber)));
    } else if (audienceCategory === 'FIRST_TIMERS') {
      const visitors = beneficiaries.filter(b => b.category === 'Visitor');
      setSelectedPhones(new Set(visitors.map(b => b.phoneNumber)));
    } else if (audienceCategory === 'ABSENT_MEMBERS') {
      if (attendanceSessions.length > 0) {
        const latestSession = attendanceSessions[0];
        const absentRecords = latestSession.records.filter(r => r.status === 'Absent');
        setSelectedPhones(new Set(absentRecords.map(r => r.phoneNumber)));
      }
    }
  }, [audienceCategory, beneficiaries, attendanceSessions]);

  // Toggle single selection
  const handleToggleRecipient = (phone: string) => {
    setSelectedPhones(prev => {
      const updated = new Set(prev);
      if (updated.has(phone)) {
        updated.delete(phone);
      } else {
        updated.add(phone);
      }
      return updated;
    });
  };

  // Toggle select all
  const handleSelectAll = () => {
    if (selectedPhones.size === targetBeneficiaries.length) {
      setSelectedPhones(new Set());
    } else {
      setSelectedPhones(new Set(targetBeneficiaries.map(b => b.phoneNumber)));
    }
  };

  // Target beneficiaries based on audience category
  const targetBeneficiaries = useMemo(() => {
    if (audienceCategory === 'PASTORS') {
      return beneficiaries.filter(b => b.category === 'Pastor / Minister Care');
    }
    if (audienceCategory === 'FIRST_TIMERS') {
      return beneficiaries.filter(b => b.category === 'Visitor');
    }
    if (audienceCategory === 'ABSENT_MEMBERS') {
      if (attendanceSessions.length > 0) {
        const latestSession = attendanceSessions[0];
        const absentPhones = new Set(latestSession.records.filter(r => r.status === 'Absent').map(r => r.phoneNumber));
        return beneficiaries.filter(b => absentPhones.has(b.phoneNumber));
      }
    }
    return beneficiaries;
  }, [audienceCategory, beneficiaries, attendanceSessions]);

  // Filtered array of selected recipients
  const selectedList = useMemo(() => {
    return targetBeneficiaries.filter(b => selectedPhones.has(b.phoneNumber));
  }, [targetBeneficiaries, selectedPhones]);

  // Category breakdown counts for selected recipients
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedList.forEach(b => {
      const cat = b.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [selectedList]);

  // Optional category filter within target beneficiaries checklist
  const [checklistCategoryFilter, setChecklistCategoryFilter] = useState<string>('ALL');

  const filteredTargetBeneficiaries = useMemo(() => {
    if (checklistCategoryFilter === 'ALL') return targetBeneficiaries;
    return targetBeneficiaries.filter(b => b.category === checklistCategoryFilter);
  }, [targetBeneficiaries, checklistCategoryFilter]);

  // Clean comma separated numbers list
  const formattedNumbersComma = useMemo(() => {
    return selectedList.map(b => b.phoneNumber.replace(/[^0-9+]/g, '')).join(', ');
  }, [selectedList]);

  // WhatsApp wa.me links list
  const whatsappLinks = useMemo(() => {
    return selectedList.map(b => {
      let cleanPhone = b.phoneNumber.replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '234' + cleanPhone.slice(1);
      }
      let personalizedMsg = messageText
        .replace(/\{Name\}|\{name\}/g, b.fullName)
        .replace(/\{Phone\}|\{phone\}/g, b.phoneNumber);

      const encodedMsg = encodeURIComponent(personalizedMsg);
      return {
        name: b.fullName,
        phone: b.phoneNumber,
        url: `https://wa.me/${cleanPhone}?text=${encodedMsg}`
      };
    });
  }, [selectedList, messageText]);

  // Mobile Native SMS URI string
  const mobileSMSUri = useMemo(() => {
    const numbersOnly = selectedList.map(b => b.phoneNumber.replace(/[^0-9]/g, '')).join(',');
    const encodedMsg = encodeURIComponent(messageText);
    return `sms:${numbersOnly}?body=${encodedMsg}`;
  }, [selectedList, messageText]);

  // Action: Copy phone numbers
  const handleCopyNumbers = () => {
    navigator.clipboard.writeText(formattedNumbersComma);
    setCopiedNotification('✅ Phone numbers list copied to clipboard!');
    setTimeout(() => setCopiedNotification(null), 3500);

    onLogMessage({
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sender: currentUserName,
      channel: 'Copy List',
      recipientCount: selectedList.length,
      messageText,
      audienceCategory
    });
  };

  // Action: Copy complete formatted message
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopiedNotification('✅ Message text copied to clipboard!');
    setTimeout(() => setCopiedNotification(null), 3500);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-amber-500/30 shadow-2xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin Broadcast &amp; Member Follow-Up Center</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-cinzel text-amber-100">
            Bulk Messaging &amp; Outreach Follow-Up
          </h2>
          <p className="text-xs sm:text-sm text-purple-200/90 max-w-2xl">
            Send bulk WhatsApp messages, mobile SMS announcements, or copy recipient lists for follow-up with members, absent attendees, and pastors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Audience Selection & Target Members */}
        <div className="lg:col-span-1 space-y-4">
          
          <div className="p-4 rounded-2xl bg-purple-950/80 border border-purple-800/80 space-y-3">
            <h3 className="text-xs font-extrabold text-amber-300 uppercase tracking-wider font-cinzel flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>1. Target Audience Segment</span>
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setAudienceCategory('ALL')}
                className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between border cursor-pointer transition-all ${
                  audienceCategory === 'ALL'
                    ? 'bg-amber-500 text-purple-950 border-amber-400 font-extrabold shadow-md'
                    : 'bg-purple-900/40 text-purple-200 border-purple-800 hover:text-amber-300'
                }`}
              >
                <span>👥 All Registered Members</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-950/40 text-xs font-mono">{beneficiaries.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setAudienceCategory('ESTHER_GROUP')}
                className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between border cursor-pointer transition-all ${
                  audienceCategory === 'ESTHER_GROUP'
                    ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white border-pink-400 font-extrabold shadow-md'
                    : 'bg-purple-900/40 text-purple-200 border-purple-800 hover:text-pink-300'
                }`}
              >
                <span>🌸 Esther Group Benin (Daily Prayer)</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-950/40 text-xs font-mono">
                  {beneficiaries.filter(b => b.category === 'Esther Group Benin' || b.notes?.includes('Esther Group')).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAudienceCategory('PEACE_GROUP')}
                className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between border cursor-pointer transition-all ${
                  audienceCategory === 'PEACE_GROUP'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-400 font-extrabold shadow-md'
                    : 'bg-purple-900/40 text-purple-200 border-purple-800 hover:text-emerald-300'
                }`}
              >
                <span>🕊️ Peace Group (Daily Prayer)</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-950/40 text-xs font-mono">
                  {beneficiaries.filter(b => b.category === 'Peace Group' || b.notes?.includes('Peace')).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAudienceCategory('ABSENT_MEMBERS')}
                className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between border cursor-pointer transition-all ${
                  audienceCategory === 'ABSENT_MEMBERS'
                    ? 'bg-amber-500 text-purple-950 border-amber-400 font-extrabold shadow-md'
                    : 'bg-purple-900/40 text-purple-200 border-purple-800 hover:text-amber-300'
                }`}
              >
                <span>🔴 Absent Members (Last Service)</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-950/40 text-xs font-mono">
                  {attendanceSessions[0]?.records.filter(r => r.status === 'Absent').length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAudienceCategory('PASTORS')}
                className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between border cursor-pointer transition-all ${
                  audienceCategory === 'PASTORS'
                    ? 'bg-amber-500 text-purple-950 border-amber-400 font-extrabold shadow-md'
                    : 'bg-purple-900/40 text-purple-200 border-purple-800 hover:text-amber-300'
                }`}
              >
                <span>👑 Pastors &amp; Ministers Only</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-950/40 text-xs font-mono">
                  {beneficiaries.filter(b => b.category === 'Pastor / Minister Care').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAudienceCategory('FIRST_TIMERS')}
                className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between border cursor-pointer transition-all ${
                  audienceCategory === 'FIRST_TIMERS'
                    ? 'bg-amber-500 text-purple-950 border-amber-400 font-extrabold shadow-md'
                    : 'bg-purple-900/40 text-purple-200 border-purple-800 hover:text-amber-300'
                }`}
              >
                <span>🌱 First Timers &amp; Visitors</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-950/40 text-xs font-mono">
                  {beneficiaries.filter(b => b.category === 'Visitor').length}
                </span>
              </button>
            </div>
          </div>

          {/* Category Breakdown Summary Indicator */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/90 to-slate-900 border border-amber-500/40 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-300 uppercase tracking-wider text-[10px] font-cinzel flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Audience Category Breakdown</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-200">
                {selectedList.length} Selected
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {Object.keys(categoryCounts).length > 0 ? (
                Object.entries(categoryCounts).map(([cat, count]) => (
                  <div key={cat} className="px-2 py-0.5 rounded-lg bg-purple-950 border border-purple-700/80 text-[10px] font-bold text-purple-200 flex items-center gap-1">
                    <span>{cat}:</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-black text-[10px]">{count}</span>
                  </div>
                ))
              ) : (
                <div className="text-[10px] text-purple-400 italic">No recipients selected.</div>
              )}
            </div>
          </div>

          {/* Recipient Checklist */}
          <div className="p-4 rounded-2xl bg-purple-950/80 border border-purple-800/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-amber-300">
                Recipients ({selectedList.length}/{targetBeneficiaries.length})
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={checklistCategoryFilter}
                  onChange={(e) => setChecklistCategoryFilter(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-purple-900 border border-purple-700 text-amber-200 text-[10px] font-bold"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Esther Group Benin">🌸 Esther Group Benin</option>
                  <option value="Peace Group">🕊️ Peace Group</option>
                  <option value="Pastor / Minister Care">👑 Pastors &amp; Ministers</option>
                  <option value="Widow Support">👵 Widows</option>
                  <option value="Youth Outreach">🙌 Youth Choir</option>
                  <option value="Elderly Care">👴 Elderly Care</option>
                  <option value="Visitor">🌱 Visitors</option>
                </select>

                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] text-amber-400 hover:underline font-bold"
                >
                  {selectedPhones.size === targetBeneficiaries.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
              {filteredTargetBeneficiaries.map((b) => {
                const isChecked = selectedPhones.has(b.phoneNumber);
                return (
                  <label
                    key={b.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                      isChecked
                        ? 'bg-purple-900/80 border-amber-400/80 text-amber-200 shadow-sm'
                        : 'bg-purple-950/40 border-purple-900 text-purple-300 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleRecipient(b.phoneNumber)}
                        className="rounded border-purple-700 text-amber-500 focus:ring-amber-400"
                      />
                      <div className="truncate">
                        <div className="font-bold text-amber-100 truncate">{b.fullName}</div>
                        <div className="text-[10px] text-purple-300 font-mono">{b.phoneNumber}</div>
                      </div>
                    </div>

                    {/* Category Indicator Badge */}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold flex-shrink-0 whitespace-nowrap ${
                      b.category === 'Esther Group Benin'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : b.category === 'Pastor / Minister Care'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : b.category === 'Widow Support'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : b.category === 'Youth Outreach'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : b.category === 'Elderly Care'
                        ? 'bg-amber-700/20 text-amber-200 border border-amber-600/40'
                        : b.category === 'Visitor'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {b.category === 'Esther Group Benin' ? '🌸 ' : b.category === 'Pastor / Minister Care' ? '👑 ' : b.category === 'Widow Support' ? '👵 ' : ''}
                      {b.category}
                    </span>
                  </label>
                );
              })}

              {filteredTargetBeneficiaries.length === 0 && (
                <div className="p-4 text-center text-xs text-purple-300 italic">
                  No members found in this category segment.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Message Composer & Multi-Channel Dispatch */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Preset Templates & Custom Message Option */}
          <div className="p-4 rounded-2xl bg-purple-950/80 border border-purple-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-amber-300 uppercase tracking-wider font-cinzel">
                2. Choose Template or Start Blank
              </label>
              <button
                type="button"
                onClick={() => setMessageText('')}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Clear message box to write your own custom message from scratch"
              >
                <span>✏️ Type Blank Custom Message</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMessageText(t.text)}
                  className="p-3 rounded-xl bg-purple-900/50 hover:bg-purple-800/80 border border-purple-700/80 text-left text-xs font-bold text-amber-200 cursor-pointer transition-all"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message Textarea & Custom Variables */}
          <div className="p-4 rounded-2xl bg-purple-950/80 border border-purple-800/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-extrabold text-amber-300 uppercase tracking-wider font-cinzel">
                3. Write or Edit Custom Message Body
              </label>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMessageText(prev => prev + ' {Name}')}
                  className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-bold cursor-pointer"
                  title="Appends {Name} variable to personalize message per recipient"
                >
                  ➕ Insert &#123;Name&#125;
                </button>
                <button
                  type="button"
                  onClick={() => setMessageText(prev => prev + ' {Phone}')}
                  className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-bold cursor-pointer"
                  title="Appends {Phone} variable"
                >
                  ➕ Insert &#123;Phone&#125;
                </button>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1 ml-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-purple-900/60 border border-purple-700 text-amber-100 text-xs font-medium focus:outline-none focus:border-amber-400 transition-all"
              placeholder="Type your own custom broadcast announcement, prayer message, or reminder here..."
            />
            <p className="text-[11px] text-purple-300 italic">
              💡 <strong>Tip:</strong> You can freely type any custom text in the box above. Using <code>&#123;Name&#125;</code> will automatically replace with each member's actual full name when sending via WhatsApp or SMS!
            </p>
          </div>

          {/* Multi-Channel Delivery Bar */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900/60 to-slate-900 border border-amber-500/40 space-y-4">
            <h3 className="text-xs font-extrabold text-amber-300 uppercase tracking-wider font-cinzel">
              4. Dispatch Options ({selectedList.length} Recipients Selected)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Option A: Mobile Native SMS Link */}
              <a
                href={mobileSMSUri}
                onClick={() => {
                  onLogMessage({
                    id: `msg-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    sender: currentUserName,
                    channel: 'SMS',
                    recipientCount: selectedList.length,
                    messageText,
                    audienceCategory
                  });
                }}
                className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-extrabold text-xs flex flex-col items-center justify-center gap-1 text-center shadow-lg cursor-pointer border border-blue-400/30"
              >
                <div className="flex items-center gap-2 text-sm font-black">
                  <Smartphone className="w-4 h-4 text-white" />
                  <span>📱 SEND NATIVE MOBILE SMS</span>
                </div>
                <span className="text-[10px] text-blue-200 font-normal">
                  Opens phone SMS app with {selectedList.length} numbers pre-filled
                </span>
              </a>

              {/* Option B: Copy Numbers for Bulk SMS Platforms */}
              <button
                type="button"
                onClick={handleCopyNumbers}
                className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-purple-950 font-extrabold text-xs flex flex-col items-center justify-center gap-1 text-center shadow-lg cursor-pointer"
              >
                <div className="flex items-center gap-2 text-sm font-black">
                  <Copy className="w-4 h-4 text-purple-950" />
                  <span>📋 COPY PHONE NUMBERS LIST</span>
                </div>
                <span className="text-[10px] text-purple-900 font-semibold">
                  Copy comma-separated list for Termii / WhatsApp Broadcast
                </span>
              </button>
            </div>

            {copiedNotification && (
              <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-600 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{copiedNotification}</span>
              </div>
            )}

            {/* Option C: WhatsApp Chat Queue Opener */}
            <div className="pt-2 border-t border-purple-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>💬 WhatsApp Direct Chat Queue ({whatsappLinks.length})</span>
                </span>
                <span className="text-[10px] text-purple-300">Click any recipient to open direct WhatsApp chat</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {whatsappLinks.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-amber-100">{item.name}</div>
                      <div className="text-[10px] text-purple-300 font-mono">{item.phone}</div>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <span>Open WhatsApp</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
