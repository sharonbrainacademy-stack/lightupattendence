import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, UserCheck, UserX, Clock, CheckCircle2, Search, Filter, Sparkles, MessageSquare, History, Plus, Save, Trash2, ArrowRight, ShieldCheck, Download, Upload, FileText, X, AlertCircle, HelpCircle, Check, Zap, ArrowRightLeft } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Beneficiary, AttendanceSession, AttendanceRecordItem, AttendanceStatus, UserRole, MinistryGroup } from '../types';

interface AttendanceTrackerProps {
  beneficiaries: Beneficiary[];
  attendanceSessions: AttendanceSession[];
  currentRole: UserRole;
  currentUserName: string;
  activeGroup?: MinistryGroup;
  onOpenGroupSwitchModal?: () => void;
  onSaveSession: (session: AttendanceSession) => void;
  onDeleteSession: (id: string) => void;
  onUpdateBeneficiary?: (b: Beneficiary) => void;
  onNavigateToBulkMsg: (targetCategory: string, preSelectedPhones?: string[], preSelectedNames?: string[]) => void;
}

export const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({
  beneficiaries,
  attendanceSessions,
  currentRole,
  currentUserName,
  activeGroup = 'Esther Group',
  onOpenGroupSwitchModal,
  onSaveSession,
  onDeleteSession,
  onUpdateBeneficiary,
  onNavigateToBulkMsg,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // View mode state: 'marking' | 'history'
  const [activeSubView, setActiveSubView] = useState<'marking' | 'history'>('marking');

  // Active session under editing
  const [selectedSessionId, setSelectedSessionId] = useState<string | 'NEW'>('NEW');
  const [serviceDate, setServiceDate] = useState<string>(todayStr);
  const [serviceName, setServiceName] = useState<string>('Daily Morning Devotional Prayers');
  const [serviceType, setServiceType] = useState<AttendanceSession['serviceType']>('Daily Morning Devotional');
  const [notes, setNotes] = useState<string>('');
  
  // Search & Filter within active marking sheet
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(
    activeGroup === 'Peace Group' ? 'Peace Group' : 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Automatically sync category filter when activeGroup changes
  useEffect(() => {
    if (activeGroup === 'Peace Group') {
      setCategoryFilter('Peace Group');
    } else {
      setCategoryFilter('ALL');
    }
  }, [activeGroup]);

  // Attendance Records State map: beneficiaryId -> AttendanceRecordItem
  const [recordsMap, setRecordsMap] = useState<Record<string, AttendanceRecordItem>>(() => {
    try {
      const savedDraft = localStorage.getItem(`lightup_attendance_draft_${activeGroup}`);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && parsed.recordsMap && Object.keys(parsed.recordsMap).length > 0) {
          return parsed.recordsMap;
        }
      }
    } catch (e) {
      console.warn('Draft load ignored');
    }

    const initialMap: Record<string, AttendanceRecordItem> = {};
    beneficiaries.forEach(b => {
      initialMap[b.id] = {
        beneficiaryId: b.id,
        fullName: b.fullName,
        phoneNumber: b.phoneNumber,
        category: b.category,
        status: 'Absent',
        checkInTime: '05:00'
      };
    });
    return initialMap;
  });

  // Auto-save working attendance draft to LocalStorage
  useEffect(() => {
    if (Object.keys(recordsMap).length > 0) {
      try {
        const draft = {
          selectedSessionId,
          serviceDate,
          serviceName,
          serviceType,
          notes,
          recordsMap,
          activeGroup,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(`lightup_attendance_draft_${activeGroup}`, JSON.stringify(draft));
      } catch (err) {
        // ignore
      }
    }
  }, [recordsMap, serviceDate, serviceName, serviceType, notes, selectedSessionId, activeGroup]);

  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Custom Session Delete Confirmation Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    sessionId: string | null;
    title: string;
  }>({
    isOpen: false,
    sessionId: null,
    title: ''
  });

  // Auto-Mark Attendance Modal via Text Paste / File Upload
  const [isAutoMarkModalOpen, setIsAutoMarkModalOpen] = useState(false);
  const [autoMarkPasteMode, setAutoMarkPasteMode] = useState<'combined' | 'dual'>('dual');
  const [rawPastedText, setRawPastedText] = useState('');
  const [whatsappText, setWhatsappText] = useState('');
  const [zoomText, setZoomText] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [autoMarkAbsentSearch, setAutoMarkAbsentSearch] = useState('');
  const [autoMatchResult, setAutoMatchResult] = useState<{
    presentMembers: Beneficiary[];
    absentMembers: Beneficiary[];
    discardedEntries: string[];
  } | null>(null);

  // Precision Auto-Match Processor with Fuzzy Levenshtein & Token Similarity
  const cleanLineName = (str: string): string => {
    if (!str) return '';
    return str
      .toLowerCase()
      // Strip line numbering e.g. "1.", "12)", "3 -"
      .replace(/^\d+[\.\)\-]\s*/, '')
      // Strip trailing/leading badges & titles
      .replace(/\b(esg|esther group|esther group benin|agl|gl|lph|benin|branch)\b/gi, ' ')
      .replace(/\b(sister|sis|brother|bro|mrs|mr|deaconess|deacon|pastor|evangelist|evang)\b/gi, ' ')
      .replace(/\b(present|here|attended|zoom|online|checked in|time|am|pm)\b/gi, ' ')
      .replace(/[^a-z0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getSimilarity = (s1: string, s2: string): number => {
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;
    const l1 = s1.length;
    const l2 = s2.length;
    if (s1.includes(s2) || s2.includes(s1)) {
      const minLen = Math.min(l1, l2);
      const maxLen = Math.max(l1, l2);
      if (minLen >= 3) return minLen / maxLen;
    }
    const matrix: number[][] = Array(l2 + 1).fill(null).map(() => Array(l1 + 1).fill(0));
    for (let i = 0; i <= l1; i++) matrix[0][i] = i;
    for (let j = 0; j <= l2; j++) matrix[j][0] = j;

    for (let j = 1; j <= l2; j++) {
      for (let i = 1; i <= l1; i++) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    const distance = matrix[l2][l1];
    const maxLen = Math.max(l1, l2);
    return maxLen === 0 ? 1 : (maxLen - distance) / maxLen;
  };

  const handleProcessUploadText = (textToProcess: string) => {
    if (!textToProcess.trim()) {
      setAutoMatchResult(null);
      return;
    }

    // Smart Multi-line & Multi-numbered list splitting
    const rawLines: string[] = [];
    const textLines = textToProcess.split(/[\r\n]+/);

    textLines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Handle multi-numbered lines e.g. "1. Sis Mary 2. Bro John 3. Grace 08012345678"
      const subItems = trimmed.split(/(?=\b\d{1,2}[\.\)\-]\s+[A-Za-z])/);
      if (subItems.length > 1) {
        subItems.forEach(item => {
          const itemTrimmed = item.trim();
          if (itemTrimmed) rawLines.push(itemTrimmed);
        });
      } else {
        // Also split by semicolons or commas if no phone digits are attached
        if (trimmed.includes(';') || (trimmed.includes(',') && !/\d{6,}/.test(trimmed))) {
          const splitList = trimmed.split(/;|,/);
          splitList.forEach(item => {
            const itemTrimmed = item.trim();
            if (itemTrimmed) rawLines.push(itemTrimmed);
          });
        } else {
          rawLines.push(trimmed);
        }
      }
    });

    const matchedMemberIds = new Set<string>();
    const discardedEntries: string[] = [];

    const normalizePhone = (ph: string) => {
      const digits = ph.replace(/[^0-9]/g, '');
      if (digits.startsWith('234') && digits.length >= 12) {
        return '0' + digits.slice(3);
      }
      return digits;
    };

    const cleanLineName = (str: string) => {
      if (!str) return '';
      return str
        .toLowerCase()
        // Strip line numbering e.g. "1.", "12)", "3 -"
        .replace(/^\d+[\.\)\-]\s*/, '')
        // Strip trailing/leading badges & titles
        .replace(/\b(esg|esther group|esther group benin|agl|gl|lph|benin|branch)\b/gi, ' ')
        .replace(/\b(sister|sis|brother|bro|mrs|mr|deaconess|deacon|pastor|evangelist|evang)\b/gi, ' ')
        .replace(/\b(present|here|attended|zoom|online|checked in|time|am|pm)\b/gi, ' ')
        .replace(/[^a-z0-9\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const cleanBeneficiaries = (beneficiaries || []).map(b => {
      const bFullName = b?.fullName || '';
      const bPhone = b?.phoneNumber || '';

      // Extract bracket components (inside vs outside)
      const insideTexts: string[] = [];
      const bracketMatches = Array.from(bFullName.matchAll(/\(([^)]+)\)/g));
      bracketMatches.forEach(m => {
        if (m[1] && m[1].trim()) insideTexts.push(m[1].trim());
      });
      const outsideText = bFullName.replace(/\([^)]*\)/g, ' ').trim();

      type NameVariant = {
        type: 'outside' | 'inside' | 'full';
        cleanName: string;
        tokens: string[];
      };

      const variants: NameVariant[] = [];

      // 1. Outside bracket variant (e.g. "Mrs J Imasuem" -> "j imasuem")
      if (outsideText) {
        const cName = cleanLineName(outsideText);
        const tokens = cName.split(' ').filter(t => t.length >= 1);
        if (cName) variants.push({ type: 'outside', cleanName: cName, tokens });
      }

      // 2. Inside bracket variant(s) (e.g. "Mrs Juliet Imasuen" -> "juliet imasuen")
      insideTexts.forEach(inText => {
        const cName = cleanLineName(inText);
        const tokens = cName.split(' ').filter(t => t.length >= 1);
        if (cName) variants.push({ type: 'inside', cleanName: cName, tokens });
      });

      // 3. Complete full name variant
      const fullCleanName = cleanLineName(bFullName);
      const fullTokens = fullCleanName.split(' ').filter(t => t.length >= 1);
      if (fullCleanName && !variants.some(v => v.cleanName === fullCleanName)) {
        variants.push({ type: 'full', cleanName: fullCleanName, tokens: fullTokens });
      }

      // 4. Zoom Screen Name variant
      if (b?.zoomName) {
        const cName = cleanLineName(b.zoomName);
        const tokens = cName.split(' ').filter(t => t.length >= 1);
        if (cName && !variants.some(v => v.cleanName === cName)) {
          variants.push({ type: 'full', cleanName: cName, tokens });
        }
      }

      // 5. WhatsApp Display Name variant
      if (b?.whatsappName) {
        const cName = cleanLineName(b.whatsappName);
        const tokens = cName.split(' ').filter(t => t.length >= 1);
        if (cName && !variants.some(v => v.cleanName === cName)) {
          variants.push({ type: 'full', cleanName: cName, tokens });
        }
      }

      // 6. Extra Aliases list
      if (Array.isArray(b?.aliases)) {
        b.aliases.forEach(aliasStr => {
          if (!aliasStr) return;
          const cName = cleanLineName(aliasStr);
          const tokens = cName.split(' ').filter(t => t.length >= 1);
          if (cName && !variants.some(v => v.cleanName === cName)) {
            variants.push({ type: 'full', cleanName: cName, tokens });
          }
        });
      }

      const cleanPhone = normalizePhone(bPhone);
      const shortPhone = cleanPhone.length >= 7 ? cleanPhone.slice(-7) : cleanPhone;
      const rawDigits = bPhone.replace(/[^0-9]/g, '');
      const noZeroPhone = cleanPhone.replace(/^0+/, '');

      return {
        beneficiary: b,
        cleanName: fullCleanName,
        nameTokens: fullTokens,
        variants,
        cleanPhone,
        shortPhone,
        rawDigits,
        noZeroPhone
      };
    });

    rawLines.forEach(line => {
      // Ignore long non-attendee headers
      if (/ATTENDANCE|MEETING|DAILY PRAYER/i.test(line) && line.length > 35 && !/\d{10}/.test(line)) {
        return;
      }

      const lineCleanName = cleanLineName(line);
      const cleanLineDigits = normalizePhone(line);
      const lineAllDigits = line.replace(/[^0-9]/g, '');
      const linePhoneMatches = line.match(/\d{7,15}/g) || [];
      const lineTokens = lineCleanName.split(' ').filter(t => t.length >= 1);

      let bestScore = 0;
      let bestBId: string | null = null;

      cleanBeneficiaries.forEach(bObj => {
        let score = 0;

        // 1. Phone number match (100 points) - supports exact phone, short phone, raw digits, or extracted phone sequences
        const isPhoneMatch = (
          (bObj.shortPhone && bObj.shortPhone.length >= 7 && (cleanLineDigits.includes(bObj.shortPhone) || lineAllDigits.includes(bObj.shortPhone))) ||
          (bObj.cleanPhone && bObj.cleanPhone.length >= 8 && (cleanLineDigits.includes(bObj.cleanPhone) || lineAllDigits.includes(bObj.cleanPhone))) ||
          (bObj.noZeroPhone && bObj.noZeroPhone.length >= 8 && lineAllDigits.includes(bObj.noZeroPhone)) ||
          linePhoneMatches.some(pSeq => 
            (bObj.shortPhone && pSeq.includes(bObj.shortPhone)) ||
            (bObj.cleanPhone && (pSeq.includes(bObj.cleanPhone) || bObj.cleanPhone.includes(pSeq)))
          )
        );

        if (isPhoneMatch) {
          score = 100;
        } else if (lineCleanName.length >= 1) {
          const lineAlphaOnly = lineCleanName.replace(/[^a-z]/g, '');

          // Check all name variants (inside bracket, outside bracket, full name, zoom, whatsapp, aliases)
          bObj.variants.forEach(variant => {
            let variantScore = 0;
            const variantAlphaOnly = variant.cleanName.replace(/[^a-z]/g, '');

            // A. Exact string match with variant (98 points)
            if (lineCleanName === variant.cleanName) {
              variantScore = 98;
            }
            // B. Exact alpha-only match ignoring spaces, digits, and punctuation (98 points)
            // e.g. "Az Victoria" vs "azvictoria09", "Aghedo Vera" vs "AghedoVera", "George Umoh" vs "georgeumoh129"
            else if (lineAlphaOnly.length >= 3 && variantAlphaOnly.length >= 3 && lineAlphaOnly === variantAlphaOnly) {
              variantScore = 98;
            }
            // C. Alpha Substring / Prefix match for truncated screen names (92 points)
            // Require multi-token line and variant so single surname/first-name (e.g. "aghedo") NEVER matches multi-word members (e.g. "Aghedo Osaro")
            else if (
              lineTokens.length >= 2 && variant.tokens.length >= 2 &&
              lineAlphaOnly.length >= 6 && variantAlphaOnly.length >= 6 &&
              (lineAlphaOnly.startsWith(variantAlphaOnly) || variantAlphaOnly.startsWith(lineAlphaOnly))
            ) {
              variantScore = 92;
            }
            else {
              // Enforce strict single-name vs multi-name boundary:
              // Single-token input must NOT match multi-token variant (e.g. "Aghedo" -> "John Aghedo")
              // Multi-token input must NOT match single-token variant (e.g. "John Aghedo" -> "Aghedo")
              const isSingleInput = lineTokens.length === 1;
              const isSingleVariant = variant.tokens.length === 1;

              if (isSingleInput !== isSingleVariant) {
                // If single-word input (e.g. "Aghedo" or "Juliet"), check if this word is UNIQUE to a single member in directory
                if (isSingleInput && lineTokens[0].length >= 3) {
                  const sToken = lineTokens[0];
                  const sTokenAlpha = sToken.replace(/[^a-z]/g, '');

                  // Find all beneficiaries who have this name token in any of their variants
                  const uniqueMatches = cleanBeneficiaries.filter(b => 
                    b.variants.some(v => v.tokens.some(vt => {
                      const vtAlpha = vt.replace(/[^a-z]/g, '');
                      return vt === sToken || (vtAlpha.length >= 3 && vtAlpha === sTokenAlpha) || getSimilarity(vt, sToken) >= 0.88;
                    }))
                  );

                  if (uniqueMatches.length === 1 && uniqueMatches[0].beneficiary.id === bObj.beneficiary.id) {
                    // Unique single-name match! Score 88 -> Auto-marked Present
                    variantScore = 88;
                  } else {
                    // Multiple members or zero members match this name -> Ambiguous, score 0 so it goes to Discarded Entries for manual review
                    variantScore = 0;
                  }
                } else {
                  variantScore = 0;
                }
              } else {
                if (isSingleInput && isSingleVariant) {
                  // Single-name to Single-name matching
                  const singleInput = lineTokens[0];
                  const singleVariant = variant.tokens[0];
                  const singleInputAlpha = singleInput.replace(/[^a-z]/g, '');
                  const singleVarAlpha = singleVariant.replace(/[^a-z]/g, '');

                  if (singleInput === singleVariant || (singleInputAlpha.length >= 3 && singleInputAlpha === singleVarAlpha)) {
                    variantScore = 98; // Exact single-name match
                  } else if (getSimilarity(singleInput, singleVariant) >= 0.82) {
                    variantScore = 85; // High similarity single-name match
                  }
                } else {
                  // Multi-word to Multi-word matching
                  let matchedTokenCount = 0;

                  variant.tokens.forEach(vt => {
                    const vtAlpha = vt.replace(/[^a-z]/g, '');
                    const hasExactMatch = lineTokens.some(lt => {
                      const ltAlpha = lt.replace(/[^a-z]/g, '');
                      return vt === lt || (vtAlpha.length >= 3 && vtAlpha === ltAlpha);
                    });
                    const hasFuzzyMatch = lineTokens.some(lt => vt === lt || getSimilarity(vt, lt) >= 0.80);
                    if (hasExactMatch || hasFuzzyMatch) {
                      matchedTokenCount++;
                    }
                  });

                  if (matchedTokenCount === variant.tokens.length) {
                    // All words of member's name matched in line
                    variantScore = 96;
                  } else if (matchedTokenCount >= 2 && variant.tokens.length >= 2) {
                    // Multi-word partial match (at least 2 words matched)
                    variantScore = 88;
                  } else if (matchedTokenCount >= 1 && variant.tokens.length === 2 && lineTokens.length >= 2) {
                    const fullSim = getSimilarity(lineCleanName, variant.cleanName);
                    if (fullSim >= 0.70) {
                      variantScore = 80;
                    }
                  } else {
                    variantScore = 0;
                  }
                }

                // C. Fuzzy string similarity with variant
                const fullSim = getSimilarity(lineCleanName, variant.cleanName);
                if (fullSim >= 0.78) {
                  const simScore = Math.round(fullSim * 100);
                  if (simScore > variantScore) {
                    variantScore = simScore;
                  }
                }
              }
            }

            if (variantScore > score) {
              score = variantScore;
            }
          });
        }

        if (score > bestScore) {
          bestScore = score;
          bestBId = bObj.beneficiary.id;
        }
      });

      // Require confidence score >= 65 to mark as present
      if (bestBId && bestScore >= 65) {
        matchedMemberIds.add(bestBId);
      } else {
        const displayLine = line.replace(/^\d+[\.\)\-]\s*/, '').trim();
        if (displayLine.length > 1 && !/^\d+$/.test(displayLine)) {
          discardedEntries.push(displayLine);
        }
      }
    });

    const presentMembers = beneficiaries.filter(b => matchedMemberIds.has(b.id));
    const absentMembers = beneficiaries.filter(b => !matchedMemberIds.has(b.id));

    setAutoMatchResult({
      presentMembers,
      absentMembers,
      discardedEntries
    });
  };

  // Force-match a discarded line to a specific beneficiary manually inside the Auto-Mark Modal & save as alias!
  const handleForceMatchDiscardedLine = (entryIndex: number, targetBeneficiaryId: string) => {
    if (!autoMatchResult || !targetBeneficiaryId) return;

    const targetB = beneficiaries.find(b => b.id === targetBeneficiaryId);
    if (!targetB) return;

    const discardedLineStr = autoMatchResult.discardedEntries[entryIndex];

    // Automatically save this Zoom/WhatsApp name as an alias for future auto-matching
    if (discardedLineStr && onUpdateBeneficiary) {
      const cleanAlias = discardedLineStr.replace(/^\d+[\.\)\-]\s*/, '').trim();
      const existingAliases = targetB.aliases || [];
      if (cleanAlias && !existingAliases.includes(cleanAlias) && cleanAlias.toLowerCase() !== targetB.fullName.toLowerCase()) {
        const updatedB: Beneficiary = {
          ...targetB,
          zoomName: targetB.zoomName || cleanAlias,
          aliases: [...existingAliases, cleanAlias]
        };
        onUpdateBeneficiary(updatedB);
      }
    }

    const newPresent = [...autoMatchResult.presentMembers];
    if (!newPresent.some(m => m.id === targetB.id)) {
      newPresent.push(targetB);
    }

    const newAbsent = autoMatchResult.absentMembers.filter(m => m.id !== targetB.id);
    const newDiscarded = autoMatchResult.discardedEntries.filter((_, idx) => idx !== entryIndex);

    setAutoMatchResult({
      presentMembers: newPresent,
      absentMembers: newAbsent,
      discardedEntries: newDiscarded
    });
  };

  // Toggle member status between Present and Absent directly inside the Auto-Mark Modal
  const handleToggleAutoMatchMemberStatus = (memberId: string) => {
    if (!autoMatchResult) return;

    const targetB = beneficiaries.find(b => b.id === memberId);
    if (!targetB) return;

    const isPresent = autoMatchResult.presentMembers.some(m => m.id === memberId);

    if (isPresent) {
      // Move to absent
      const newPresent = autoMatchResult.presentMembers.filter(m => m.id !== memberId);
      const newAbsent = [...autoMatchResult.absentMembers, targetB];
      setAutoMatchResult({
        ...autoMatchResult,
        presentMembers: newPresent,
        absentMembers: newAbsent
      });
    } else {
      // Move to present
      const newAbsent = autoMatchResult.absentMembers.filter(m => m.id !== memberId);
      const newPresent = [...autoMatchResult.presentMembers, targetB];
      setAutoMatchResult({
        ...autoMatchResult,
        presentMembers: newPresent,
        absentMembers: newAbsent
      });
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string || '';
      setRawPastedText(content);
      handleProcessUploadText(content);
    };
    reader.readAsText(file);
  };

  // Apply Auto-Match results directly to current attendance roll call map & auto-save to archive
  const handleApplyAutoMatchToRollCall = () => {
    if (!autoMatchResult) return;

    const newMap: Record<string, AttendanceRecordItem> = {};
    const presentSet = new Set(autoMatchResult.presentMembers.map(m => m.id));

    beneficiaries.forEach(b => {
      if (presentSet.has(b.id)) {
        newMap[b.id] = {
          beneficiaryId: b.id,
          fullName: b.fullName,
          phoneNumber: b.phoneNumber,
          category: b.category,
          status: 'Present'
        };
      } else {
        newMap[b.id] = {
          beneficiaryId: b.id,
          fullName: b.fullName,
          phoneNumber: b.phoneNumber,
          category: b.category,
          status: 'Absent'
        };
      }
    });

    setRecordsMap(newMap);

    // Auto-save uploaded session directly to ministry database
    const activeSessionId = selectedSessionId === 'NEW' ? `att-${Date.now()}` : selectedSessionId;
    const sessionObj: AttendanceSession = {
      id: activeSessionId,
      serviceName,
      serviceType,
      serviceDate,
      recordedBy: currentUserName,
      notes: notes || `Auto-marked attendance list uploaded on ${todayStr}`,
      records: Object.values(newMap),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveSession(sessionObj);
    setSelectedSessionId(activeSessionId);

    setIsAutoMarkModalOpen(false);
    setSaveNotification(`⚡ Auto-Mark Upload Applied & Saved to Archive! Marked ${autoMatchResult.presentMembers.length} Present & ${autoMatchResult.absentMembers.length} Absent.`);
    setTimeout(() => setSaveNotification(null), 5000);
  };

  // Helper to merge live active roll call with historic sessions for real-time accurate CSV exports
  const getEffectiveAttendanceSessions = (): AttendanceSession[] => {
    const activeRecords = Object.values(recordsMap);
    const activeSessionId = selectedSessionId === 'NEW' ? `att-${serviceDate}` : selectedSessionId;

    const activeSessionObj: AttendanceSession = {
      id: activeSessionId,
      serviceName,
      serviceType,
      serviceDate,
      recordedBy: currentUserName,
      notes,
      records: activeRecords,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const historicSessions = attendanceSessions.filter(s =>
      s.id !== selectedSessionId &&
      !(s.serviceDate === serviceDate && s.serviceType === serviceType)
    );

    return [activeSessionObj, ...historicSessions];
  };

  // Member Traceability & Date Search State
  const [isTraceabilityModalOpen, setIsTraceabilityModalOpen] = useState(false);
  const [selectedTraceMemberId, setSelectedTraceMemberId] = useState<string | null>(null);
  const [traceSearchTerm, setTraceSearchTerm] = useState('');

  // Date Filter State for Historic Sessions
  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');

  // Export CSV Options Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Helper to trigger browser CSV file download
  const downloadCSVFile = (csvContent: string, fileName: string) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Deduplication helper to ensure all registered members are preserved (Filtered strictly by active group)
  const getDeduplicatedBeneficiaries = (list: Beneficiary[]): Beneficiary[] => {
    const seen = new Set<string>();
    const unique: Beneficiary[] = [];

    (list || []).forEach(b => {
      if (!b || !b.id) return;

      if (activeGroup === 'Peace Group') {
        const isPeace = b.category === 'Peace Group' || Boolean(b.notes && b.notes.toLowerCase().includes('peace'));
        if (!isPeace) return;
      } else {
        const isEsther = b.category === 'Esther Group Benin' || Boolean(b.notes && b.notes.toLowerCase().includes('esther')) || (!b.category.toLowerCase().includes('peace') && !b.notes?.toLowerCase().includes('peace'));
        if (!isEsther) return;
      }

      const key = b.id;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(b);
      }
    });

    return unique.sort((a, b) => (a?.fullName || '').localeCompare(b?.fullName || ''));
  };

  // 1. Export Matrix Grid CSV (1 Row per Unique Member, Meeting Dates in Columns)
  const handleExportMatrixCSV = () => {
    const uniqueMembers = getDeduplicatedBeneficiaries(beneficiaries);
    const effectiveSessions = getEffectiveAttendanceSessions();
    const sortedSessions = [...effectiveSessions].sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
    const groupTitleName = activeGroup === 'Peace Group' ? 'PEACE GROUP' : 'ESTHER GROUP BENIN';
    const fileGroupName = activeGroup === 'Peace Group' ? 'Peace_Group' : 'Esther_Group_Benin';

    const titleBlock = [
      `"","LIGHT UP PRAYER HOUSE — ${groupTitleName} ATTENDANCE REGISTER MATRIX"`,
      `"","MINISTRY GROUP: ${groupTitleName}"`,
      `"","Export Date: ${todayStr} | Total Registered Members: ${uniqueMembers.length} | Total Recorded Meetings: ${sortedSessions.length}"`,
      ''
    ];

    const columnHeaders = [
      'S/N',
      'Member Full Name',
      'Phone Number',
      ...sortedSessions.map(s => `"${s.serviceDate} (${s.serviceType})"`),
      'Total Present',
      'Total Absent',
      'Attendance Rate (%)'
    ];

    const dataRows: string[][] = [];

    uniqueMembers.forEach((member, index) => {
      let presentCount = 0;
      let absentCount = 0;

      const dateStatuses = sortedSessions.map(session => {
        const rec = session.records.find(r => r.beneficiaryId === member.id || r.fullName.toLowerCase().trim() === member.fullName.toLowerCase().trim());
        const status = rec ? rec.status : 'Absent';

        if (status === 'Present' || status === 'Late') {
          presentCount++;
        } else {
          absentCount++;
        }

        return status;
      });

      const totalMeetings = sortedSessions.length;
      const rate = totalMeetings > 0 ? Math.round((presentCount / totalMeetings) * 100) : 0;

      dataRows.push([
        (index + 1).toString(),
        `"${member.fullName.trim().replace(/"/g, '""')}"`,
        `"${member.phoneNumber.trim()}"`,
        ...dateStatuses.map(s => `"${s}"`),
        presentCount.toString(),
        absentCount.toString(),
        `"${rate}%"`
      ]);
    });

    const totalPresentRow = [
      'SUMMARY',
      'TOTAL PRESENT',
      '',
      ...sortedSessions.map(session => {
        const count = session.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
        return count.toString();
      }),
      '',
      '',
      ''
    ];

    const totalAbsentRow = [
      'SUMMARY',
      'TOTAL ABSENT',
      '',
      ...sortedSessions.map(session => {
        const count = session.records.filter(r => r.status === 'Absent').length;
        return count.toString();
      }),
      '',
      '',
      ''
    ];

    const totalRateRow = [
      'SUMMARY',
      'ATTENDANCE RATE (%)',
      '',
      ...sortedSessions.map(session => {
        const presentCount = session.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
        const total = session.records.length || 1;
        const rate = Math.round((presentCount / total) * 100);
        return `"${rate}%"`;
      }),
      '',
      '',
      ''
    ];

    const fullCSVContent = [
      ...titleBlock,
      columnHeaders.join(','),
      ...dataRows.map(row => row.join(',')),
      '',
      totalPresentRow.join(','),
      totalAbsentRow.join(','),
      totalRateRow.join(',')
    ].join('\n');

    downloadCSVFile(fullCSVContent, `LightUp_${fileGroupName}_Attendance_Register_Matrix_${todayStr}.csv`);
    setIsExportModalOpen(false);
  };

  // 2. Export Active Session Roll Call CSV (Present Members Listed First, Absent Members Below)
  const handleExportActiveSessionCSV = () => {
    const allMembers = getDeduplicatedBeneficiaries(beneficiaries);
    const groupTitleName = activeGroup === 'Peace Group' ? 'PEACE GROUP' : 'ESTHER GROUP BENIN';
    const fileGroupName = activeGroup === 'Peace Group' ? 'Peace_Group' : 'Esther_Group_Benin';
    
    const sessionRecords: AttendanceRecordItem[] = allMembers.map(m => {
      const rec = recordsMap[m.id] || {
        beneficiaryId: m.id,
        fullName: m.fullName,
        phoneNumber: m.phoneNumber,
        status: 'Absent'
      };
      return {
        beneficiaryId: m.id,
        fullName: m.fullName ? m.fullName.trim() : 'Member',
        phoneNumber: m.phoneNumber ? m.phoneNumber.trim() : '',
        category: m.category,
        status: rec.status,
        checkInTime: rec.checkInTime
      };
    });

    // Sort: All PRESENT members on top, all ABSENT members below
    sessionRecords.sort((a, b) => {
      const aIsPresent = a.status === 'Present' || a.status === 'Late';
      const bIsPresent = b.status === 'Present' || b.status === 'Late';

      if (aIsPresent && !bIsPresent) return -1;
      if (!aIsPresent && bIsPresent) return 1;

      return a.fullName.localeCompare(b.fullName);
    });

    const pCount = sessionRecords.filter(r => r.status === 'Present').length;
    const lCount = sessionRecords.filter(r => r.status === 'Late').length;
    const aCount = sessionRecords.filter(r => r.status === 'Absent').length;
    const totalPresent = pCount + lCount;
    const rate = sessionRecords.length > 0 ? Math.round((totalPresent / sessionRecords.length) * 100) : 0;

    const titleBlock = [
      `"","LIGHT UP PRAYER HOUSE — ${groupTitleName} SESSION ATTENDANCE REGISTER"`,
      `"","MINISTRY GROUP: ${groupTitleName}"`,
      `"","Service Date: ${serviceDate} | Service Type: ${serviceType} | Program: ${serviceName.replace(/"/g, '""')}"`,
      `"","Recorded By: ${currentUserName} | Total Registered Members: ${sessionRecords.length} | Present: ${totalPresent} | Absent: ${aCount} | Attendance Rate: ${rate}%"`,
      ''
    ];

    const headers = [
      'S/N',
      'Member Full Name',
      'Phone Number',
      'Status'
    ];

    const rows = sessionRecords.map((r, index) => [
      (index + 1).toString(),
      `"${r.fullName.replace(/"/g, '""')}"`,
      `"${r.phoneNumber}"`,
      r.status
    ]);

    const csvContent = [
      ...titleBlock,
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    downloadCSVFile(csvContent, `LightUp_${fileGroupName}_Attendance_${serviceDate}_${serviceType.replace(/\s+/g, '_')}.csv`);
    setIsExportModalOpen(false);
  };

  // 3. Export Master Historical Log (Grouped by Date, Present Members Above, Absent Below)
  const handleExportMasterCSV = () => {
    const effectiveSessions = getEffectiveAttendanceSessions();
    const sortedSessions = [...effectiveSessions].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
    const allMembers = getDeduplicatedBeneficiaries(beneficiaries);
    const groupTitleName = activeGroup === 'Peace Group' ? 'PEACE GROUP' : 'ESTHER GROUP BENIN';
    const fileGroupName = activeGroup === 'Peace Group' ? 'Peace_Group' : 'Esther_Group_Benin';

    if (sortedSessions.length === 0) {
      handleExportActiveSessionCSV();
      return;
    }

    const lines: string[] = [
      `"","LIGHT UP PRAYER HOUSE — ${groupTitleName} MASTER ATTENDANCE HISTORY LOG"`,
      `"","MINISTRY GROUP: ${groupTitleName}"`,
      `"","Exported: ${todayStr} | Total Registered Members: ${allMembers.length} | Total Recorded Sessions: ${sortedSessions.length}"`,
      ''
    ];

    sortedSessions.forEach(session => {
      const sessionRecordsMap = new Map<string, AttendanceRecordItem>();
      session.records.forEach(r => {
        if (r.beneficiaryId) sessionRecordsMap.set(r.beneficiaryId, r);
        sessionRecordsMap.set(r.fullName.toLowerCase().trim(), r);
      });

      const sessionRecords: AttendanceRecordItem[] = allMembers.map(m => {
        const rec = sessionRecordsMap.get(m.id) || sessionRecordsMap.get(m.fullName.toLowerCase().trim());
        return {
          beneficiaryId: m.id,
          fullName: m.fullName ? m.fullName.trim() : 'Member',
          phoneNumber: m.phoneNumber ? m.phoneNumber.trim() : '',
          category: m.category,
          status: rec ? rec.status : 'Absent'
        };
      });

      // Sort Present members above, Absent members below
      sessionRecords.sort((a, b) => {
        const aIsPresent = a.status === 'Present' || a.status === 'Late';
        const bIsPresent = b.status === 'Present' || b.status === 'Late';

        if (aIsPresent && !bIsPresent) return -1;
        if (!aIsPresent && bIsPresent) return 1;

        return a.fullName.localeCompare(b.fullName);
      });

      const pCount = sessionRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
      const rate = sessionRecords.length > 0 ? Math.round((pCount / sessionRecords.length) * 100) : 0;

      lines.push(`"","=== MINISTRY GROUP: ${groupTitleName} | MEETING DATE: ${session.serviceDate} | Service: ${session.serviceType} (${session.serviceName.replace(/,/g, ' ')}) | Recorded By: ${session.recordedBy} | Total Registered: ${sessionRecords.length} | Present: ${pCount}/${sessionRecords.length} (${rate}%) ==="`);
      lines.push('S/N,Member Full Name,Phone Number,Status');

      sessionRecords.forEach((r, idx) => {
        lines.push([
          (idx + 1).toString(),
          `"${r.fullName.replace(/"/g, '""')}"`,
          `"${r.phoneNumber}"`,
          r.status
        ].join(','));
      });

      lines.push('');
    });

    downloadCSVFile(lines.join('\n'), `LightUp_${fileGroupName}_Master_Attendance_History_${todayStr}.csv`);
    setIsExportModalOpen(false);
  };

  // 4. Export Member Traceability Summary CSV (Deduplicated Unique Members)
  const handleExportMemberSummaryCSV = () => {
    const uniqueMembers = getDeduplicatedBeneficiaries(beneficiaries);
    const effectiveSessions = getEffectiveAttendanceSessions();
    const groupTitleName = activeGroup === 'Peace Group' ? 'PEACE GROUP' : 'ESTHER GROUP BENIN';
    const fileGroupName = activeGroup === 'Peace Group' ? 'Peace_Group' : 'Esther_Group_Benin';

    const titleBlock = [
      `"","LIGHT UP PRAYER HOUSE — ${groupTitleName} MEMBER ATTENDANCE TRACEABILITY SUMMARY"`,
      `"","MINISTRY GROUP: ${groupTitleName}"`,
      `"","Exported: ${todayStr} | Total Registered Members: ${uniqueMembers.length} | Total Service Sessions Held: ${effectiveSessions.length}"`,
      ''
    ];

    const headers = [
      'S/N',
      'Member Full Name',
      'Phone Number',
      'Total Meetings Held',
      'Present Count',
      'Absent Count',
      'Attendance Rate (%)',
      'Dates Attended'
    ];

    const rows: string[][] = [];

    uniqueMembers.forEach((member, index) => {
      let presentCount = 0;
      let absentCount = 0;
      const attendedDates: string[] = [];

      effectiveSessions.forEach(session => {
        const rec = session.records.find(r => r.beneficiaryId === member.id || r.fullName.toLowerCase().trim() === member.fullName.toLowerCase().trim());
        if (rec) {
          if (rec.status === 'Present' || rec.status === 'Late') {
            presentCount++;
            attendedDates.push(session.serviceDate);
          } else if (rec.status === 'Absent') {
            absentCount++;
          }
        }
      });

      const totalHeld = effectiveSessions.length;
      const rate = totalHeld > 0 ? Math.round((presentCount / totalHeld) * 100) : 0;

      rows.push([
        (index + 1).toString(),
        `"${member.fullName.trim().replace(/"/g, '""')}"`,
        `"${member.phoneNumber.trim()}"`,
        totalHeld.toString(),
        presentCount.toString(),
        absentCount.toString(),
        `"${rate}%"`,
        `"${attendedDates.join('; ')}"`
      ]);
    });

    const csvContent = [
      ...titleBlock,
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    downloadCSVFile(csvContent, `LightUp_${fileGroupName}_Member_Attendance_Summary_${todayStr}.csv`);
    setIsExportModalOpen(false);
  };

  // 5. Export Active Session PDF Format Report
  const handleExportActiveSessionPDF = () => {
    const allMembers = getDeduplicatedBeneficiaries(beneficiaries);
    const groupTitleName = activeGroup === 'Peace Group' ? 'PEACE GROUP' : 'ESTHER GROUP BENIN';
    const fileGroupName = activeGroup === 'Peace Group' ? 'Peace_Group' : 'Esther_Group_Benin';

    const sessionRecords: AttendanceRecordItem[] = allMembers.map(m => {
      const rec = recordsMap[m.id] || {
        beneficiaryId: m.id,
        fullName: m.fullName,
        phoneNumber: m.phoneNumber,
        status: 'Absent'
      };
      return {
        beneficiaryId: m.id,
        fullName: m.fullName ? m.fullName.trim() : 'Member',
        phoneNumber: m.phoneNumber ? m.phoneNumber.trim() : '',
        category: m.category,
        status: rec.status,
        checkInTime: rec.checkInTime
      };
    });

    sessionRecords.sort((a, b) => {
      const aIsPresent = a.status === 'Present' || a.status === 'Late';
      const bIsPresent = b.status === 'Present' || b.status === 'Late';
      if (aIsPresent && !bIsPresent) return -1;
      if (!aIsPresent && bIsPresent) return 1;
      return a.fullName.localeCompare(b.fullName);
    });

    const pCount = sessionRecords.filter(r => r.status === 'Present').length;
    const lCount = sessionRecords.filter(r => r.status === 'Late').length;
    const aCount = sessionRecords.filter(r => r.status === 'Absent').length;
    const totalPresent = pCount + lCount;
    const rate = sessionRecords.length > 0 ? Math.round((totalPresent / sessionRecords.length) * 100) : 0;

    const pdf = new jsPDF('portrait', 'mm', 'a4');

    // Header Banner
    pdf.setFillColor(88, 28, 135);
    pdf.rect(0, 0, 210, 28, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(255, 255, 255);
    pdf.text('LIGHT UP PRAYER HOUSE — FAMILY OUTREACH', 14, 11);

    pdf.setFontSize(10);
    pdf.setTextColor(253, 224, 71);
    pdf.text(`MINISTRY GROUP: ${groupTitleName} ATTENDANCE REGISTER`, 14, 20);

    // Metadata
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');

    let y = 35;
    pdf.text(`Program Title: ${serviceName}`, 14, y);
    pdf.text(`Service Type: ${serviceType}`, 120, y);
    y += 6;
    pdf.text(`Service Date: ${serviceDate}`, 14, y);
    pdf.text(`Recorded By: ${currentUserName}`, 120, y);
    y += 6;

    // Summary Box
    pdf.setFillColor(243, 232, 255);
    pdf.rect(14, y, 182, 10, 'F');
    pdf.setFontSize(8.5);
    pdf.setTextColor(88, 28, 135);
    pdf.text(`Total Registered: ${sessionRecords.length}   |   Present: ${totalPresent}   |   Absent: ${aCount}   |   Attendance Rate: ${rate}%`, 18, y + 6.5);
    y += 14;

    // Table Header
    pdf.setFillColor(107, 33, 168);
    pdf.rect(14, y, 182, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);

    pdf.text('S/N', 17, y + 5);
    pdf.text('Member Full Name', 32, y + 5);
    pdf.text('Phone Number', 115, y + 5);
    pdf.text('Attendance Status', 160, y + 5);

    y += 9;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(15, 23, 42);

    sessionRecords.forEach((r, idx) => {
      if (y > 275) {
        pdf.addPage();
        y = 15;
        pdf.setFillColor(107, 33, 168);
        pdf.rect(14, y, 182, 7, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text('S/N', 17, y + 5);
        pdf.text('Member Full Name', 32, y + 5);
        pdf.text('Phone Number', 115, y + 5);
        pdf.text('Attendance Status', 160, y + 5);
        y += 9;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(15, 23, 42);
      }

      if (idx % 2 === 1) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(14, y - 4, 182, 6, 'F');
      }

      pdf.text((idx + 1).toString(), 17, y);
      pdf.text(r.fullName.substring(0, 38), 32, y);
      pdf.text(r.phoneNumber || '-', 115, y);

      if (r.status === 'Present' || r.status === 'Late') {
        pdf.setTextColor(5, 150, 105);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`PRESENT`, 160, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(15, 23, 42);
      } else {
        pdf.setTextColor(225, 29, 72);
        pdf.text(`ABSENT`, 160, y);
        pdf.setTextColor(15, 23, 42);
      }

      y += 6;
    });

    pdf.save(`LightUp_${fileGroupName}_Attendance_${serviceDate}.pdf`);
    setIsExportModalOpen(false);
  };

  // 6. Export Member Traceability Summary PDF
  const handleExportMemberSummaryPDF = () => {
    const uniqueMembers = getDeduplicatedBeneficiaries(beneficiaries);
    const effectiveSessions = getEffectiveAttendanceSessions();
    const groupTitleName = activeGroup === 'Peace Group' ? 'PEACE GROUP' : 'ESTHER GROUP BENIN';
    const fileGroupName = activeGroup === 'Peace Group' ? 'Peace_Group' : 'Esther_Group_Benin';

    const pdf = new jsPDF('portrait', 'mm', 'a4');

    // Header Banner
    pdf.setFillColor(88, 28, 135);
    pdf.rect(0, 0, 210, 28, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(255, 255, 255);
    pdf.text('LIGHT UP PRAYER HOUSE — FAMILY OUTREACH', 14, 11);

    pdf.setFontSize(10);
    pdf.setTextColor(253, 224, 71);
    pdf.text(`MINISTRY GROUP: ${groupTitleName} MEMBER ATTENDANCE SUMMARY`, 14, 20);

    let y = 35;
    pdf.setFontSize(9);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Export Date: ${todayStr}`, 14, y);
    pdf.text(`Total Registered Members: ${uniqueMembers.length}`, 80, y);
    pdf.text(`Total Meetings Held: ${effectiveSessions.length}`, 150, y);
    y += 8;

    // Table Header
    pdf.setFillColor(107, 33, 168);
    pdf.rect(14, y, 182, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);

    pdf.text('S/N', 16, y + 5);
    pdf.text('Member Full Name', 28, y + 5);
    pdf.text('Phone Number', 90, y + 5);
    pdf.text('Meetings', 122, y + 5);
    pdf.text('Present', 142, y + 5);
    pdf.text('Absent', 162, y + 5);
    pdf.text('Rate (%)', 180, y + 5);

    y += 9;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(15, 23, 42);

    uniqueMembers.forEach((member, index) => {
      let presentCount = 0;
      let absentCount = 0;

      effectiveSessions.forEach(session => {
        const rec = session.records.find(r => r.beneficiaryId === member.id || r.fullName.toLowerCase().trim() === member.fullName.toLowerCase().trim());
        if (rec) {
          if (rec.status === 'Present' || rec.status === 'Late') presentCount++;
          else if (rec.status === 'Absent') absentCount++;
        }
      });

      const totalHeld = effectiveSessions.length;
      const rate = totalHeld > 0 ? Math.round((presentCount / totalHeld) * 100) : 0;

      if (y > 275) {
        pdf.addPage();
        y = 15;
        pdf.setFillColor(107, 33, 168);
        pdf.rect(14, y, 182, 7, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text('S/N', 16, y + 5);
        pdf.text('Member Full Name', 28, y + 5);
        pdf.text('Phone Number', 90, y + 5);
        pdf.text('Meetings', 122, y + 5);
        pdf.text('Present', 142, y + 5);
        pdf.text('Absent', 162, y + 5);
        pdf.text('Rate (%)', 180, y + 5);
        y += 9;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(15, 23, 42);
      }

      if (index % 2 === 1) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(14, y - 4, 182, 6, 'F');
      }

      pdf.text((index + 1).toString(), 16, y);
      pdf.text(member.fullName.substring(0, 30), 28, y);
      pdf.text(member.phoneNumber || '-', 90, y);
      pdf.text(totalHeld.toString(), 125, y);
      pdf.text(presentCount.toString(), 145, y);
      pdf.text(absentCount.toString(), 165, y);

      pdf.setFont('helvetica', 'bold');
      if (rate >= 75) pdf.setTextColor(5, 150, 105);
      else if (rate >= 50) pdf.setTextColor(217, 119, 6);
      else pdf.setTextColor(225, 29, 72);

      pdf.text(`${rate}%`, 182, y);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(15, 23, 42);

      y += 6;
    });

    pdf.save(`LightUp_${fileGroupName}_Member_Summary_${todayStr}.pdf`);
    setIsExportModalOpen(false);
  };

  // Load a session when selected
  const handleSelectSession = (sessionId: string) => {
    if (sessionId === 'NEW') {
      const existingToday = (attendanceSessions || []).find(s => s.serviceDate === todayStr);
      if (existingToday) {
        setSelectedSessionId(existingToday.id);
        setServiceDate(existingToday.serviceDate);
        setServiceName(existingToday.serviceName);
        setServiceType(existingToday.serviceType);
        setNotes(existingToday.notes || '');

        const mapFromSession: Record<string, AttendanceRecordItem> = {};
        (beneficiaries || []).forEach(b => {
          if (!b || !b.id) return;
          const bName = (b.fullName || '').toLowerCase();
          const existingRecord = (existingToday.records || []).find(r => 
            (r.beneficiaryId && r.beneficiaryId === b.id) || 
            (r.fullName && r.fullName.toLowerCase() === bName)
          );
          if (existingRecord) {
            mapFromSession[b.id] = existingRecord;
          } else {
            mapFromSession[b.id] = {
              beneficiaryId: b.id,
              fullName: b.fullName || 'Member',
              phoneNumber: b.phoneNumber || '',
              category: b.category || 'Other',
              status: 'Absent'
            };
          }
        });
        setRecordsMap(mapFromSession);
      } else {
        setSelectedSessionId('NEW');
        setServiceDate(todayStr);
        setServiceName('Daily Morning Devotional Prayers');
        setServiceType('Daily Morning Devotional');
        setNotes('');

        const freshMap: Record<string, AttendanceRecordItem> = {};
        (beneficiaries || []).forEach(b => {
          if (!b || !b.id) return;
          freshMap[b.id] = {
            beneficiaryId: b.id,
            fullName: b.fullName || 'Member',
            phoneNumber: b.phoneNumber || '',
            category: b.category || 'Other',
            status: 'Absent'
          };
        });
        setRecordsMap(freshMap);
      }
      return;
    }

    const targetSession = (attendanceSessions || []).find(s => s.id === sessionId);
    if (targetSession) {
      setSelectedSessionId(targetSession.id);
      setServiceDate(targetSession.serviceDate);
      setServiceName(targetSession.serviceName);
      setServiceType(targetSession.serviceType);
      setNotes(targetSession.notes || '');

      const mapFromSession: Record<string, AttendanceRecordItem> = {};
      (beneficiaries || []).forEach(b => {
        if (!b || !b.id) return;
        const bName = (b.fullName || '').toLowerCase();
        const existingRecord = (targetSession.records || []).find(r => 
          (r.beneficiaryId && r.beneficiaryId === b.id) || 
          (r.fullName && r.fullName.toLowerCase() === bName)
        );
        if (existingRecord) {
          mapFromSession[b.id] = existingRecord;
        } else {
          mapFromSession[b.id] = {
            beneficiaryId: b.id,
            fullName: b.fullName || 'Member',
            phoneNumber: b.phoneNumber || '',
            category: b.category || 'Other',
            status: 'Absent'
          };
        }
      });
      setRecordsMap(mapFromSession);
    }
  };

  // Helper to automatically persist attendance changes immediately to storage
  const autoSaveSession = (
    newRecordsMap: Record<string, AttendanceRecordItem>,
    overrideSessionId?: string,
    overrideDate?: string,
    overrideType?: AttendanceSession['serviceType'],
    overrideName?: string,
    overrideNotes?: string
  ) => {
    const activeDate = overrideDate || serviceDate;
    const activeSessionId = (overrideSessionId || selectedSessionId) === 'NEW' ? `att-${activeDate}` : (overrideSessionId || selectedSessionId);
    
    if (selectedSessionId === 'NEW' && !overrideSessionId) {
      setSelectedSessionId(activeSessionId);
    }

    const sessionObj: AttendanceSession = {
      id: activeSessionId,
      serviceName: overrideName !== undefined ? overrideName : serviceName,
      serviceType: overrideType !== undefined ? overrideType : serviceType,
      serviceDate: activeDate,
      recordedBy: currentUserName,
      notes: overrideNotes !== undefined ? overrideNotes : notes,
      records: Object.values(newRecordsMap),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveSession(sessionObj);
  };

  // Keep recordsMap in sync when beneficiaries list updates
  useEffect(() => {
    if (!beneficiaries || beneficiaries.length === 0) return;

    setRecordsMap(prevMap => {
      let changed = false;
      const updated = { ...prevMap };

      beneficiaries.forEach(b => {
        if (!b || !b.id) return;
        if (!updated[b.id]) {
          updated[b.id] = {
            beneficiaryId: b.id,
            fullName: b.fullName || 'Member',
            phoneNumber: b.phoneNumber || '',
            category: b.category || 'Other',
            status: 'Absent'
          };
          changed = true;
        } else {
          if (
            updated[b.id].fullName !== b.fullName ||
            updated[b.id].phoneNumber !== b.phoneNumber ||
            updated[b.id].category !== b.category
          ) {
            updated[b.id] = {
              ...updated[b.id],
              fullName: b.fullName || 'Member',
              phoneNumber: b.phoneNumber || '',
              category: b.category || 'Other'
            };
            changed = true;
          }
        }
      });

      return changed ? updated : prevMap;
    });
  }, [beneficiaries]);

  // Toggle single member status with AUTOMATIC SAVE
  const handleToggleStatus = (beneficiaryId: string, newStatus: AttendanceStatus) => {
    const existing = recordsMap[beneficiaryId];
    const now = new Date();
    const checkInStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const updatedMap: Record<string, AttendanceRecordItem> = {
      ...recordsMap,
      [beneficiaryId]: {
        beneficiaryId,
        fullName: existing?.fullName || 'Member',
        phoneNumber: existing?.phoneNumber || '',
        category: existing?.category || 'Other',
        status: newStatus,
        checkInTime: newStatus === 'Present' || newStatus === 'Late' ? (existing?.checkInTime || checkInStr) : undefined
      }
    };

    setRecordsMap(updatedMap);
    autoSaveSession(updatedMap);
  };

  // Bulk actions with AUTOMATIC SAVE
  const handleBulkSetStatus = (status: AttendanceStatus) => {
    const updatedMap: Record<string, AttendanceRecordItem> = { ...recordsMap };
    Object.keys(updatedMap).forEach(id => {
      if (updatedMap[id]) {
        updatedMap[id] = {
          ...updatedMap[id],
          status,
          checkInTime: status === 'Present' || status === 'Late' ? '05:00' : undefined
        };
      }
    });

    setRecordsMap(updatedMap);
    autoSaveSession(updatedMap);
  };

  // Admin delete active session trigger
  const handleDeleteActiveSession = () => {
    if (currentRole !== 'Admin') {
      setSaveNotification('🔒 Access Denied: Admin permissions are required to delete attendance session records.');
      setTimeout(() => setSaveNotification(null), 3500);
      return;
    }

    const existingSession = (attendanceSessions || []).find(
      s => s.id === selectedSessionId || s.serviceDate === serviceDate
    );
    const targetId = existingSession ? existingSession.id : (selectedSessionId !== 'NEW' ? selectedSessionId : `att-${serviceDate}`);

    setDeleteConfirmModal({
      isOpen: true,
      sessionId: targetId,
      title: `${serviceName} (${serviceDate})`
    });
  };

  // Confirm and execute session deletion
  const handleConfirmDeleteSession = () => {
    if (!deleteConfirmModal.sessionId) return;

    onDeleteSession(deleteConfirmModal.sessionId);

    setDeleteConfirmModal({ isOpen: false, sessionId: null, title: '' });

    // Reset session view to a fresh new roll call
    setSelectedSessionId('NEW');
    setServiceDate(todayStr);
    setServiceName('Daily Morning Devotional Prayers');
    setNotes('');

    const freshMap: Record<string, AttendanceRecordItem> = {};
    (beneficiaries || []).forEach(b => {
      freshMap[b.id] = {
        beneficiaryId: b.id,
        fullName: b.fullName || 'Member',
        phoneNumber: b.phoneNumber || '',
        category: b.category || 'Other',
        status: 'Absent'
      };
    });
    setRecordsMap(freshMap);

    setSaveNotification('🗑️ Attendance session permanently deleted by Admin.');
    setTimeout(() => setSaveNotification(null), 4000);
  };

  // Filtered and priority-sorted beneficiaries list: Esther Group members ALWAYS sorted to the VERY TOP!
  const filteredBeneficiaries = useMemo(() => {
    const list = (beneficiaries || []).filter(b => {
      if (!b) return false;
      const bName = (b.fullName || '').toLowerCase();
      const bPhone = b.phoneNumber || '';
      const bCat = b.category || 'Other';
      const searchLower = (searchQuery || '').toLowerCase();

      const matchesSearch = !searchLower || bName.includes(searchLower) || bPhone.includes(searchLower);
      let matchesCategory = false;
      if (categoryFilter === 'ALL') {
        if (activeGroup === 'Peace Group') {
          matchesCategory = bCat === 'Peace Group' || Boolean(b.notes && b.notes.toLowerCase().includes('peace'));
        } else {
          matchesCategory = bCat === 'Esther Group Benin' || Boolean(b.notes && b.notes.toLowerCase().includes('esther')) || (!bCat.toLowerCase().includes('peace') && !b.notes?.toLowerCase().includes('peace'));
        }
      } else if (categoryFilter === 'Esther Group Benin') {
        matchesCategory = bCat === 'Esther Group Benin' || Boolean(b.notes && b.notes.toLowerCase().includes('esther'));
      } else if (categoryFilter === 'Peace Group') {
        matchesCategory = bCat === 'Peace Group' || Boolean(b.notes && b.notes.toLowerCase().includes('peace'));
      } else {
        matchesCategory = bCat === categoryFilter;
      }
      const currentStatus = (recordsMap && recordsMap[b.id]) ? recordsMap[b.id].status : 'Absent';
      const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    return list.sort((a, b) => {
      const aCat = a?.category || '';
      const bCat = b?.category || '';
      const isGroupA = activeGroup === 'Peace Group'
        ? (aCat === 'Peace Group' || aCat.toLowerCase().includes('peace'))
        : (aCat === 'Esther Group Benin' || aCat.toLowerCase().includes('esther'));
      const isGroupB = activeGroup === 'Peace Group'
        ? (bCat === 'Peace Group' || bCat.toLowerCase().includes('peace'))
        : (bCat === 'Esther Group Benin' || bCat.toLowerCase().includes('esther'));

      if (isGroupA && !isGroupB) return -1;
      if (!isGroupA && isGroupB) return 1;

      return (a?.fullName || '').localeCompare(b?.fullName || '');
    });
  }, [beneficiaries, searchQuery, categoryFilter, statusFilter, recordsMap, activeGroup]);

  // Statistics
  const stats = useMemo(() => {
    const list = Object.values(recordsMap);
    const total = list.length;
    const present = list.filter(r => r.status === 'Present').length;
    const late = list.filter(r => r.status === 'Late').length;
    const absentRecords = list.filter(r => r.status === 'Absent');
    const absent = absentRecords.length;
    const excused = list.filter(r => r.status === 'Excused').length;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    const absentCategoryCounts: Record<string, number> = {};
    absentRecords.forEach(r => {
      const cat = r.category || 'Other';
      absentCategoryCounts[cat] = (absentCategoryCounts[cat] || 0) + 1;
    });

    return { total, present, late, absent, excused, percentage, absentCategoryCounts, absentRecords };
  }, [recordsMap]);

  // Save session handler
  const handleSave = () => {
    const recordList = Object.values(recordsMap);
    const newSessionId = selectedSessionId === 'NEW' ? `att-${Date.now()}` : selectedSessionId;

    const sessionObj: AttendanceSession = {
      id: newSessionId,
      serviceName,
      serviceType,
      serviceDate,
      recordedBy: currentUserName,
      notes,
      records: recordList,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveSession(sessionObj);
    setSelectedSessionId(newSessionId);

    setSaveNotification('✅ Attendance session saved successfully to ministry records!');
    setTimeout(() => setSaveNotification(null), 4000);
  };

  // Trigger follow-up to absent members (All or by Category)
  const handleFollowUpAbsent = (targetCategory: string = 'ALL') => {
    let absentList = Object.values(recordsMap).filter(r => r.status === 'Absent');
    
    if (targetCategory !== 'ALL') {
      absentList = absentList.filter(r => r.category === targetCategory);
    }

    const absentPhones = absentList.map(r => r.phoneNumber);
    const absentNames = absentList.map(r => r.fullName);
    
    onNavigateToBulkMsg(
      targetCategory === 'Peace Group' ? 'PEACE_GROUP' : targetCategory === 'Esther Group Benin' ? 'ESTHER_GROUP' : 'ABSENT_MEMBERS',
      absentPhones,
      absentNames
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Card */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-amber-500/30 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Ministry Attendance &amp; Roll Call</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-cinzel text-amber-100 flex items-center gap-3 flex-wrap">
              <span>Daily Morning Devotional Attendance Register</span>
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
              Mark roll call attendance for Daily Morning Devotional Prayers, Sunday services, and special revival fellowships. Automatically follow up with absent members via WhatsApp &amp; SMS!
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenGroupSwitchModal && (
              <button
                onClick={onOpenGroupSwitchModal}
                className="px-4 py-2.5 rounded-2xl bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-purple-600 text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer transition-all hover:scale-105"
                title="Switch between Esther Group and Peace Group (Password Protected)"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Switch Group ({activeGroup === 'Peace Group' ? 'Esther' : 'Peace'})</span>
              </button>
            )}

            <button
              onClick={() => setIsAutoMarkModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-purple-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer border border-amber-300"
            >
              <Zap className="w-4 h-4 fill-purple-950" />
              <span>⚡ Auto-Mark List</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-purple-700 text-xs font-extrabold flex items-center gap-2 shadow-lg cursor-pointer"
              title="Download clean, organized attendance registers as CSV"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>📥 Export CSV Reports</span>
            </button>

            <button
              onClick={() => setIsTraceabilityModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-purple-900/80 hover:bg-purple-800 text-indigo-300 border border-purple-700 text-xs font-extrabold flex items-center gap-2 shadow-lg cursor-pointer"
              title="Trace member attendance by date"
            >
              <Search className="w-4 h-4 text-indigo-400" />
              <span>🔍 Trace Member History</span>
            </button>

            <button
              onClick={() => handleSelectSession('NEW')}
              className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                selectedSessionId === 'NEW'
                  ? 'bg-amber-400 text-purple-950 shadow-amber-500/20'
                  : 'bg-purple-900/60 hover:bg-purple-800 text-amber-200 border border-purple-700/60'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>New Roll Call</span>
            </button>

            {currentRole === 'Admin' && selectedSessionId !== 'NEW' && (
              <button
                onClick={handleDeleteActiveSession}
                className="px-4 py-2.5 rounded-2xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-extrabold flex items-center gap-2 shadow-lg cursor-pointer transition-all"
                title="Delete current attendance session (Admin only)"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete Session</span>
              </button>
            )}

            {stats.absent > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {stats.absentCategoryCounts['Peace Group'] && stats.absentCategoryCounts['Peace Group'] > 0 && (
                  <button
                    onClick={() => handleFollowUpAbsent('Peace Group')}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 cursor-pointer border border-emerald-300"
                    title="Send bulk follow-up to absent Peace Group members"
                  >
                    <MessageSquare className="w-4 h-4 text-white" />
                    <span>🕊️ Follow-Up {stats.absentCategoryCounts['Peace Group']} Absent Peace Group Members</span>
                  </button>
                )}

                {stats.absentCategoryCounts['Esther Group Benin'] && stats.absentCategoryCounts['Esther Group Benin'] > 0 && (
                  <button
                    onClick={() => handleFollowUpAbsent('Esther Group Benin')}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-purple-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-600/25 cursor-pointer border border-amber-300"
                    title="Send bulk follow-up to absent Esther Group members"
                  >
                    <MessageSquare className="w-4 h-4 text-purple-950" />
                    <span>🌸 Follow-Up {stats.absentCategoryCounts['Esther Group Benin']} Absent Esther Group Members</span>
                  </button>
                )}

                <button
                  onClick={() => handleFollowUpAbsent('ALL')}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
                  title="Send bulk follow-up to all absent members"
                >
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span>Follow-Up All {stats.absent} Absent Members</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs: Marking Sheet vs Saved History Ledger */}
      <div className="flex items-center justify-between gap-3 border-b border-purple-800/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubView('marking')}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubView === 'marking'
                ? 'bg-amber-500 text-purple-950 shadow-lg shadow-amber-500/20'
                : 'bg-purple-900/40 text-purple-300 hover:text-amber-300 border border-purple-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>📋 Active Roll Call Sheet ({selectedSessionId === 'NEW' ? 'New Service' : serviceDate})</span>
          </button>

          <button
            onClick={() => setActiveSubView('history')}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubView === 'history'
                ? 'bg-amber-500 text-purple-950 shadow-lg shadow-amber-500/20'
                : 'bg-purple-900/40 text-purple-300 hover:text-amber-300 border border-purple-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>📚 Saved History Ledger ({attendanceSessions.length} Recorded)</span>
          </button>
        </div>

        {activeSubView === 'marking' && (
          <button
            onClick={() => handleSelectSession('NEW')}
            className="px-3 py-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-purple-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Roll Call</span>
          </button>
        )}
      </div>

      {activeSubView === 'history' ? (
        /* SAVED ATTENDANCE HISTORY LEDGER VIEW */
        <div className="p-6 rounded-3xl bg-purple-950/90 border border-purple-800/80 space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-800/80 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-amber-100 font-cinzel flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>Saved Attendance Sessions Archive ({attendanceSessions.length})</span>
              </h3>
              <p className="text-xs text-purple-300 mt-0.5">
                All previously saved service attendance records are permanently stored here. Click "Load &amp; Edit" to view or modify any record, or "Download CSV" to export the official register.
              </p>
            </div>

            {/* Date Filter Inputs */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-purple-300 font-bold">Filter Dates:</span>
              <input
                type="date"
                value={dateFilterFrom}
                onChange={(e) => setDateFilterFrom(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-purple-900/80 border border-purple-700 text-amber-200 text-xs font-mono"
              />
              <span className="text-purple-400">to</span>
              <input
                type="date"
                value={dateFilterTo}
                onChange={(e) => setDateFilterTo(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-purple-900/80 border border-purple-700 text-amber-200 text-xs font-mono"
              />
              {(dateFilterFrom || dateFilterTo) && (
                <button
                  onClick={() => { setDateFilterFrom(''); setDateFilterTo(''); }}
                  className="px-2 py-1 rounded-lg bg-purple-800 text-purple-200 text-xs hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {attendanceSessions
              .filter(session => {
                if (dateFilterFrom && session.serviceDate < dateFilterFrom) return false;
                if (dateFilterTo && session.serviceDate > dateFilterTo) return false;
                return true;
              })
              .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))
              .map(session => {
                const presentCount = session.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
                const absentCount = session.records.filter(r => r.status === 'Absent').length;
                const totalCount = session.records.length;
                const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
                const isCurrentActive = selectedSessionId === session.id;

                return (
                  <div
                    key={session.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isCurrentActive
                        ? 'bg-purple-900/60 border-amber-500/80 ring-2 ring-amber-500/20'
                        : 'bg-purple-950/60 border-purple-800 hover:bg-purple-900/40'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-extrabold">
                            📅 {session.serviceDate}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-purple-800 text-purple-200 text-xs font-bold">
                            {session.serviceType}
                          </span>
                          {isCurrentActive && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase">
                              Currently Open
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-extrabold text-amber-100 font-cinzel">
                          {session.serviceName}
                        </h4>

                        <div className="text-xs text-purple-300">
                          Recorded By: <span className="text-amber-200 font-bold">{session.recordedBy}</span>
                          {session.notes && <span className="ml-2 italic opacity-80">• {session.notes}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap">
                        {/* Stat Badges */}
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-bold">
                            🟢 {presentCount} Present
                          </div>
                          <div className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 font-bold">
                            🔴 {absentCount} Absent
                          </div>
                          <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-300 font-bold">
                            {rate}% Rate
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              handleSelectSession(session.id);
                              setActiveSubView('marking');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                          >
                            <UserCheck className="w-4 h-4 text-purple-950" />
                            <span>Load &amp; Edit</span>
                          </button>

                          <button
                            onClick={() => {
                              handleSelectSession(session.id);
                              handleExportActiveSessionCSV();
                            }}
                            className="px-3 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-amber-300 border border-purple-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                            title="Export session register to CSV"
                          >
                            <Download className="w-3.5 h-3.5 text-amber-400" />
                            <span>CSV</span>
                          </button>

                          {currentRole === 'Admin' && (
                            <button
                              onClick={() => {
                                setDeleteConfirmModal({
                                  isOpen: true,
                                  sessionId: session.id,
                                  title: `${session.serviceName} (${session.serviceDate})`
                                });
                              }}
                              className="p-2 rounded-xl bg-rose-950/60 text-rose-400 hover:bg-rose-900 hover:text-white border border-rose-800 cursor-pointer transition-all"
                              title="Delete session record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            {attendanceSessions.length === 0 && (
              <div className="p-12 text-center rounded-2xl bg-purple-950/50 border border-purple-800 text-purple-300">
                No saved attendance records found. Click "New Roll Call" above to record a session.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MARKING ROLL CALL SHEET VIEW */
        <>
          {/* Historic Session Bar & Selector */}
          <div className="p-4 rounded-2xl bg-purple-900/40 border border-purple-800/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-2 font-cinzel">
                <History className="w-4 h-4 text-amber-400" />
                <span>Quick Session Selector ({attendanceSessions.length} Saved)</span>
              </h3>

              {/* Date Filter Inputs */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-purple-300 text-[11px] font-bold">Filter Dates:</span>
                <input
                  type="date"
                  value={dateFilterFrom}
                  onChange={(e) => setDateFilterFrom(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-amber-200 text-xs"
                  placeholder="From Date"
                />
                <span className="text-purple-400">to</span>
                <input
                  type="date"
                  value={dateFilterTo}
                  onChange={(e) => setDateFilterTo(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-amber-200 text-xs"
                  placeholder="To Date"
                />
                {(dateFilterFrom || dateFilterTo) && (
                  <button
                    onClick={() => { setDateFilterFrom(''); setDateFilterTo(''); }}
                    className="px-2 py-1 rounded-lg bg-purple-800 text-purple-200 text-xs hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => handleSelectSession('NEW')}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap border transition-all cursor-pointer ${
                  selectedSessionId === 'NEW'
                    ? 'bg-amber-500 text-purple-950 border-amber-400 shadow-md'
                    : 'bg-purple-950 text-purple-200 border-purple-800 hover:text-amber-300'
                }`}
              >
                ➕ Mark New Service
              </button>

              {attendanceSessions
                .filter(session => {
                  if (dateFilterFrom && session.serviceDate < dateFilterFrom) return false;
                  if (dateFilterTo && session.serviceDate > dateFilterTo) return false;
                  return true;
                })
                .map(session => {
                  const pCount = session.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
                  const isSelected = selectedSessionId === session.id;
                  return (
                    <button
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-purple-800 text-amber-200 border-amber-400/80 shadow-md ring-2 ring-amber-500/30'
                          : 'bg-purple-950/80 text-purple-200 border-purple-800/80 hover:bg-purple-900'
                      }`}
                    >
                      <span>📅 {session.serviceDate} ({session.serviceType})</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                        {pCount}/{session.records.length} Present
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

      {/* Service Details Form Controls */}
      <div className="p-5 rounded-2xl bg-purple-950/80 border border-purple-800/80 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-extrabold text-amber-300 uppercase tracking-wider mb-1">
              Service Date
            </label>
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-purple-900/60 border border-purple-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-amber-300 uppercase tracking-wider mb-1">
              Service Type
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-purple-900/60 border border-purple-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
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

          <div>
            <label className="block text-[10px] font-extrabold text-amber-300 uppercase tracking-wider mb-1">
              Service / Program Title
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g. Sunday Celebration of Miracles"
              className="w-full px-3.5 py-2.5 rounded-xl bg-purple-900/60 border border-purple-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Live Attendance Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-purple-900/50 border border-purple-800 text-center">
            <div className="text-[10px] uppercase font-bold text-purple-300">Total Registered</div>
            <div className="text-xl font-extrabold text-amber-300 font-cinzel">{stats.total}</div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-center">
            <div className="text-[10px] uppercase font-bold text-emerald-300">Present (On Time)</div>
            <div className="text-xl font-extrabold text-emerald-400 font-cinzel">{stats.present}</div>
          </div>

          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800/80 text-center">
            <div className="text-[10px] uppercase font-bold text-amber-300">Late</div>
            <div className="text-xl font-extrabold text-amber-400 font-cinzel">{stats.late}</div>
          </div>

          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-center">
            <div className="text-[10px] uppercase font-bold text-rose-300">Absent</div>
            <div className="text-xl font-extrabold text-rose-400 font-cinzel">{stats.absent}</div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-800/80 text-center col-span-2 sm:col-span-1">
            <div className="text-[10px] uppercase font-bold text-indigo-300">Attendance Rate</div>
            <div className="text-xl font-extrabold text-indigo-300 font-cinzel">{stats.percentage}%</div>
          </div>
        </div>

        {/* Quick Bulk Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-purple-800/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-300">Quick Mark All:</span>
            <button
              onClick={() => handleBulkSetStatus('Present')}
              className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold cursor-pointer"
            >
              🟢 Mark All Present
            </button>
            <button
              onClick={() => handleBulkSetStatus('Absent')}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold cursor-pointer"
            >
              🔴 Mark All Absent
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportActiveSessionPDF}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400 font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              title="Download PDF report for this session"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              <span>Export Session PDF</span>
            </button>

            <button
              onClick={handleExportActiveSessionCSV}
              className="px-3.5 py-2 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-purple-700 font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              title="Download CSV for this session"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Session CSV</span>
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-purple-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Roll Call Record</span>
            </button>

            {selectedSessionId !== 'NEW' && currentRole === 'Admin' && (
              <button
                onClick={() => {
                  if (confirm('Delete this attendance session?')) {
                    onDeleteSession(selectedSessionId);
                    handleSelectSession('NEW');
                  }
                }}
                className="p-2 rounded-xl bg-rose-950/60 text-rose-400 hover:bg-rose-900 border border-rose-800 cursor-pointer"
                title="Delete session"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {saveNotification && (
          <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-600 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveNotification}</span>
          </div>
        )}
      </div>

      {/* Alert Banner for Unmatched / Discarded Lines from Pasted Register */}
      {autoMatchResult && autoMatchResult.discardedEntries.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/90 border-2 border-amber-500/80 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 font-extrabold text-base border border-amber-500/40">
              ⚠️
            </div>
            <div>
              <h4 className="font-black text-amber-300 font-cinzel text-sm">
                {autoMatchResult.discardedEntries.length} Unmatched Line{autoMatchResult.discardedEntries.length === 1 ? '' : 's'} From Your Pasted Attendance List
              </h4>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Some attendees in your pasted register (e.g. {autoMatchResult.discardedEntries.slice(0, 3).map(e => `"${e}"`).join(', ')}) couldn't be auto-matched automatically.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAutoMarkModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-black text-xs shadow-md shrink-0 cursor-pointer border border-amber-300 flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4 fill-purple-950" />
            <span>Review &amp; Remap {autoMatchResult.discardedEntries.length} Attendee{autoMatchResult.discardedEntries.length === 1 ? '' : 's'}</span>
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member by name or phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-purple-950/80 border border-purple-800 text-white text-xs focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-purple-950/80 border border-purple-800 text-amber-200 text-xs font-bold"
          >
            <option value="ALL">All Categories</option>
            <option value="Esther Group Benin">🌸 Esther Group Benin</option>
            <option value="Peace Group">🕊️ Peace Group</option>
            <option value="Pastor / Minister Care">👑 Pastors &amp; Ministers</option>
            <option value="Widow Support">👵 Widows</option>
            <option value="Youth Outreach">🙌 Youth Choir</option>
            <option value="Elderly Care">👴 Elderly Members</option>
            <option value="Visitor">🌱 First Timers / Visitors</option>
            <option value="Special Project">⚡ Special Project</option>
            <option value="Emergency Blessing">🙏 Emergency Blessing</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-purple-950/80 border border-purple-800 text-amber-200 text-xs font-bold"
          >
            <option value="ALL">All Statuses</option>
            <option value="Present">🟢 Present</option>
            <option value="Late">🟡 Late</option>
            <option value="Absent">🔴 Absent</option>
            <option value="Excused">🔵 Excused</option>
          </select>
        </div>
      </div>

      {/* Members Roll Call Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredBeneficiaries.map((b) => {
          const record = recordsMap[b.id] || { status: 'Absent' };
          const status = record.status;

          return (
            <div
              key={b.id}
              className={`p-4 rounded-2xl border transition-all ${
                status === 'Present'
                  ? 'bg-purple-950/90 border-emerald-500/40 ring-1 ring-emerald-500/20'
                  : status === 'Late'
                  ? 'bg-purple-950/90 border-amber-500/40 ring-1 ring-amber-500/20'
                  : status === 'Excused'
                  ? 'bg-purple-950/90 border-indigo-500/40'
                  : 'bg-purple-950/40 border-purple-900/80 opacity-85'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="text-sm font-bold text-amber-100 flex items-center gap-1.5">
                    <span>{b.fullName}</span>
                  </h4>
                  <div className="text-[11px] text-purple-300 font-mono mt-0.5">
                    {b.phoneNumber} • <span className="text-amber-300/80">{b.category}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                    status === 'Present'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : status === 'Late'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : status === 'Excused'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {status}
                  </span>
                </div>
              </div>

              {/* Status Toggle Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(b.id, 'Present')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    status === 'Present'
                      ? 'bg-emerald-500 text-purple-950 font-extrabold shadow-md'
                      : 'bg-purple-900/60 hover:bg-emerald-950/80 text-purple-200 border border-purple-800'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Present</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleStatus(b.id, 'Late')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    status === 'Late'
                      ? 'bg-amber-400 text-purple-950 font-extrabold shadow-md'
                      : 'bg-purple-900/60 hover:bg-amber-950/80 text-purple-200 border border-purple-800'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Late</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleStatus(b.id, 'Absent')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    status === 'Absent'
                      ? 'bg-rose-500 text-white font-extrabold shadow-md'
                      : 'bg-purple-900/60 hover:bg-rose-950/80 text-purple-200 border border-purple-800'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Absent</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBeneficiaries.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-purple-950/50 border border-purple-800 text-purple-300">
          No members found matching your search or filters.
        </div>
      )}
        </>
      )}

      {/* MEMBER ATTENDANCE TRACEABILITY MODAL BY DATE */}
      {isTraceabilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 border border-amber-500/40 p-6 shadow-2xl space-y-5">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-purple-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Search className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-amber-100 font-cinzel">
                    Member Attendance History &amp; Date Traceability
                  </h3>
                  <p className="text-xs text-purple-300">
                    Audit member attendance history across all recorded service dates with full date-by-date traceability.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportMemberSummaryCSV}
                  className="px-3 py-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-purple-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Export complete member summary matrix"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Export All Members Matrix</span>
                </button>

                <button
                  onClick={() => setIsTraceabilityModalOpen(false)}
                  className="p-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Member Selector & Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Member List Selector Column */}
              <div className="md:col-span-1 space-y-3 p-3 rounded-2xl bg-purple-950/80 border border-purple-800/80">
                <label className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wider block">
                  Select Member to Trace:
                </label>

                <input
                  type="text"
                  value={traceSearchTerm}
                  onChange={(e) => setTraceSearchTerm(e.target.value)}
                  placeholder="Search member name..."
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/60 border border-purple-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />

                <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                  {beneficiaries
                    .filter(b => b.fullName.toLowerCase().includes(traceSearchTerm.toLowerCase()) || b.phoneNumber.includes(traceSearchTerm))
                    .map(b => {
                      const isSelected = selectedTraceMemberId === b.id;
                      
                      // Calculate quick attendance rate for badge
                      let pCount = 0;
                      attendanceSessions.forEach(s => {
                        const rec = s.records.find(r => r.beneficiaryId === b.id || r.fullName.toLowerCase() === b.fullName.toLowerCase());
                        if (rec && (rec.status === 'Present' || rec.status === 'Late')) pCount++;
                      });
                      const rate = attendanceSessions.length > 0 ? Math.round((pCount / attendanceSessions.length) * 100) : 0;

                      return (
                        <button
                          key={b.id}
                          onClick={() => setSelectedTraceMemberId(b.id)}
                          className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-purple-950 border-amber-300 font-extrabold shadow-md'
                              : 'bg-purple-900/40 text-purple-200 border-purple-800/80 hover:bg-purple-900/80'
                          }`}
                        >
                          <div className="truncate">{b.fullName}</div>
                          <div className="flex items-center justify-between text-[10px] opacity-80 mt-0.5">
                            <span className="font-mono">{b.phoneNumber}</span>
                            <span className="font-bold">{rate}% Rate</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Date-by-Date Traceability Details Column */}
              <div className="md:col-span-2 space-y-4">
                {(() => {
                  const traceMember = beneficiaries.find(b => b.id === selectedTraceMemberId) || beneficiaries[0];
                  if (!traceMember) {
                    return (
                      <div className="p-12 text-center text-purple-300">
                        Select a member to view date-by-date attendance traceability log.
                      </div>
                    );
                  }

                  // Compute member statistics
                  const memberHistory = attendanceSessions.map(session => {
                    const record = session.records.find(r => r.beneficiaryId === traceMember.id || r.fullName.toLowerCase() === traceMember.fullName.toLowerCase());
                    return {
                      session,
                      status: record?.status || 'Absent',
                      checkInTime: record?.checkInTime
                    };
                  }).sort((a, b) => b.session.serviceDate.localeCompare(a.session.serviceDate));

                  const totalSessions = memberHistory.length;
                  const presentCount = memberHistory.filter(h => h.status === 'Present' || h.status === 'Late').length;
                  const absentCount = memberHistory.filter(h => h.status === 'Absent').length;
                  const ratePct = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

                  return (
                    <div className="space-y-4">
                      
                      {/* Selected Member Header Card */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-950 border border-purple-700/80 flex items-center justify-between gap-2">
                        <div>
                          <h4 className="text-base font-extrabold text-amber-100 font-cinzel">
                            {traceMember.fullName}
                          </h4>
                          <div className="text-xs text-purple-300 font-mono mt-0.5">
                            📱 {traceMember.phoneNumber} • Category: <span className="text-amber-300">{traceMember.category}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-black font-cinzel text-amber-300">{ratePct}%</div>
                          <div className="text-[10px] text-purple-300 font-bold uppercase">Attendance Rate</div>
                        </div>
                      </div>

                      {/* Stat Breakdown Grid */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-800 text-center">
                          <div className="text-[10px] uppercase text-purple-300 font-bold">Total Meetings</div>
                          <div className="text-lg font-extrabold text-amber-300 font-mono">{totalSessions}</div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-center">
                          <div className="text-[10px] uppercase text-emerald-300 font-bold">Total Present</div>
                          <div className="text-lg font-extrabold text-emerald-400 font-mono">{presentCount}</div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-center">
                          <div className="text-[10px] uppercase text-rose-300 font-bold">Total Absent</div>
                          <div className="text-lg font-extrabold text-rose-400 font-mono">{absentCount}</div>
                        </div>
                      </div>

                      {/* Date Traceability Timeline Ledger Table */}
                      <div className="p-3 rounded-2xl bg-purple-950/90 border border-purple-800 space-y-2">
                        <h5 className="text-xs font-extrabold text-amber-300 uppercase tracking-wider font-cinzel flex items-center justify-between">
                          <span>📅 Meeting Date History Ledger ({memberHistory.length} Dates)</span>
                        </h5>

                        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                          {memberHistory.map(({ session, status, checkInTime }) => (
                            <div
                              key={session.id}
                              className="p-3 rounded-xl bg-purple-900/40 border border-purple-800/80 flex items-center justify-between gap-2 text-xs"
                            >
                              <div>
                                <div className="font-bold text-amber-200 flex items-center gap-1.5">
                                  <span>📅 {session.serviceDate}</span>
                                  <span className="text-[11px] text-purple-300 font-normal">({session.serviceType})</span>
                                </div>
                                <div className="text-[10px] text-purple-300 mt-0.5">
                                  {session.serviceName} • Recorded by: {session.recordedBy}
                                </div>
                              </div>

                              <div className="text-right flex items-center gap-2">
                                {checkInTime && (
                                  <span className="text-[10px] font-mono text-purple-300">{checkInTime}</span>
                                )}
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                                  status === 'Present'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : status === 'Late'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}>
                                  {status}
                                </span>
                              </div>
                            </div>
                          ))}

                          {memberHistory.length === 0 && (
                            <div className="p-6 text-center text-xs text-purple-400 italic">
                              No recorded meeting dates found for this member yet.
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </div>

            </div>

          </div>
        </div>
      )}
      {isAutoMarkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 border border-amber-500/40 p-6 shadow-2xl space-y-5">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-purple-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Zap className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-amber-100 font-cinzel">
                    Auto-Mark Attendance (Paste / Upload List)
                  </h3>
                  <p className="text-xs text-purple-300">
                    Auto-matches attendees against your registered member directory. Non-members are discarded automatically!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAutoMarkModalOpen(false)}
                className="p-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanatory Info Card */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
              <div className="font-extrabold flex items-center gap-1.5 text-amber-300">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>How This Auto-Processor Works:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/90">
                <li>Paste any raw meeting text (e.g. WhatsApp list, Zoom chat transcript, plain text).</li>
                <li>Members whose names or phone numbers match will automatically be marked 🟢 <strong>Present</strong>.</li>
                <li>Non-member names in the list are automatically 🗑️ <strong>discarded</strong>.</li>
                <li>Any registered member not mentioned in the list is marked 🔴 <strong>Absent</strong>.</li>
              </ul>
            </div>

            {/* Input Mode Selector: Dual (WhatsApp + Zoom) vs Single Combined */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-purple-800/80 pb-3">
                <div className="flex items-center gap-1.5 bg-purple-900/40 p-1 rounded-xl border border-purple-800">
                  <button
                    type="button"
                    onClick={() => setAutoMarkPasteMode('dual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                      autoMarkPasteMode === 'dual'
                        ? 'bg-amber-500 text-purple-950 shadow-md'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    <span>📱 WhatsApp + 🎥 Zoom Separate Boxes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAutoMarkPasteMode('combined')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                      autoMarkPasteMode === 'combined'
                        ? 'bg-amber-500 text-purple-950 shadow-md'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    <span>📋 Single Combined Paste Box</span>
                  </button>
                </div>

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-purple-700 text-xs font-bold cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadFileName || 'Upload File (.txt)'}</span>
                  <input
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {autoMarkPasteMode === 'dual' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* WhatsApp Attendance Box */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <span>📱 Paste WhatsApp Group Chat List:</span>
                    </label>
                    <textarea
                      rows={6}
                      value={whatsappText}
                      onChange={(e) => {
                        const wVal = e.target.value;
                        setWhatsappText(wVal);
                        const combined = `${wVal}\n${zoomText}`;
                        setRawPastedText(combined);
                        handleProcessUploadText(combined);
                      }}
                      placeholder="e.g. Paste WhatsApp Attendance list&#10;1. Sister Juliet (08065289904)&#10;2. Mrs Becky Ughede (07062192372)&#10;3. Adesuwa"
                      className="w-full p-3 rounded-2xl bg-purple-950/90 border border-emerald-800/80 text-emerald-100 text-xs font-mono focus:outline-none focus:border-emerald-400 placeholder:text-emerald-400/40"
                    />
                  </div>

                  {/* Zoom Participants Box */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <span>🎥 Paste Zoom Meeting Participants:</span>
                    </label>
                    <textarea
                      rows={6}
                      value={zoomText}
                      onChange={(e) => {
                        const zVal = e.target.value;
                        setZoomText(zVal);
                        const combined = `${whatsappText}\n${zVal}`;
                        setRawPastedText(combined);
                        handleProcessUploadText(combined);
                      }}
                      placeholder="e.g. Paste Zoom Screen Names&#10;Juliet's iPhone&#10;Galaxy A12&#10;Becky Zoom&#10;Adsuwa"
                      className="w-full p-3 rounded-2xl bg-purple-950/90 border border-cyan-800/80 text-cyan-100 text-xs font-mono focus:outline-none focus:border-cyan-400 placeholder:text-cyan-400/40"
                    />
                  </div>
                </div>
              ) : (
                <textarea
                  rows={6}
                  value={rawPastedText}
                  onChange={(e) => {
                    setRawPastedText(e.target.value);
                    handleProcessUploadText(e.target.value);
                  }}
                  placeholder="Paste attendee names or phone numbers here... e.g.&#10;1. 08130424181&#10;2. Sister Juliet (08065289904)&#10;3. Mrs Becky Ughede | +234 706 219 2372&#10;4. 07061563603"
                  className="w-full p-4 rounded-2xl bg-purple-950/90 border border-purple-800 text-amber-100 text-xs font-mono focus:outline-none focus:border-amber-400 placeholder:text-purple-400/60"
                />
              )}
            </div>

            {/* Match Results Breakdown */}
            {autoMatchResult && (
              <div className="p-4 rounded-2xl bg-purple-950/90 border border-purple-800 space-y-4 animate-fadeIn">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 font-cinzel flex items-center justify-between">
                  <span>⚡ Auto-Matching Analysis Summary</span>
                  <span className="text-[10px] text-purple-300 font-mono">
                    Total Directory Members: {beneficiaries.length}
                  </span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Matched Present */}
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/80 space-y-2">
                    <div className="text-[10px] uppercase font-extrabold text-emerald-300 flex items-center justify-between">
                      <span>🟢 Matched Members (Present)</span>
                      <span className="text-sm font-black font-mono text-emerald-300">{autoMatchResult.presentMembers.length}</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 text-[11px] text-emerald-200 pr-1">
                      {autoMatchResult.presentMembers.map(m => (
                        <div key={m.id} className="flex items-center justify-between gap-1 p-1 rounded bg-emerald-900/40 border border-emerald-800/60">
                          <span className="truncate">✓ {m.fullName}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleAutoMatchMemberStatus(m.id)}
                            className="px-1.5 py-0.5 rounded text-[9px] bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-700 cursor-pointer shrink-0 font-bold"
                            title="Mark Absent"
                          >
                            Mark Absent
                          </button>
                        </div>
                      ))}
                      {autoMatchResult.presentMembers.length === 0 && (
                        <div className="text-[10px] text-emerald-400/60 italic p-2">No members matched as present.</div>
                      )}
                    </div>
                  </div>

                  {/* Unmatched Absent */}
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700/80 space-y-2">
                    <div className="text-[10px] uppercase font-extrabold text-rose-300 flex items-center justify-between gap-1">
                      <span>🔴 Regarded as Absent</span>
                      <span className="text-sm font-black font-mono text-rose-300">{autoMatchResult.absentMembers.length}</span>
                    </div>

                    <input
                      type="text"
                      placeholder="🔍 Search absent member..."
                      value={autoMarkAbsentSearch}
                      onChange={(e) => setAutoMarkAbsentSearch(e.target.value)}
                      className="w-full text-[10px] px-2 py-1 rounded-lg bg-rose-900/60 text-rose-100 border border-rose-700 focus:outline-none placeholder:text-rose-400/50"
                    />

                    <div className="max-h-44 overflow-y-auto space-y-1 text-[11px] text-rose-200 pr-1">
                      {autoMatchResult.absentMembers
                        .filter(m => {
                          if (!autoMarkAbsentSearch) return true;
                          const q = autoMarkAbsentSearch.toLowerCase();
                          return m.fullName.toLowerCase().includes(q) || m.phoneNumber.includes(q) || (m.category && m.category.toLowerCase().includes(q));
                        })
                        .map(m => (
                          <div key={m.id} className="flex items-center justify-between gap-1 p-1 rounded bg-rose-900/40 border border-rose-800/60">
                            <span className="truncate">✗ {m.fullName}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleAutoMatchMemberStatus(m.id)}
                              className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-700 cursor-pointer shrink-0 font-bold"
                              title="Mark Present"
                            >
                              Mark Present
                            </button>
                          </div>
                        ))}
                      {autoMatchResult.absentMembers.length === 0 && (
                        <div className="text-[10px] text-rose-400/60 italic p-2">All directory members matched present!</div>
                      )}
                    </div>
                  </div>

                  {/* Discarded Non-Members with Smart Suggestion & Force-Match Resolver */}
                  <div className="p-3 rounded-xl bg-purple-900/60 border border-purple-700/80 space-y-2">
                    <div className="text-[10px] uppercase font-extrabold text-purple-300 flex items-center justify-between">
                      <span>🗑️ Unmatched / Discarded Lines</span>
                      <span className="text-sm font-black font-mono text-amber-300">{autoMatchResult.discardedEntries.length}</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 text-[11px] text-purple-300 pr-1">
                      {autoMatchResult.discardedEntries.map((entry, idx) => {
                        const cleanEntry = cleanLineName(entry);
                        const entryTokens = cleanEntry.split(' ').filter((t: string) => t.length >= 2);

                        // Find smart suggestion candidate among absent members
                        const candidate = autoMatchResult.absentMembers.find(abs => {
                          const absClean = cleanLineName(abs.fullName);
                          const absTokens = absClean.split(' ');
                          return entryTokens.some((et: string) => absTokens.some((at: string) => at === et || getSimilarity(at, et) >= 0.82));
                        });

                        return (
                          <div key={idx} className="p-2 rounded-xl bg-purple-950/90 border border-purple-800/90 space-y-1.5">
                            <div className="truncate text-amber-200/90 font-mono text-[10px] font-bold">🗑️ "{entry}"</div>
                            
                            {candidate && (
                              <button
                                type="button"
                                onClick={() => handleForceMatchDiscardedLine(idx, candidate.id)}
                                className="w-full text-[10px] px-2 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center justify-between cursor-pointer transition-all"
                              >
                                <span>💡 Suggestion: Match "{candidate.fullName}"</span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-purple-950 text-[9px] font-black">Remap</span>
                              </button>
                            )}

                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleForceMatchDiscardedLine(idx, e.target.value);
                                }
                              }}
                              defaultValue=""
                              className="w-full text-[10px] p-1.5 rounded-lg bg-purple-900 text-amber-300 border border-purple-700 focus:outline-none"
                            >
                              <option value="" disabled>➕ Select member to remap line...</option>
                              {autoMatchResult.absentMembers.map(abs => (
                                <option key={abs.id} value={abs.id}>
                                  {abs.fullName} ({abs.phoneNumber})
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                      {autoMatchResult.discardedEntries.length === 0 && (
                        <div className="text-[10px] text-purple-400 italic p-2">No unmatched lines! All lines matched or cleared.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Apply Button */}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setIsAutoMarkModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleApplyAutoMatchToRollCall}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-purple-950 font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-purple-950" />
                    <span>Apply {autoMatchResult.presentMembers.length} Present &amp; {autoMatchResult.absentMembers.length} Absent to Register</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL 3: Export Selection Options */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl bg-purple-950 border-2 border-amber-500/50 p-6 shadow-2xl text-white space-y-5 relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-purple-800/80 pb-3">
              <div className="flex items-center gap-2 text-amber-300 font-extrabold font-cinzel text-base">
                <Download className="w-5 h-5 text-amber-400" />
                <span>📥 Export Organized Attendance CSV Reports</span>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-xl bg-purple-900 hover:bg-rose-600 text-purple-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-purple-200/90 leading-relaxed">
              Select an attendance CSV report format below. All exports are clean, deduplicated, and formatted into standard Excel spreadsheets without repetitive records.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* 1. Matrix Grid CSV */}
              <div className="p-4 rounded-2xl bg-purple-900/40 border border-amber-500/40 hover:border-amber-400 space-y-3 flex flex-col justify-between transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-300 font-extrabold text-sm">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>📊 Attendance Matrix Grid CSV</span>
                  </div>
                  <p className="text-[11px] text-purple-200/80 leading-normal">
                    <strong>1 row per member.</strong> Meeting dates are arranged horizontally across columns with attendance statuses (Present/Absent), summary totals, and date attendance percentages.
                  </p>
                </div>
                <button
                  onClick={handleExportMatrixCSV}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-purple-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Matrix Register</span>
                </button>
              </div>

              {/* 2. Active Session PDF & CSV */}
              <div className="p-4 rounded-2xl bg-purple-900/40 border border-purple-700/80 hover:border-purple-600 space-y-3 flex flex-col justify-between transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-sm">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>📋 Active Meeting Roll Call Report</span>
                  </div>
                  <p className="text-[11px] text-purple-200/80 leading-normal">
                    Downloads the active meeting session ({serviceDate}) register with group header banner and clean member attendance table.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleExportActiveSessionPDF}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer border border-purple-400"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-300" />
                    <span>Export PDF</span>
                  </button>
                  <button
                    onClick={handleExportActiveSessionCSV}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-purple-900 hover:bg-purple-800 text-indigo-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-purple-700 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-300" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* 3. Master History Log CSV */}
              <div className="p-4 rounded-2xl bg-purple-900/40 border border-purple-700/80 hover:border-purple-600 space-y-3 flex flex-col justify-between transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-sm">
                    <History className="w-4 h-4 text-emerald-400" />
                    <span>📅 Master Session History Log</span>
                  </div>
                  <p className="text-[11px] text-purple-200/80 leading-normal">
                    Organizes past recorded sessions into clean date sections, listing deduplicated member attendance records for each meeting date.
                  </p>
                </div>
                <button
                  onClick={handleExportMasterCSV}
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-900 hover:bg-purple-800 text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-purple-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Download Master History CSV</span>
                </button>
              </div>

              {/* 4. Member Traceability Ledger PDF & CSV */}
              <div className="p-4 rounded-2xl bg-purple-900/40 border border-purple-700/80 hover:border-purple-600 space-y-3 flex flex-col justify-between transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-300 font-extrabold text-sm">
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                    <span>👤 Member Attendance Summary Report</span>
                  </div>
                  <p className="text-[11px] text-purple-200/80 leading-normal">
                    Unique member stats ledger listing all registered members with their total meeting attendance count, percentage rate (%), and attendance history.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleExportMemberSummaryPDF}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer border border-cyan-400"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-300" />
                    <span>Export PDF</span>
                  </button>
                  <button
                    onClick={handleExportMemberSummaryCSV}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-purple-900 hover:bg-purple-800 text-cyan-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-purple-700 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-purple-200 text-xs font-bold cursor-pointer"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom Admin Delete Session Confirmation Modal */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-purple-950 border-2 border-rose-500/60 p-6 shadow-2xl text-white space-y-5 relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-950 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
              🗑️
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold font-cinzel text-rose-300">
                Confirm Session Deletion
              </h3>
              <p className="text-xs text-purple-200">
                Are you sure you want to permanently delete the attendance session register for:
              </p>
              <div className="p-3 rounded-2xl bg-purple-900/60 border border-rose-800/80 text-amber-300 font-extrabold text-sm font-mono">
                {deleteConfirmModal.title}
              </div>
              <p className="text-[11px] text-rose-400/90 font-medium italic">
                ⚠️ This action cannot be undone. All recorded member statuses for this service will be erased.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, sessionId: null, title: '' })}
                className="w-1/2 py-3 rounded-2xl bg-purple-900 hover:bg-purple-800 text-purple-200 font-bold text-xs cursor-pointer border border-purple-700 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteSession}
                className="w-1/2 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold text-xs shadow-lg shadow-rose-900/50 cursor-pointer border border-rose-400 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
