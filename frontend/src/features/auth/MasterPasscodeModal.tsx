'use client';

import React, { useState } from 'react';
import { useMission } from '@/lib/mission-context';

interface MasterPasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionTitle?: string;
  actionDescription?: string;
}

export function MasterPasscodeModal({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = 'Authorize Commercial Delegation',
  actionDescription = 'Enter your 4-digit Master Commercial Passcode to verify delegated authority.',
}: MasterPasscodeModalProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  if (!isOpen) return null;

  // Master Passcode is 1234 or any 4 digit pin in demo mode
  const handleDigitChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const newPin = [...pin];
    newPin[index] = val;
    setPin(newPin);
    setError(null);

    // Auto focus next input
    if (val && index < 3) {
      const nextInput = document.getElementById(`pin-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = () => {
    const fullPin = pin.join('');
    if (fullPin.length < 4) {
      setError('Please enter a complete 4-digit passcode.');
      return;
    }

    setAuthenticating(true);
    setTimeout(() => {
      // Valid pin: '1234' or any 4 digits
      if (fullPin === '1234' || fullPin === '0000' || fullPin.length === 4) {
        setAuthenticating(false);
        setPin(['', '', '', '']);
        onSuccess();
      } else {
        setAuthenticating(false);
        setError('Invalid passcode. Default demo passcode is 1234.');
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-[#c7c4d8]/30 shadow-2xl overflow-hidden space-y-5 p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {/* Header Badge */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] border border-[#4f46e5]/20 flex items-center justify-center text-[#4f46e5] shadow-xs">
            <span className="material-symbols-outlined text-2xl">fingerprint</span>
          </div>
          <h3 className="font-heading font-bold text-lg text-[#0b1c30]">{actionTitle}</h3>
          <p className="text-xs text-[#777587] leading-relaxed max-w-xs">{actionDescription}</p>
        </div>

        {/* PIN Inputs */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 py-2">
            {pin.map((digit, idx) => (
              <input
                key={idx}
                id={`pin-input-${idx}`}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                autoFocus={idx === 0}
                className="w-12 h-14 text-center text-2xl font-mono font-bold bg-[#f8f9ff] border-2 border-[#c7c4d8]/40 rounded-2xl text-[#0b1c30] focus:border-[#4f46e5] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#4f46e5]/10 transition shadow-2xs"
              />
            ))}
          </div>

          {error ? (
            <div className="text-[11px] font-mono text-[#ba1a1a] text-center font-semibold bg-[#ba1a1a]/10 py-1 rounded-lg">
              {error}
            </div>
          ) : (
            <div className="text-[11px] font-mono text-[#777587] text-center">
              Default Demo Passcode: <span className="font-bold text-[#4f46e5]">1234</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleVerify}
            disabled={authenticating}
            className="w-full py-3 bg-[#4f46e5] hover:bg-[#3525cd] text-white font-heading font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {authenticating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying Signature...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">lock_open</span>
                <span>Authenticate & Proceed</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
