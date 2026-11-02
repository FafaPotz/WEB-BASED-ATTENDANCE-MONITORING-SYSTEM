import React, { useState, useEffect } from 'react';
import { Radio, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button.tsx';
import { Alert, AlertTitle, AlertDescription } from './ui/alert.tsx';

interface NFCReaderProps {
  onScan: (nfcId: string) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
}

export const NFCReader: React.FC<NFCReaderProps> = ({ onScan, isActive, theme = 'dark' }) => {
  const [reading, setReading] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('NDEFReader' in window)) {
      setSupported(false);
      setError('Web NFC is not supported on this browser/device. (Requires Chrome on Android with NFC hardware).');
    }
  }, []);

  useEffect(() => {
    if (isActive && supported) {
      startReading();
    }
  }, [isActive, supported]);

  const startReading = async () => {
    if (!supported) return;
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      setReading(true);
      ndef.onreading = (event: any) => {
        const serialNumber = event.serialNumber;
        onScan(serialNumber);
      };
    } catch (err: any) {
      setError(err?.message || 'Error initializing NFC scanner');
      setReading(false);
    }
  };

  const simulateTap = () => {
    const mockNfc = 'NFC-' + Math.floor(100000 + Math.random() * 900000);
    onScan(mockNfc);
  };

  return (
    <div className={`w-full space-y-4 p-6 rounded-2xl border text-center ${
      theme === 'light'
        ? 'bg-white border-slate-200/90 shadow-xs text-slate-800'
        : 'bg-slate-800/90 border-slate-700 text-white'
    }`}>
      <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
        theme === 'light' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-emerald-500/20 text-emerald-400'
      }`}>
        <Radio className="w-8 h-8 animate-pulse" />
      </div>

      <h3 className={`text-lg font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
        NFC Attendance Reader
      </h3>
      <p className={`text-xs max-w-sm mx-auto ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
        Hold student ID or NFC card against the back of the device to automatically record attendance.
      </p>

      {error && (
        <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-800 text-left my-3">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <AlertTitle className="text-xs font-bold text-rose-900">Hardware Notice</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="pt-2 flex justify-center">
        <Button
          type="button"
          onClick={simulateTap}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
        >
          <CheckCircle2 className="w-4 h-4 mr-1.5" />
          Simulate NFC Card Tap (SITE01)
        </Button>
      </div>
    </div>
  );
};
