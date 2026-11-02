import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Trophy, FileCheck, Calendar, Download, AlertCircle, Bell, ArrowRight, Clock, Award } from 'lucide-react';
import { Navbar } from '../../components/Navbar.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { clearanceAPI, attendanceAPI, announcementAPI } from '../../utils/api.ts';
import { getUser } from '../../utils/auth.ts';
import { toast } from 'sonner';

export const StudentDashboard: React.FC = () => {
  const [user, setUserState] = useState(getUser());
  const [clearance, setClearance] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const handleUserUpdate = () => setUserState(getUser());
    window.addEventListener('auth_user_updated', handleUserUpdate);
    return () => window.removeEventListener('auth_user_updated', handleUserUpdate);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clearanceRes, attendanceRes, annRes] = await Promise.all([
        clearanceAPI.get(),
        user?.student_code ? attendanceAPI.getStudentAttendance(user.student_code) : Promise.resolve({ data: [] }),
        announcementAPI.getAll().catch(() => ({ data: [] }))
      ]);

      setClearance(clearanceRes.data);
      setAttendance(attendanceRes.data);
      setAnnouncements(annRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!user?.qr_code) {
      toast.error('No QR code available for this profile');
      return;
    }
    const link = document.createElement('a');
    link.href = user.qr_code.startsWith('data:')
      ? user.qr_code
      : `data:image/png;base64,${user.qr_code}`;
    link.download = `${user.student_code || 'student'}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('QR Code downloaded successfully!');
  };

  const totalPoints = clearance?.total_points || user?.total_points || 0;
  const requiredPoints = clearance?.required_points || 50;
  const progressPercent = Math.min(Math.round((totalPoints / requiredPoints) * 100), 100);
  const isCleared = clearance?.clearance_status === 'cleared' || totalPoints >= requiredPoints;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Welcome Header with User Photo around Name & Student Code */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/50 p-0.5 bg-white shadow-sm shrink-0 flex items-center justify-center">
              {user?.photo ? (
                <img
                  src={user.photo}
                  alt={user?.name || 'Student Profile'}
                  className="w-full h-full object-cover rounded-xl"
                  data-testid="student-avatar"
                />
              ) : (
                <div className="w-full h-full bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 font-bold text-xl">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight" data-testid="dashboard-title">
                Welcome, {user?.name}!
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600 mt-2 font-medium">
                <span>Code: <strong className="font-mono text-emerald-600 font-bold">{user?.student_code || 'N/A'}</strong></span>
                <span className="text-slate-300">·</span>
                <span>ID: <strong className="font-mono text-slate-800">{user?.student_id || 'Not Assigned'}</strong></span>
                <span className="text-slate-300">·</span>
                <span>Year: <strong className="text-slate-800">{user?.year_level || '1st Year'}</strong></span>
                <span className="text-slate-300">·</span>
                <span>Org: <strong className="text-slate-800">{user?.organization || 'College of Sciences'}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/student/clearance">
              <Button variant="outline" className="text-xs font-semibold">
                View Clearance
              </Button>
            </Link>
            <Link to="/student/profile">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold">
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Your QR Code */}
          <Card className="glass-card flex flex-col justify-between" data-testid="qr-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-slate-900 font-bold">
                <QrCode className="w-5 h-5 text-emerald-600" />
                Your QR Pass
              </CardTitle>
              <CardDescription className="text-xs">
                Scan this code at event gates for instant TIMEIN & TIMEOUT.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4 pt-2">
              {user?.qr_code ? (
                <div className="p-3 bg-white border-2 border-emerald-500/80 rounded-2xl shadow-sm hover:scale-105 transition-transform duration-200">
                  <img
                    src={user.qr_code.startsWith('data:') ? user.qr_code : `data:image/png;base64,${user.qr_code}`}
                    alt="Student QR Code"
                    className="w-44 h-44 object-contain"
                  />
                </div>
              ) : (
                <div className="w-44 h-44 flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 text-xs text-center p-4">
                  QR Code not generated
                </div>
              )}
              <Button
                onClick={downloadQRCode}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl shadow-xs"
                data-testid="download-qr-button"
              >
                <Download className="w-4 h-4 mr-2" />
                Download QR Code
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Total Points */}
          <Card className="glass-card flex flex-col justify-between" data-testid="points-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-slate-900 font-bold">
                <Trophy className="w-5 h-5 text-amber-500" />
                Clearance Points
              </CardTitle>
              <CardDescription className="text-xs">
                Points accrued from verified event attendance and bonuses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 text-center">
              <div className="py-2">
                <div className="text-5xl font-mono font-extrabold text-emerald-600 tracking-tight">
                  {totalPoints}
                </div>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                  Points Earned
                </p>
              </div>

              <div className="space-y-1.5 text-left bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                <div className="flex justify-between text-xs text-slate-600 font-semibold">
                  <span>Requirement: {requiredPoints} pts</span>
                  <span className="font-mono">{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  {totalPoints >= requiredPoints
                    ? '🎉 Goal achieved! You meet the points requirement.'
                    : `Need ${requiredPoints - totalPoints} more points to satisfy semestral clearance.`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Clearance Status */}
          <Card className="glass-card flex flex-col justify-between" data-testid="clearance-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-slate-900 font-bold">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                Clearance Status
              </CardTitle>
              <CardDescription className="text-xs">
                Official institutional standing for academic clearance.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-4 space-y-4">
              <div>
                <span
                  className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider ${
                    isCleared
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {isCleared ? '✓ Cleared for Semester' : '⏳ Pending Requirements'}
                </span>
              </div>

              <p className="text-xs text-slate-600 px-2 leading-relaxed">
                {isCleared
                  ? 'All event participation and clearance requirements have been fulfilled.'
                  : 'Complete attendance for remaining scheduled campus events or earn bonus points.'}
              </p>

              <Link to="/student/clearance" className="block w-full">
                <Button variant="outline" className="w-full text-xs font-semibold" data-testid="view-clearance-button">
                  View Detailed Clearance Form
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Announcements Section */}
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
              {announcements.length > 2 && (
                <button
                  type="button"
                  onClick={() => setShowAllAnnouncements(!showAllAnnouncements)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  {showAllAnnouncements ? 'Show less' : `View all (${announcements.length})`}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(showAllAnnouncements ? announcements : announcements.slice(0, 2)).map((ann: any) => (
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

        {/* Attendance History Card */}
        <Card className="glass-card" data-testid="recent-attendance-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-slate-900 font-bold">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Recent Attendance History
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Verified logs of your event check-ins and check-outs with timestamps.
              </CardDescription>
            </div>
            <span className="text-xs font-semibold text-slate-500 font-mono">
              Total Records: {attendance.length}
            </span>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-center text-slate-500 py-8 text-sm">Loading attendance records...</p>
            ) : attendance.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Clock className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-slate-600 font-semibold text-sm">No attendance records logged yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Attend campus events and present your personal QR pass to event officers to earn clearance credits.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {attendance.map((record: any) => (
                  <div
                    key={record.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs gap-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900 text-sm">{record.event_name}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(record.timestamp).toLocaleString()}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-semibold text-emerald-700">+{record.points} Points</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          record.mode === 'TIMEIN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {record.mode}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          record.status === 'ON_TIME'
                            ? 'bg-slate-100 text-slate-700'
                            : record.status === 'LATE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
