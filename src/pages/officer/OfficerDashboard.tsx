import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ScanLine, Users, Clock, Calendar, CheckCircle2, FileDown, Bell, AlertCircle, Plus, User as UserIcon } from 'lucide-react';
import { Navbar } from '../../components/Navbar.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { attendanceAPI, eventAPI, announcementAPI, adminAPI } from '../../utils/api.ts';
import { getUser } from '../../utils/auth.ts';
import { toast } from 'sonner';

export const OfficerDashboard: React.FC = () => {
  const [user, setUserState] = useState(getUser());
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const handleUserUpdate = () => setUserState(getUser());
    window.addEventListener('auth_user_updated', handleUserUpdate);
    const interval = setInterval(fetchRecent, 10000);
    return () => {
      window.removeEventListener('auth_user_updated', handleUserUpdate);
      clearInterval(interval);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recentRes, eventsRes, annRes] = await Promise.all([
        attendanceAPI.getRecent(15),
        eventAPI.getAll(true),
        announcementAPI.getAll().catch(() => ({ data: [] }))
      ]);
      setRecentAttendance(recentRes.data);
      setActiveEvents(eventsRes.data);
      setAnnouncements(annRes.data || []);
    } catch (error) {
      console.error('Failed to load officer dashboard data:', error);
      toast.error('Failed to load recent attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecent = async () => {
    try {
      const { data } = await attendanceAPI.getRecent(15);
      setRecentAttendance(data);
    } catch (e) {
      // silent background poll error
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await adminAPI.exportAttendance();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Attendance records exported to CSV!');
    } catch (err) {
      toast.error('Failed to export attendance');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header with Photo around Name & Officer Code */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/50 p-0.5 bg-white shadow-sm shrink-0 flex items-center justify-center">
              {user?.photo ? (
                <img
                  src={user.photo}
                  alt={user?.name || 'Officer'}
                  className="w-full h-full object-cover rounded-xl"
                  data-testid="officer-avatar"
                />
              ) : (
                <div className="w-full h-full bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 font-bold text-xl">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'O'}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight" data-testid="officer-dashboard-title">
                  Welcome, {user?.name || 'Officer'}!
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  CSG Officer
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600 mt-2 font-medium">
                <span>Code / Email: <strong className="font-mono text-emerald-600 font-bold">{user?.student_code || user?.email}</strong></span>
                <span className="text-slate-300">·</span>
                <span>Department: <strong className="text-slate-800">College of Sciences · College Student Government (CSG)</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/officer/profile">
              <Button
                variant="outline"
                className="text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-400 shadow-xs"
                data-testid="officer-edit-profile-btn"
              >
                <UserIcon className="w-4 h-4 mr-1.5 text-emerald-700" />
                Edit Profile
              </Button>
            </Link>
            <Button onClick={handleExportCSV} variant="outline" className="text-xs font-semibold">
              <FileDown className="w-4 h-4 mr-1.5 text-slate-600" />
              Export Logs
            </Button>
            <Link to="/officer/scanner">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs">
                <ScanLine className="w-4 h-4 mr-1.5" />
                Launch QR Scanner
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: QR Scanner Action */}
          <Link to="/officer/scanner" className="block md:col-span-1">
            <Card
              className="glass-card hover:shadow-xl transition-all duration-200 border-emerald-500/30 hover:border-emerald-500 cursor-pointer group h-full flex flex-col justify-between"
              data-testid="scanner-card"
            >
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform">
                    <ScanLine className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full uppercase">
                    Ready to Scan
                  </span>
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Open QR Scanner
                </CardTitle>
                <CardDescription className="text-slate-600 text-xs leading-relaxed">
                  Fast camera scanning with automatic verification, TIMEIN & TIMEOUT modes, and offline manual entry.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-md shadow-emerald-600/20 text-xs"
                  data-testid="open-scanner-button"
                >
                  <ScanLine className="w-4 h-4 mr-2" />
                  Launch Scanner Console
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Card 2: Officer Profile & Photo */}
          <Link to="/officer/profile" className="block md:col-span-1">
            <Card
              className="glass-card hover:shadow-xl transition-all duration-200 border-emerald-500/30 hover:border-emerald-500 cursor-pointer group h-full flex flex-col justify-between"
              data-testid="officer-profile-card"
            >
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform">
                    <UserIcon className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full uppercase">
                    Profile & Photo
                  </span>
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Officer Profile
                </CardTitle>
                <CardDescription className="text-slate-600 text-xs leading-relaxed">
                  Upload your officer ID photo, edit your full name and contact number, or update your password.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Button
                  variant="outline"
                  className="w-full border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 font-bold py-2.5 rounded-xl text-xs"
                  data-testid="open-officer-profile-button"
                >
                  <UserIcon className="w-4 h-4 mr-2 text-amber-700" />
                  Edit Profile & Photo
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Card 3: Active Events Overview */}
          <Card className="glass-card flex flex-col justify-between md:col-span-1">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <Calendar className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full uppercase">
                  {activeEvents.length} Events
                </span>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">
                Today's Events
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Scheduled events accepting student attendance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {activeEvents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No active events open right now.</p>
              ) : (
                activeEvents.map((ev: any) => (
                  <Link
                    key={ev.id}
                    to={`/officer/scanner?eventId=${ev.id}`}
                    className="p-2.5 bg-white hover:bg-emerald-50/70 rounded-xl border border-slate-200/80 hover:border-emerald-300 flex justify-between items-center text-xs transition-all group shadow-2xs"
                    title={`Scan attendance for ${ev.name}`}
                  >
                    <div className="truncate mr-2">
                      <p className="font-bold text-slate-900 group-hover:text-emerald-700 truncate">{ev.name}</p>
                      <p className="text-slate-500 text-[10px] truncate">{ev.venue} · {ev.date}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                        {ev.points} pts
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white px-1.5 py-0.5 rounded transition-colors">
                        Scan →
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Campus Announcements */}
        {announcements.length > 0 && (
          <div className="bg-linear-to-r from-amber-50/70 via-white to-amber-50/40 border border-amber-200/90 rounded-2xl p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                <Bell className="w-4 h-4 text-amber-600" />
                Official Campus Announcements
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {announcements.length} {announcements.length === 1 ? 'Notice' : 'Notices'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {announcements.slice(0, 2).map((ann: any) => (
                <div key={ann.id} className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-2xs space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {ann.organization || 'College of Sciences'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        ann.priority === 'urgent'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : ann.priority === 'high'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                      }`}>
                        {ann.priority || 'Notice'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{ann.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{ann.content}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>Posted by {ann.created_by || 'Admin'}</span>
                    <span>{new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Attendance Activity Feed */}
        <Card className="glass-card" data-testid="recent-attendance-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Live Attendance Feed
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Real-time log of scanned students (auto-refreshes every 10 seconds).
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Feed
              </span>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-slate-500 text-sm">Loading attendance stream...</p>
            ) : recentAttendance.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-slate-600 font-semibold text-sm">No recent attendance recorded</p>
                <p className="text-xs text-slate-400">Launch the scanner to record incoming students.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-600 uppercase bg-slate-50/50">
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Student Code</th>
                      <th className="p-3">Event</th>
                      <th className="p-3">Mode</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Points</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentAttendance.map((rec: any) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">{rec.student_name}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700 text-xs">{rec.student_code}</td>
                        <td className="p-3 text-xs text-slate-700">{rec.event_name}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase ${
                              rec.mode === 'TIMEIN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {rec.mode}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs text-slate-500">
                          {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-600">+{rec.points}</td>
                        <td className="p-3 text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
