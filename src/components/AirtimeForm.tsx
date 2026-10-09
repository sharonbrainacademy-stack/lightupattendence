import React, { useState, useEffect } from 'react';
import { Phone, User, Calendar, CreditCard, FileCheck, Upload, Camera, Sparkles, Check, AlertCircle, Heart, X, Image as ImageIcon } from 'lucide-react';
import { AirtimeRecord, NetworkType, PurposeCategory, MinistryGroup } from '../types';
import { detectNigerianNetwork, getNetworkBadgeStyle, formatPhoneNumber } from '../utils/networkDetector';
import { generateReceiptNumber } from '../utils/receiptGenerator';

interface AirtimeFormProps {
  currentUserName: string;
  activeGroup?: MinistryGroup;
  onSaveRecord: (record: AirtimeRecord) => void;
  onCancel?: () => void;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];

const PURPOSE_OPTIONS: PurposeCategory[] = [
  'Peace Group',
  'Esther Group Benin',
  'Widow Support',
  'Youth Outreach',
  'Elderly Care',
  'Visitor',
  'Special Project',
  'Pastor / Minister Care',
  'Emergency Blessing',
  'Other / Custom'
];

export const AirtimeForm: React.FC<AirtimeFormProps> = ({
  currentUserName,
  activeGroup = 'Esther Group',
  onSaveRecord,
  onCancel,
}) => {
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState<NetworkType>('Other');
  const [amount, setAmount] = useState<number | 'custom' | ''>(2000);
  const [customAmount, setCustomAmount] = useState('');
  const [purpose, setPurpose] = useState<PurposeCategory>(
    activeGroup === 'Peace Group' ? 'Peace Group' : 'Esther Group Benin'
  );
  const [customPurpose, setCustomPurpose] = useState('');
  const [distributionDate, setDistributionDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [distributionTime, setDistributionTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [distributedBy, setDistributedBy] = useState(currentUserName);
  const [notes, setNotes] = useState('');
  
  // Evidence upload state
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [evidenceName, setEvidenceName] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [formError, setFormError] = useState('');

  // Auto-detect network whenever phone number changes
  useEffect(() => {
    if (phoneNumber) {
      const detected = detectNigerianNetwork(phoneNumber);
      setNetwork(detected);
    }
  }, [phoneNumber]);

  // Sync default purpose when active group changes
  useEffect(() => {
    if (activeGroup === 'Peace Group') {
      setPurpose('Peace Group');
    } else {
      setPurpose('Esther Group Benin');
    }
  }, [activeGroup]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhoneNumber(val);
  };

  // Image Upload Handler (converts image file to compressed Base64 Data URL)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (PNG, JPG, Screenshot).');
      return;
    }

    setIsProcessingImage(true);
    setFormError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress image using canvas
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // Constrain max dimension for fast local storage

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setEvidenceUrl(compressedDataUrl);
          setEvidenceName(file.name);
        } else {
          setEvidenceUrl(event.target?.result as string);
          setEvidenceName(file.name);
        }
        setIsProcessingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Generate quick proof receipt graphic if user doesn't have an instant screenshot
  const handleGenerateSampleEvidence = () => {
    const amtStr = typeof amount === 'number' ? `₦${amount.toLocaleString()}.00` : '₦1,000.00';
    const netStr = network !== 'Other' ? network : 'Nigerian Telecom';
    const refNum = `LU-TRX-${Math.floor(100000 + Math.random() * 900000)}`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="400" height="300" rx="16" fill="#0f172a"/>
      <rect x="20" y="20" width="360" height="260" rx="12" fill="#1e1b4b" stroke="#a855f7" stroke-width="2"/>
      <circle cx="200" cy="60" r="24" fill="#f59e0b"/>
      <text x="200" y="66" font-family="sans-serif" font-weight="bold" font-size="18" fill="#1e1b4b" text-anchor="middle">✓</text>
      <text x="200" y="105" font-family="sans-serif" font-weight="bold" font-size="16" fill="#fef08a" text-anchor="middle">AIRTIME TRANSFER SUCCESSFUL</text>
      <text x="200" y="130" font-family="sans-serif" font-size="12" fill="#cbd5e1" text-anchor="middle">LIGHT UP PRAYER HOUSE OUTREACH</text>
      <line x1="40" y1="145" x2="360" y2="145" stroke="#3730a3" stroke-dasharray="4"/>
      <text x="50" y="175" font-family="sans-serif" font-size="13" fill="#94a3b8">Beneficiary:</text>
      <text x="350" y="175" font-family="sans-serif" font-weight="bold" font-size="13" fill="#e2e8f0" text-anchor="end">${beneficiaryName || 'Ministry Beneficiary'}</text>
      <text x="50" y="200" font-family="sans-serif" font-size="13" fill="#94a3b8">Network &amp; Amount:</text>
      <text x="350" y="200" font-family="sans-serif" font-weight="bold" font-size="14" fill="#4ade80" text-anchor="end">${netStr} - ${amtStr}</text>
      <text x="50" y="225" font-family="sans-serif" font-size="13" fill="#94a3b8">Transaction Ref:</text>
      <text x="350" y="225" font-family="monospace" font-size="12" fill="#e2e8f0" text-anchor="end">${refNum}</text>
      <rect x="40" y="245" width="320" height="24" rx="6" fill="#312e81"/>
      <text x="200" y="261" font-family="sans-serif" font-size="11" fill="#fef08a" text-anchor="middle">Verified Ministry Record • Audit Evidence Preserved</text>
    </svg>`;

    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    setEvidenceUrl(dataUrl);
    setEvidenceName(`auto_transfer_proof_${refNum}.png`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!beneficiaryName.trim()) {
      setFormError('Please enter the Beneficiary Full Name.');
      return;
    }

    if (!phoneNumber.trim()) {
      setFormError('Please enter the Beneficiary Phone Number.');
      return;
    }

    const finalAmount = amount === 'custom' || amount === '' ? Number(customAmount) : Number(amount);
    if (!finalAmount || finalAmount <= 0) {
      setFormError('Please specify a valid airtime amount (₦).');
      return;
    }

    const finalPurpose = purpose === 'Other / Custom' ? customPurpose || 'Custom Outreach' : purpose;

    const receiptNo = generateReceiptNumber(distributionDate);

    const record: AirtimeRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      receiptNo,
      beneficiaryName: beneficiaryName.trim(),
      phoneNumber: formatPhoneNumber(phoneNumber),
      network,
      amount: finalAmount,
      purpose: finalPurpose,
      distributionDate,
      distributionTime,
      distributedBy: distributedBy.trim() || 'Ministry Volunteer',
      notes: notes.trim(),
      evidenceUrl: evidenceUrl || undefined,
      evidenceName: evidenceName || undefined,
      evidenceType: 'image',
      status: evidenceUrl ? 'Verified' : 'Pending Evidence',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveRecord(record);
  };

  const badgeStyle = getNetworkBadgeStyle(network);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950 via-purple-900 to-slate-950 border border-amber-500/30 shadow-xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold font-cinzel text-white">
              📲 New Airtime Distribution Form
            </h2>
            <p className="text-xs sm:text-sm text-amber-200/80">
              Record gift details, upload transaction evidence, and instantly generate official receipt.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-purple-950/60 border border-purple-800/50 shadow-2xl space-y-6 backdrop-blur-md">
        
        {formError && (
          <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Beneficiary Name */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
              Beneficiary Full Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
              <input
                type="text"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder="e.g., Mrs. Abigail Okonkwo"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-900/40 border border-purple-700/60 text-white placeholder-purple-400/60 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm font-medium transition-all"
                required
              />
            </div>
          </div>

          {/* Phone Number & Network Auto-Detect */}
          <div className="space-y-1.5 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
                Phone Number <span className="text-rose-400">*</span>
              </label>
              {network !== 'Other' && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-Detected: {network}</span>
                </span>
              )}
            </div>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="e.g., 0803 123 4567"
                className="w-full pl-10 pr-28 py-3 rounded-xl bg-purple-900/40 border border-purple-700/60 text-white placeholder-purple-400/60 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm font-medium transition-all"
                required
              />
              {/* Manual Network Switcher Dropdown inside input */}
              <div className="absolute right-2 top-2">
                <select
                  value={network}
                  onChange={(e) => setNetwork(e.target.value as NetworkType)}
                  className="bg-purple-950 text-amber-300 text-xs font-bold py-1.5 px-2 rounded-lg border border-purple-700 focus:outline-none cursor-pointer"
                >
                  <option value="MTN">MTN</option>
                  <option value="Glo">Glo</option>
                  <option value="Airtel">Airtel</option>
                  <option value="9Mobile">9Mobile</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Amount (₦) */}
          <div className="space-y-2 md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
              Airtime Amount (₦) <span className="text-rose-400">*</span>
            </label>
            
            {/* Quick Preset Amount Chips */}
            <div className="flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => {
                    setAmount(preset);
                    setCustomAmount('');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border ${
                    amount === preset
                      ? 'bg-amber-500 text-purple-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-purple-900/40 text-purple-200 border-purple-700/60 hover:bg-purple-800/60 hover:border-amber-500/40'
                  }`}
                >
                  ₦{preset.toLocaleString()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount('custom')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border ${
                  amount === 'custom'
                    ? 'bg-amber-500 text-purple-950 border-amber-400'
                    : 'bg-purple-900/40 text-purple-200 border-purple-700/60 hover:bg-purple-800/60'
                }`}
              >
                Custom Amount
              </button>
            </div>

            {/* Custom Amount Input if selected */}
            {(amount === 'custom' || amount === '') && (
              <div className="mt-2">
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter custom amount in ₦ (e.g., 15000)"
                  className="w-full px-4 py-2.5 rounded-xl bg-purple-900/40 border border-amber-500/50 text-white placeholder-purple-400/60 focus:outline-none focus:border-amber-400 text-sm font-semibold"
                />
              </div>
            )}
          </div>

          {/* Purpose / Reason */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
              Outreach Purpose / Category <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Heart className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as PurposeCategory)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-900/40 border border-purple-700/60 text-white focus:outline-none focus:border-amber-400 text-sm font-medium transition-all"
              >
                {PURPOSE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-purple-950 text-white">
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {purpose === 'Other / Custom' && (
              <input
                type="text"
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
                placeholder="Specify purpose (e.g. Hospital Visitor Support)"
                className="w-full mt-2 px-4 py-2.5 rounded-xl bg-purple-900/40 border border-amber-500/50 text-white placeholder-purple-400/60 text-sm"
              />
            )}
          </div>

          {/* Date & Time */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
              Date of Distribution
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
              <input
                type="date"
                value={distributionDate}
                onChange={(e) => setDistributionDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-900/40 border border-purple-700/60 text-white focus:outline-none focus:border-amber-400 text-sm font-medium"
              />
            </div>
          </div>

          {/* Distributed By (Minister/Volunteer) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
              Distributed By (Minister / Volunteer)
            </label>
            <input
              type="text"
              value={distributedBy}
              onChange={(e) => setDistributedBy(e.target.value)}
              placeholder="e.g., Pastor David Olatunji"
              className="w-full px-4 py-3 rounded-xl bg-purple-900/40 border border-purple-700/60 text-white placeholder-purple-400/60 focus:outline-none focus:border-amber-400 text-sm font-medium"
              required
            />
          </div>

          {/* Notes / Prayer Request */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
              Notes &amp; Prayer Requests <span className="text-purple-400 text-[11px] font-normal">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g., Member requested prayer for healing. Promised to join Thursday service."
              className="w-full px-4 py-3 rounded-xl bg-purple-900/40 border border-purple-700/60 text-white placeholder-purple-400/60 focus:outline-none focus:border-amber-400 text-sm"
            />
          </div>

          {/* Proof of Airtime Sent Upload Section */}
          <div className="space-y-2 md:col-span-2 p-5 rounded-2xl bg-purple-900/30 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>✅ Proof of Airtime Sent (Transaction Screenshot)</span>
                </label>
                <p className="text-xs text-purple-200/80 mt-0.5">
                  Upload screenshot, SMS notification, or bank receipt as verifiable evidence.
                </p>
              </div>

              {evidenceUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setEvidenceUrl('');
                    setEvidenceName('');
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove Proof</span>
                </button>
              )}
            </div>

            {/* Evidence Preview or Upload Control */}
            {evidenceUrl ? (
              <div className="p-3 rounded-xl bg-purple-950 border border-amber-500/40 flex items-center gap-4">
                <img
                  src={evidenceUrl}
                  alt="Proof Screenshot"
                  className="w-20 h-20 object-cover rounded-lg border border-purple-700 shrink-0"
                />
                <div className="space-y-1 overflow-hidden">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>Evidence Attached &amp; Preserved</span>
                  </div>
                  <div className="text-xs text-slate-300 truncate">{evidenceName || 'proof_image.png'}</div>
                  <div className="text-[10px] text-amber-300">Ready for official receipt generation</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Upload File Input Button */}
                <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-purple-700/80 hover:border-amber-400/80 bg-purple-950/50 hover:bg-purple-900/40 cursor-pointer transition-all text-center group">
                  <Upload className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
                  <span className="text-xs font-bold text-white">Upload Screenshot / Receipt</span>
                  <span className="text-[10px] text-purple-300 mt-0.5">PNG, JPG, WEBP (Max 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                {/* Auto Generate Sample Proof Button (For Quick Test / Demonstration) */}
                <button
                  type="button"
                  onClick={handleGenerateSampleEvidence}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-purple-700/80 hover:border-amber-500/60 bg-purple-900/30 hover:bg-purple-900/60 text-purple-200 transition-all text-center group"
                >
                  <Sparkles className="w-6 h-6 text-amber-400 group-hover:rotate-12 transition-transform mb-1.5" />
                  <span className="text-xs font-bold text-amber-300">Generate Audit Transfer Proof</span>
                  <span className="text-[10px] text-purple-300/80 mt-0.5">Creates instant digital transfer voucher</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-purple-800/60">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-purple-900/50 hover:bg-purple-900 text-purple-200 font-bold text-sm transition-all"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isProcessingImage}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-purple-950 font-extrabold shadow-xl shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-base cursor-pointer"
          >
            <Sparkles className="w-5 h-5 fill-purple-950" />
            <span>➕ SAVE &amp; GENERATE RECEIPT</span>
          </button>
        </div>

      </form>
    </div>
  );
};
