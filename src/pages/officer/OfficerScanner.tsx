import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, ScanLine, Radio, Volume2, Calendar, User, Sparkles, AlertCircle, MapPin, Award } from 'lucide-react';
import { Navbar } from '../../components/Navbar.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select.tsx';
import { QRScanner } from '../../components/QRScanner.tsx';
import { NFCReader } from '../../components/NFCReader.tsx';
import { eventAPI, attendanceAPI } from '../../utils/api.ts';
import { toast } from 'sonner';

export const OfficerScanner: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlParamEventId = searchParams.get('eventId') || searchParams.get('event');

  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [mode, setMode] = useState<'TIMEIN' | 'TIMEOUT'>('TIMEIN');
  const [scanMethod, setScanMethod] = useState<'qr' | 'nfc'>('qr');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastScanned, setLastScanned] = useState<any>(null);
  const [sessionLogs, setSessionLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    fetchEvents();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      // Try active events first
      const { data } = await eventAPI.getAll(true);
      let list = data || [];

      // If no active events, fetch all events so the officer can still pick an event
      if (list.length === 0) {
        const allRes = await eventAPI.getAll(false);
        list = allRes.data || [];
      }

      setEvents(list);

      // Pre-select event from URL or first in list
      if (urlParamEventId && list.some((e: any) => e.id === urlParamEventId)) {
        setSelectedEventId(urlParamEventId);
      } else if (list.length > 0) {
        setSelectedEventId(list[0].id);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode: 'TIMEIN' | 'TIMEOUT') => {
    setMode(newMode);
    toast.success(`Switched to ${newMode} mode. Next scans will record ${newMode}.`);
  };

  const handleScan = async (code: string) => {
    let targetEvent = selectedEventId;
    if (!targetEvent && events.length > 0) {
      targetEvent = events[0].id;
      setSelectedEventId(targetEvent);
    }

    if (!targetEvent) {
      toast.error('Please select a target event first');
      return;
    }

    try {
      const cleanCode = (code || '').trim();
      const payload: any = {
        event_id: targetEvent,
        mode
      };

      if (scanMethod === 'qr') {
        payload.student_code = cleanCode;
      } else {
        payload.nfc_id = cleanCode;
      }

      const { data } = await attendanceAPI.record(payload);

      setLastScanned(data);
      setShowSuccess(true);
      setSessionLogs(prev => [data, ...prev]);

      toast.success(`${data.student_name} (${data.student_code}) · ${mode} Recorded! (+${data.points} pts)`);

      // Hold student profile popup on screen for at least 3 seconds (auto-dismisses or dismiss on click)
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setShowSuccess(false);
      }, 3500);
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.message || 'Error recording attendance';
      toast.error(detail);
    }
  };

  const activeEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <Navbar />

      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-3">
            <Link to="/officer/dashboard">
              <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl shadow-xs" data-testid="back-button">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <ScanLine className="w-6 h-6 text-emerald-600" />
                Gate Attendance Scanner
              </h1>
              <p className="text-xs text-slate-500">Position the QR code within the target box or use manual entry.</p>
            </div>
          </div>

          {/* TIMEIN / TIMEOUT Mode Switcher */}
          <div className="flex items-center gap-2 bg-slate-200/80 p-1 rounded-xl border border-slate-300/80">
            <button
              type="button"
              onClick={() => handleModeChange('TIMEIN')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'TIMEIN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              data-testid="mode-timein-btn"
            >
              TIME-IN MODE
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('TIMEOUT')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'TIMEOUT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              data-testid="mode-timeout-btn"
            >
              TIME-OUT MODE
            </button>
          </div>
        </div>

        {/* Target Event Selection & Display Showcase */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Target Event:
              </label>

              {loading ? (
                <div className="h-11 bg-slate-100 border border-slate-200 rounded-lg animate-pulse flex items-center px-4 text-xs text-slate-500">
                  Loading available events...
                </div>
              ) : events.length > 0 ? (
                <Select value={selectedEventId} onValueChange={(val: string) => setSelectedEventId(val)}>
                  <SelectTrigger
                    className="bg-white border-slate-300 text-slate-900 h-11 text-sm font-semibold hover:border-emerald-500 focus:ring-emerald-500 shadow-2xs"
                    data-testid="target-event-trigger"
                  >
                    <SelectValue placeholder="Select Target Event">
                      {activeEvent ? `${activeEvent.name} — ${activeEvent.date}` : 'Select Target Event'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900 shadow-xl">
                    {events.map(ev => (
                      <SelectItem
                        key={ev.id}
                        value={ev.id}
                        className="text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 py-2.5 px-3 border-b border-slate-100 last:border-b-0 cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-bold text-slate-900">{ev.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">({ev.date} · {ev.venue})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>No events currently registered. Please create an event in the Admin dashboard.</span>
                </div>
              )}
            </div>
          </div>

          {/* Prominent Active Event Details Banner */}
          {activeEvent ? (
            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in shadow-2xs">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white uppercase tracking-wider shadow-2xs">
                    Currently Selected Target Event
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white text-emerald-950 border border-emerald-200 font-mono">
                    {activeEvent.organization || 'College of Sciences'}
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-emerald-200 font-mono">
                    {activeEvent.semester || 'Current Semester'}
                  </span>
                </div>

                <h2 className="text-xl font-heading font-extrabold text-slate-900 tracking-tight">
                  {activeEvent.name}
                </h2>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1 text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <strong>Date:</strong> {activeEvent.date} ({activeEvent.start_time} - {activeEvent.end_time})
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <strong>Venue:</strong> {activeEvent.venue || 'Campus Grounds'}
                  </span>
                </div>
              </div>

              {/* Point Allocation Badges */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200/80 text-center min-w-[70px] shadow-xs">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Time-In</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">+{activeEvent.timein_points || 5} pts</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200/80 text-center min-w-[70px] shadow-xs">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Time-Out</span>
                  <span className="font-mono font-bold text-blue-700 text-sm">+{activeEvent.timeout_points || 5} pts</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200/80 text-center min-w-[70px] shadow-xs">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total</span>
                  <span className="font-mono font-bold text-amber-700 text-sm">{activeEvent.points || 10} pts</span>
                </div>
              </div>
            </div>
          ) : (
            !loading && (
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                Please choose a target event from the dropdown above to begin recording attendance.
              </div>
            )
          )}
        </div>

        {/* Student Profile & Attendance Verification Modal (Displays for at least 2-3 seconds) */}
        {showSuccess && lastScanned && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => {
              if (timerRef.current) clearTimeout(timerRef.current);
              setShowSuccess(false);
            }}
          >
            <div
              className="relative w-full max-w-md bg-white border-2 border-emerald-500 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Header Status Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs uppercase tracking-wider shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {lastScanned.mode === 'TIMEIN' ? 'Time-In Verified & Recorded' : 'Time-Out Verified & Recorded'}
              </div>

              {/* Student Profile Photo with Glowing Verification Ring */}
              <div className="relative mx-auto w-28 h-28 sm:w-32 sm:h-32">
                <div className="w-full h-full rounded-2xl overflow-hidden border-4 border-emerald-500 bg-white shadow-md flex items-center justify-center p-0.5">
                  {lastScanned.student_photo ? (
                    <img
                      src={lastScanned.student_photo}
                      alt={lastScanned.student_name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 font-heading font-extrabold text-4xl">
                      {lastScanned.student_name ? lastScanned.student_name.charAt(0).toUpperCase() : 'S'}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1.5 rounded-full shadow-lg border-2 border-white">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              {/* Student Name & Identifiers */}
              <div className="space-y-1">
                <h3 className="text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
                  {lastScanned.student_name}
                </h3>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs pt-0.5">
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                    {lastScanned.student_code}
                  </span>
                  {lastScanned.student_id && (
                    <span className="font-mono text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                      ID: {lastScanned.student_id}
                    </span>
                  )}
                  {lastScanned.student_year && (
                    <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      {lastScanned.student_year}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-semibold pt-1">
                  {lastScanned.student_org || 'College of Sciences'}
                </p>
              </div>

              {/* Attendance & Points Verified Box */}
              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/90 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Target Event:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[210px] text-right">
                    {lastScanned.event_name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Clearance Points Earned:</span>
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    +{lastScanned.points} pts
                  </span>
                </div>
                {lastScanned.total_points !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Total Clearance Points:</span>
                    <span className="font-mono font-bold text-amber-700">
                      {lastScanned.total_points} pts
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(lastScanned.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Progress Timer & Next Button */}
              <div className="space-y-2 pt-1">
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-full animate-shrink" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Student profile confirmed · showing for 3s</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (timerRef.current) clearTimeout(timerRef.current);
                      setShowSuccess(false);
                    }}
                    className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                  >
                    Scan Next Student →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scanner Body: Left is Scanner Camera, Right is Active Session Scans */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScanMethod('qr')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    scanMethod === 'qr'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  data-testid="method-qr-btn"
                >
                  <ScanLine className="w-4 h-4" />
                  QR Scanner
                </button>
                <button
                  type="button"
                  onClick={() => setScanMethod('nfc')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    scanMethod === 'nfc'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  data-testid="method-nfc-btn"
                >
                  <Radio className="w-4 h-4" />
                  NFC Reader
                </button>
              </div>

              <span className="text-xs text-slate-500 font-medium">
                Current Mode: <strong className={mode === 'TIMEIN' ? 'text-emerald-700 font-bold' : 'text-blue-700 font-bold'}>{mode}</strong>
              </span>
            </div>

            {scanMethod === 'qr' ? (
              <QRScanner onScan={handleScan} isActive={true} submitLabel="Record Attendance" theme="light" />
            ) : (
              <NFCReader onScan={handleScan} isActive={true} theme="light" />
            )}
          </div>

          {/* Right Column: Scans recorded in this session */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs h-full flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Session Scan Logs
                </h3>
                <span className="text-xs font-mono bg-emerald-50 px-2.5 py-0.5 rounded-full text-emerald-800 font-bold border border-emerald-200">
                  {sessionLogs.length} Checked In
                </span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[480px] space-y-2 pt-3">
                {sessionLogs.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <User className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs text-slate-600 font-medium">No students scanned in this session yet.</p>
                    <p className="text-[11px] text-slate-400">Scan student passes or enter codes to see them appear here in real time.</p>
                  </div>
                ) : (
                  sessionLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 hover:bg-emerald-50/40 transition-colors rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{log.student_name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono text-emerald-700 font-bold">{log.student_code}</span>
                          <span>·</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.mode === 'TIMEIN'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {log.mode}
                        </span>
                        <div className="text-[10px] font-mono text-emerald-700 font-bold mt-1">
                          +{log.points} pts
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
