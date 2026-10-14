import React, { useState } from 'react';
import {
  X,
  BookOpen,
  CheckCircle2,
  Copy,
  Download,
  Clock,
  MessageSquare,
  Video,
  ShieldCheck,
  Award,
  Settings,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Save,
  Check,
  Zap
} from 'lucide-react';
import {
  OFFICIAL_ATTENDANCE_RULES,
  OFFICIAL_WHATSAPP_ATTENDANCE_TEMPLATE,
  getAttendanceRuleConfig,
  saveAttendanceRuleConfig,
  generateAttendanceRulesPDF,
  AttendanceRuleConfig
} from '../utils/attendanceRules';
import { MinistryGroup } from '../types';

interface AttendanceRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup?: MinistryGroup;
  onOpenNameMatchingRules?: () => void;
}

export const AttendanceRulesModal: React.FC<AttendanceRulesModalProps> = ({
  isOpen,
  onClose,
  activeGroup = 'Esther Group',
  onOpenNameMatchingRules
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'template' | 'config'>('rules');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('punctuality');
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copiedRulesText, setCopiedRulesText] = useState(false);
  const [config, setConfig] = useState<AttendanceRuleConfig>(() => getAttendanceRuleConfig());
  const [savedConfigNotice, setSavedConfigNotice] = useState(false);

  if (!isOpen) return null;

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(OFFICIAL_WHATSAPP_ATTENDANCE_TEMPLATE);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  const handleCopyAllRules = () => {
    let fullText = 'LIGHT UP PRAYER HOUSE MINISTRY - ATTENDANCE MARKING RULES\n\n';
    OFFICIAL_ATTENDANCE_RULES.forEach((sec, idx) => {
      fullText += `${idx + 1}. ${sec.title.toUpperCase()}\n${sec.description}\n\n`;
      sec.items.forEach(item => {
        fullText += `• ${item.heading}: ${item.detail}\n`;
        if (item.example) fullText += `  Format: ${item.example}\n`;
      });
      fullText += '\n';
    });
    navigator.clipboard.writeText(fullText);
    setCopiedRulesText(true);
    setTimeout(() => setCopiedRulesText(false), 2500);
  };

  const handleSaveConfig = () => {
    saveAttendanceRuleConfig(config);
    setSavedConfigNotice(true);
    setTimeout(() => setSavedConfigNotice(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-purple-950 border-2 border-amber-500/50 shadow-2xl text-white overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-purple-900 via-purple-950 to-indigo-950 border-b border-purple-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black font-cinzel text-amber-300 tracking-wide flex items-center gap-2">
                <span>Official Attendance Marking Rules &amp; Guidelines</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  Approved Standard
                </span>
              </h3>
              <p className="text-xs text-purple-200/90 mt-0.5">
                Standardized time classifications, WhatsApp templates, Zoom logs, and airtime eligibility protocols
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-purple-900/60 hover:bg-rose-900/80 text-purple-200 hover:text-white transition-all cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 bg-purple-950/60 border-b border-purple-800/80 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-amber-500 text-purple-950 shadow-md'
                  : 'text-purple-300 hover:text-white hover:bg-purple-900/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Marking Rules &amp; Protocols</span>
            </button>

            <button
              onClick={() => setActiveTab('template')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'template'
                  ? 'bg-amber-500 text-purple-950 shadow-md'
                  : 'text-purple-300 hover:text-white hover:bg-purple-900/50'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Prayer Template</span>
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'config'
                  ? 'bg-amber-500 text-purple-950 shadow-md'
                  : 'text-purple-300 hover:text-white hover:bg-purple-900/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Timing &amp; Cutoff Settings</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={generateAttendanceRulesPDF}
              className="px-3 py-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-purple-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              title="Download official PDF copy of attendance rules"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download PDF Policy</span>
            </button>

            <button
              onClick={handleCopyAllRules}
              className="px-3 py-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              title="Copy entire rulebook as plain text"
            >
              {copiedRulesText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedRulesText ? 'Copied All!' : 'Copy Rulebook'}</span>
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Important Distinction Banner: Name Matching vs Time Policies */}
          {onOpenNameMatchingRules && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/90 via-indigo-950 to-purple-900 border border-amber-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Zap className="w-4 h-4 fill-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-200">
                    Looking for Name Matching Rules (WhatsApp / Zoom / Phone parsing)?
                  </h4>
                  <p className="text-[11px] text-purple-300">
                    Inspect the 8-tier name matching hierarchy, test names live in the simulator, or tune confidence thresholds.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNameMatchingRules();
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-purple-950 font-black text-xs shrink-0 flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
              >
                <span>🔍 Open Name Matching Rules &rarr;</span>
              </button>
            </div>
          )}

          {/* TAB 1: RULES & PROTOCOLS */}
          {activeTab === 'rules' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* Left Column: Section Selector */}
              <div className="md:col-span-4 space-y-2">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 px-1">
                  Rule Categories
                </div>
                {OFFICIAL_ATTENDANCE_RULES.map(sec => {
                  const isSelected = selectedSectionId === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedSectionId(sec.id)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-purple-900/90 border-amber-400 text-white shadow-lg ring-1 ring-amber-500/50'
                          : 'bg-purple-950/70 border-purple-800/80 text-purple-200 hover:bg-purple-900/40 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">{sec.badge}</span>
                        {isSelected && <ArrowRight className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="text-[11px] font-medium text-purple-300 leading-tight">
                        {sec.category}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Active Section Details */}
              <div className="md:col-span-8">
                {(() => {
                  const currentSection = OFFICIAL_ATTENDANCE_RULES.find(s => s.id === selectedSectionId) || OFFICIAL_ATTENDANCE_RULES[0];
                  return (
                    <div className="p-5 rounded-2xl bg-purple-900/40 border border-purple-800 space-y-5 animate-fadeIn">
                      <div>
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase">
                          {currentSection.badge}
                        </span>
                        <h4 className="text-base font-black font-cinzel text-amber-300 mt-2">
                          {currentSection.title}
                        </h4>
                        <p className="text-xs text-purple-200 mt-1 leading-relaxed">
                          {currentSection.description}
                        </p>
                      </div>

                      <div className="space-y-3.5 pt-2 border-t border-purple-800/80">
                        {currentSection.items.map((item, idx) => (
                          <div key={idx} className="p-3.5 rounded-xl bg-purple-950/80 border border-purple-800/80 space-y-2">
                            <div className="text-xs font-extrabold text-white flex items-center gap-2">
                              <span>{item.heading}</span>
                            </div>
                            <p className="text-xs text-purple-200/90 leading-relaxed">
                              {item.detail}
                            </p>
                            {item.example && (
                              <div className="p-2.5 rounded-lg bg-black/40 border border-purple-800 text-[11px] font-mono text-amber-300/90 whitespace-pre-wrap">
                                <span className="text-purple-400 text-[10px] block mb-0.5">Example / Format:</span>
                                {item.example}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          )}

          {/* TAB 2: WHATSAPP PRAYER TEMPLATE */}
          {activeTab === 'template' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 to-teal-950 border border-emerald-500/50 flex items-center justify-between gap-3 text-emerald-200">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    Copy this official register template and post it into your WhatsApp prayer fellowship chat each morning!
                  </span>
                </div>
                <button
                  onClick={handleCopyTemplate}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-purple-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 transition-all"
                >
                  {copiedTemplate ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedTemplate ? 'Copied to Clipboard!' : 'Copy Template'}</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-black/60 border border-purple-800 font-mono text-xs text-emerald-200 whitespace-pre-wrap leading-relaxed relative">
                <div className="absolute top-3 right-3 text-[10px] uppercase font-bold text-purple-400 font-sans">
                  WhatsApp Fellowship Register
                </div>
                {OFFICIAL_WHATSAPP_ATTENDANCE_TEMPLATE}
              </div>

              <div className="p-4 rounded-2xl bg-purple-900/40 border border-purple-800 space-y-2 text-xs text-purple-200">
                <h5 className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Pro-Tips for Fellowship Leaders:</span>
                </h5>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-purple-300 leading-relaxed">
                  <li>Encourage members to type their <strong>full name and phone number</strong> on their line.</li>
                  <li>When you paste the completed list into Light Up Prayer House Build, the auto-processor marks everyone <strong>Present</strong> within 1 second.</li>
                  <li>Members who join without phone numbers will be matched automatically by their name and aliases.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: TIMING & CUTOFF SETTINGS */}
          {activeTab === 'config' && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="p-4 rounded-2xl bg-purple-900/40 border border-purple-800 space-y-1">
                <h4 className="text-sm font-black font-cinzel text-amber-300 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span>Configure Fellowship Session Rules &amp; Time Thresholds</span>
                </h4>
                <p className="text-xs text-purple-200/90 leading-relaxed">
                  Customize the official devotional start time, late check-in cutoff, and airtime qualification requirements.
                </p>
              </div>

              {savedConfigNotice && (
                <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Attendance rules and timing thresholds updated successfully!</span>
                </div>
              )}

              <div className="p-5 rounded-2xl bg-purple-950/80 border border-purple-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-amber-300 mb-1">
                      Devotional Prayer Start Time
                    </label>
                    <input
                      type="time"
                      value={config.serviceStartTime}
                      onChange={(e) => setConfig({ ...config, serviceStartTime: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-900/60 border border-purple-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-[10px] text-purple-400 mt-1 block">Default: 05:00 AM</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-amber-300 mb-1">
                      On-Time Attendance Cutoff
                    </label>
                    <input
                      type="time"
                      value={config.onTimeCutoffTime}
                      onChange={(e) => setConfig({ ...config, onTimeCutoffTime: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-900/60 border border-purple-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-[10px] text-purple-400 mt-1 block">Check-ins before this are marked "Present (On-Time)" (Default: 05:15 AM)</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-amber-300 mb-1">
                      Session Benediction / Conclusion
                    </label>
                    <input
                      type="time"
                      value={config.lateCutoffTime}
                      onChange={(e) => setConfig({ ...config, lateCutoffTime: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-900/60 border border-purple-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-[10px] text-purple-400 mt-1 block">Check-ins after this are considered Absent (Default: 06:00 AM)</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-amber-300 mb-1">
                      Airtime Eligibility Attendance Rate (%)
                    </label>
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={config.airtimeEligibilityPercentage}
                      onChange={(e) => setConfig({ ...config, airtimeEligibilityPercentage: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-900/60 border border-purple-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-[10px] text-purple-400 mt-1 block">Percentage of monthly sessions required to qualify for airtime (Default: 75%)</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-purple-800/80 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoAliasLearning}
                      onChange={(e) => setConfig({ ...config, autoAliasLearning: e.target.checked })}
                      className="w-4 h-4 text-amber-500 rounded border-purple-700 bg-purple-900 focus:ring-amber-400"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white block">Auto-Learn Remapped Aliases</span>
                      <span className="text-purple-300 text-[11px]">Automatically saves custom Zoom or WhatsApp screen names when remapped so they match automatically next time.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.strictDuplicateCheck}
                      onChange={(e) => setConfig({ ...config, strictDuplicateCheck: e.target.checked })}
                      className="w-4 h-4 text-amber-500 rounded border-purple-700 bg-purple-900 focus:ring-amber-400"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white block">Enforce Single Register Per Date Rule</span>
                      <span className="text-purple-300 text-[11px]">Warns and blocks duplicate registers for the same fellowship service date to prevent inflated figures.</span>
                    </div>
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveConfig}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-purple-950 font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Rules Configuration</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-purple-900/60 border-t border-purple-800 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="text-[11px] text-purple-300 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Need to train a new leader? Share the official PDF copy or copy the rulebook directly.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-purple-200 text-xs font-bold cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
