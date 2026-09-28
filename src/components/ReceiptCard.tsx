import React, { useRef, useState } from 'react';
import { Flame, Download, Share2, Printer, CheckCircle2, ShieldCheck, Copy, Check, X, FileText, Image as ImageIcon } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { AirtimeRecord } from '../types';
import { formatNaira, buildWhatsAppShareText } from '../utils/receiptGenerator';
import { getNetworkBadgeStyle } from '../utils/networkDetector';

interface ReceiptCardProps {
  record: AirtimeRecord;
  onClose?: () => void;
  onOpenProofModal?: (imageUrl: string) => void;
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({
  record,
  onClose,
  onOpenProofModal,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const badgeStyle = getNetworkBadgeStyle(record.network);

  // Export Receipt as PNG Image
  const handleDownloadImage = async () => {
    if (!receiptRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        backgroundColor: '#1e1b4b',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `Receipt_${record.receiptNo}_${record.beneficiaryName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate receipt image:', err);
      alert('Could not download image. Please try screenshotting or printing.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export Receipt as PDF Document
  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${record.receiptNo}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('PDF generation failed. Try downloading as image or printing.');
    } finally {
      setIsExporting(false);
    }
  };

  // Print Receipt directly
  const handlePrint = () => {
    window.print();
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    const shareText = buildWhatsAppShareText(record);
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
  };

  // Copy Receipt Text Summary
  const handleCopyText = () => {
    const rawText = `LIGHT UP PRAYER HOUSE • FAMILY OUTREACH
Official Receipt: ${record.receiptNo}
Beneficiary: ${record.beneficiaryName} (${record.phoneNumber})
Network: ${record.network}
Amount Disbursed: ${formatNaira(record.amount)}
Purpose: ${record.purpose}
Date: ${record.distributionDate} ${record.distributionTime || ''}
Distributed By: ${record.distributedBy}
"Every good gift and every perfect gift is from above..." — James 1:17`;

    navigator.clipboard.writeText(rawText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-purple-900/40 border border-purple-800/60 no-print">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Official Ministry Receipt • {record.receiptNo}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleShareWhatsApp}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={isExporting}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="px-3.5 py-1.5 rounded-xl bg-purple-800 hover:bg-purple-700 text-amber-200 font-bold text-xs flex items-center gap-1.5 border border-purple-600 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-purple-800 hover:bg-purple-700 text-purple-200 font-bold text-xs flex items-center gap-1.5 border border-purple-600 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={handleCopyText}
            className="px-3 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-300 font-semibold text-xs flex items-center gap-1"
          >
            {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText ? 'Copied' : 'Copy'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-purple-900/80 hover:bg-rose-500 text-purple-300 hover:text-white transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Actual Printable Receipt Card */}
      <div
        ref={receiptRef}
        className="printable-area max-w-2xl mx-auto rounded-3xl bg-gradient-to-b from-purple-950 via-purple-900 to-slate-950 border-2 border-amber-500/40 p-6 sm:p-8 shadow-2xl space-y-6 text-white relative overflow-hidden"
      >
        {/* Background Royal Emblem Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
          <Flame className="w-96 h-96 text-amber-400" />
        </div>

        {/* Receipt Header & Ministry Branding */}
        <div className="text-center space-y-2 pb-6 border-b border-amber-500/30 relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20 mb-1">
            <div className="w-full h-full bg-purple-950 rounded-[14px] flex items-center justify-center">
              <Flame className="w-8 h-8 text-amber-400" />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold font-cinzel text-amber-300 tracking-tight">
            LIGHT UP PRAYER HOUSE
          </h2>
          <div className="text-xs font-bold text-amber-400 tracking-widest uppercase">
            FAMILY OUTREACH • AIRTIME DISTRIBUTION RECEIPT
          </div>
          <p className="text-[11px] text-purple-200/80 font-medium">
            &quot;We Move By Fire — Pray • Believe • Rise • Overcome&quot;
          </p>
        </div>

        {/* Receipt Voucher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-purple-900/60 border border-purple-700/60 text-xs">
          <div>
            <div className="text-[10px] text-purple-300 uppercase font-bold tracking-wider">OFFICIAL RECEIPT NO.</div>
            <div className="text-sm font-extrabold font-mono text-amber-300">{record.receiptNo}</div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-purple-300 uppercase font-bold tracking-wider">DATE &amp; TIME</div>
            <div className="text-xs font-bold text-purple-100">
              {record.distributionDate} {record.distributionTime ? `• ${record.distributionTime}` : ''}
            </div>
          </div>
        </div>

        {/* Beneficiary & Transaction Breakdown Grid */}
        <div className="space-y-3 text-sm">
          
          <div className="p-4 rounded-2xl bg-purple-900/40 border border-purple-800/60 space-y-3">
            <div className="flex items-center justify-between border-b border-purple-800/40 pb-2">
              <span className="text-xs text-purple-300 font-semibold uppercase">Beneficiary Name</span>
              <span className="font-extrabold text-white text-base">{record.beneficiaryName}</span>
            </div>

            <div className="flex items-center justify-between border-b border-purple-800/40 pb-2">
              <span className="text-xs text-purple-300 font-semibold uppercase">Phone Number</span>
              <span className="font-bold text-amber-200">{record.phoneNumber}</span>
            </div>

            <div className="flex items-center justify-between border-b border-purple-800/40 pb-2">
              <span className="text-xs text-purple-300 font-semibold uppercase">Network Provider</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                {record.network}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-purple-800/40 pb-2">
              <span className="text-xs text-purple-300 font-semibold uppercase">Outreach Purpose</span>
              <span className="font-semibold text-purple-200">{record.purpose}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-purple-300 font-semibold uppercase">Distributed By</span>
              <span className="font-semibold text-amber-300">{record.distributedBy}</span>
            </div>
          </div>

          {/* Big Amount Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border-2 border-amber-500/50 text-center space-y-1">
            <div className="text-xs font-bold text-amber-300 uppercase tracking-widest">AIRTIME AMOUNT DISBURSED</div>
            <div className="text-3xl sm:text-4xl font-extrabold font-cinzel text-amber-400">
              {formatNaira(record.amount)}
            </div>
            <div className="text-[10px] text-amber-200/80 font-medium">Fully Paid &amp; Transferred as Blessing</div>
          </div>

          {/* Notes if present */}
          {record.notes && (
            <div className="p-3.5 rounded-xl bg-purple-900/30 border border-purple-800/40 text-xs space-y-1">
              <span className="font-bold text-purple-300 uppercase text-[10px]">Ministry Follow-up Notes:</span>
              <p className="text-slate-300 italic">{record.notes}</p>
            </div>
          )}

          {/* Attached Evidence Proof Display */}
          {record.evidenceUrl && (
            <div className="p-4 rounded-2xl bg-purple-950/80 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verifiable Evidence Attached</span>
                </span>
                {onOpenProofModal && (
                  <button
                    type="button"
                    onClick={() => onOpenProofModal(record.evidenceUrl!)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold underline"
                  >
                    Expand Proof Image
                  </button>
                )}
              </div>
              <div className="relative rounded-xl overflow-hidden border border-purple-700/60 max-h-48 flex items-center justify-center bg-black/40">
                <img
                  src={record.evidenceUrl}
                  alt="Proof Screenshot"
                  className="max-h-48 w-auto object-contain cursor-pointer"
                  onClick={() => onOpenProofModal && onOpenProofModal(record.evidenceUrl!)}
                />
              </div>
            </div>
          )}

        </div>

        {/* Scripture Quote Box */}
        <div className="p-4 rounded-2xl bg-purple-900/40 border border-amber-500/20 text-center space-y-1">
          <p className="text-xs sm:text-sm text-amber-200 italic font-serif">
            &quot;Every good gift and every perfect gift is from above, and cometh down from the Father of lights...&quot;
          </p>
          <div className="text-[11px] font-bold text-amber-400">— James 1:17</div>
        </div>

        {/* Signature & Seal Area */}
        <div className="pt-6 border-t border-purple-800/60 flex items-end justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="h-8 border-b border-purple-600/80 w-36 sm:w-48 font-serif italic text-amber-300 text-xs flex items-end pb-1">
              {record.distributedBy}
            </div>
            <div className="text-[10px] text-purple-300 uppercase font-semibold">Authorized Minister Signature</div>
          </div>

          <div className="text-right space-y-1">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-amber-500/60 p-1 text-center">
              <span className="text-[9px] font-extrabold font-cinzel text-amber-400 leading-none">
                SEAL OF OUTREACH
              </span>
            </div>
            <div className="text-[9px] text-purple-300 uppercase">Verified Audit Entry</div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-2 text-[10px] text-purple-400/80 space-y-0.5">
          <div>LIGHT UP PRAYER HOUSE • FAMILY OUTREACH</div>
          <div>© 2026 — All Records Preserved and tracked in real-time.</div>
        </div>

      </div>
    </div>
  );
};
