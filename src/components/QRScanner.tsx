import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, RefreshCw, Keyboard, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { decodeQRCodeFromImage } from '../utils/qrDecoder.ts';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  isActive: boolean;
  hideManualEntry?: boolean;
  submitLabel?: string;
  theme?: 'light' | 'dark';
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, isActive, hideManualEntry = false, submitLabel = 'Submit', theme = 'dark' }) => {
  const [scanning, setScanning] = useState(false);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Generate unique id for this scanner instance to prevent DOM collisions
  const scannerContainerId = useRef(`qr-reader-${Math.random().toString(36).substring(2, 9)}`);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    Html5Qrcode.getCameras()
      .then(devices => {
        if (!isMountedRef.current) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          setCameraId(devices[0].id);
        } else {
          setCameraError('No camera devices detected. You can use manual code entry or file upload below.');
        }
      })
      .catch(err => {
        if (!isMountedRef.current) return;
        console.warn('Camera permission or availability warning:', err);
        setCameraError('Camera access unavailable in current view. You can use manual code entry.');
      });

    return () => {
      isMountedRef.current = false;
      if (html5QrCodeRef.current) {
        if (isScanningRef.current) {
          isScanningRef.current = false;
          html5QrCodeRef.current
            .stop()
            .then(() => {
              try {
                html5QrCodeRef.current?.clear();
              } catch {}
            })
            .catch(() => {});
        } else {
          try {
            html5QrCodeRef.current.clear();
          } catch {}
        }
      }
    };
  }, []);

  useEffect(() => {
    if (isActive && cameraId && !scanning && !manualMode) {
      startScanning();
    } else if ((!isActive || manualMode) && scanning) {
      stopScanning();
    }
  }, [isActive, cameraId, manualMode]);

  const playBeep = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880; // High beep
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  const startScanning = async () => {
    if (!cameraId || isScanningRef.current) return;
    try {
      // Ensure target element is in DOM
      const container = document.getElementById(scannerContainerId.current);
      if (!container) return;

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId.current);
      }

      await html5QrCodeRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        decodedText => {
          playBeep();
          onScan(decodedText);
        },
        () => {}
      );

      if (isMountedRef.current) {
        isScanningRef.current = true;
        setScanning(true);
        setCameraError(null);
      } else {
        // If unmounted during async start
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop();
            html5QrCodeRef.current.clear();
          } catch {}
        }
      }
    } catch (err: any) {
      console.warn('Error starting camera stream:', err);
      if (isMountedRef.current) {
        setScanning(false);
        isScanningRef.current = false;
        setCameraError('Could not start video stream. Camera may be blocked by iframe permissions or in use.');
      }
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current && isScanningRef.current) {
      isScanningRef.current = false;
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      } finally {
        if (isMountedRef.current) {
          setScanning(false);
        }
      }
    }
  };

  const flipCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === cameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    await stopScanning();
    setCameraId(cameras[nextIndex].id);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      playBeep();
      onScan(manualCode.trim().toUpperCase());
      setManualCode('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    const toastId = toast.loading('Reading QR code from image...');

    try {
      const decodedCode = await decodeQRCodeFromImage(file);
      playBeep();
      toast.success(`QR Decoded: ${decodedCode}`, { id: toastId });
      onScan(decodedCode);
    } catch (err: any) {
      console.warn('QR image decoding error:', err);
      toast.error(err?.message || 'Could not detect a QR code in the uploaded image. Please try a clearer image.', { id: toastId });
    } finally {
      setIsProcessingFile(false);
      e.target.value = '';
    }
  };

  return (
    <div className="relative w-full space-y-4">
      {/* Scanner Box Container */}
      <div className={`relative rounded-2xl overflow-hidden min-h-[300px] flex items-center justify-center transition-all ${
        theme === 'light'
          ? 'border-2 border-emerald-500 bg-slate-900 shadow-xl'
          : 'border border-slate-700 bg-slate-900 shadow-2xl'
      }`}>
        {/* Dedicated DOM node exclusively for Html5Qrcode - NO REACT CHILDREN EVER */}
        <div id={scannerContainerId.current} className="w-full h-full min-h-[300px]" />

        {/* Placeholder / Error overlay rendered as separate sibling with pointer-events-none */}
        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 p-8 text-center pointer-events-none z-10">
            <div className="space-y-3 max-w-xs">
              <Camera className="w-12 h-12 mx-auto text-emerald-500 animate-pulse" />
              <p className="text-sm font-medium text-slate-300">
                {cameraError ? cameraError : 'Initializing camera scanner...'}
              </p>
              {cameraError && (
                <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-800/40">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Use manual code or image upload below</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Processing Image Overlay */}
        {isProcessingFile && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/85 backdrop-blur-xs z-20 pointer-events-none">
            <div className="p-4 bg-white/95 rounded-2xl shadow-xl flex items-center gap-3 text-slate-800 font-semibold text-sm border border-emerald-300">
              <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
              <span>Decoding uploaded QR image...</span>
            </div>
          </div>
        )}

        {/* Scan line overlay when actively scanning */}
        {scanning && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
            <div className="w-64 h-64 border-2 border-emerald-400/80 rounded-2xl relative overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent scan-animation" />
              {/* Corner brackets */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border ${
        theme === 'light'
          ? 'bg-white border-slate-200/90 shadow-2xs'
          : 'bg-slate-800/80 border-slate-700/80'
      }`}>
        <div className="flex items-center gap-2">
          {cameras.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={flipCamera}
              className={theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Flip Camera
            </Button>
          )}

          <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            theme === 'light'
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          }`}>
            {isProcessingFile ? (
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-emerald-600" />
            )}
            <span>{isProcessingFile ? 'Decoding Image...' : 'Upload QR Image'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isProcessingFile}
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {!hideManualEntry && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setManualMode(!manualMode)}
            className={theme === 'light' ? 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50' : 'text-slate-300 hover:text-white hover:bg-slate-700'}
          >
            <Keyboard className="w-4 h-4 mr-1.5" />
            {manualMode ? 'Switch to Camera' : 'Manual Code Entry'}
          </Button>
        )}
      </div>

      {/* Manual Code Input Bar (Only shown when hideManualEntry is false) */}
      {!hideManualEntry && (
        <form onSubmit={handleManualSubmit} className={`flex gap-2 p-4 rounded-2xl border shadow-xs ${
          theme === 'light'
            ? 'bg-white border-slate-200/90'
            : 'bg-slate-800/90 border-slate-700 shadow-md'
        }`}>
          <div className="relative flex-1">
            <Input
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder="Type Student Code (e.g., SITE01, ACS01) & press Enter..."
              className={theme === 'light'
                ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 font-mono tracking-wider focus-visible:ring-emerald-500'
                : 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 font-mono tracking-wider focus-visible:ring-emerald-500'
              }
            />
          </div>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shrink-0 px-5 shadow-xs">
            {submitLabel}
          </Button>
        </form>
      )}
    </div>
  );
};
