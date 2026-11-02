import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Shield, Calendar, CheckSquare, Settings, ArrowRight, Activity, Plus, BarChart3, Clock, AlertTriangle, User as UserIcon, Megaphone } from 'lucide-react';
import { Navbar } from '../../components/Navbar.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog.tsx';
import { adminAPI, announcementAPI } from '../../utils/api.ts';
import { getUser } from '../../utils/auth.ts';
import { toast } from 'sonner';

export const AdminDashboard: React.FC = () => {
  const [user, setUserState] = useState(getUser());
  const [analytics, setAnalytics] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [semesterDetails, setSemesterDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    const handleUserUpdate = () => setUserState(getUser());
    window.addEventListener('auth_user_updated', handleUserUpdate);
    return () => window.removeEventListener('auth_user_updated', handleUserUpdate);
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, announcementsRes] = await Promise.all([
        adminAPI.getAnalytics(),
        announcementAPI.getAll().catch(() => ({ data: [] }))
      ]);
      setAnalytics(analyticsRes.data);
      setAnnouncements(announcementsRes.data || []);
    } catch (error) {
      console.error('Failed to load admin analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleSemesterClick = async (semester: string) => {
    setSelectedSemester(semester);
    setDialogOpen(true);
    setDetailsLoading(true);
    try {
      const { data } = await adminAPI.getSemesterDetails(semester);
      setSemesterDetails(data);
    } catch (error) {
      console.error('Failed to load semester details:', error);
      toast.error('Failed to load semester details');
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header with Photo around Name & Admin Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/50 p-0.5 bg-white shadow-sm shrink-0 flex items-center justify-center">
              {user?.photo ? (
                <img
                  src={user.photo}
                  alt={user?.name || 'Admin'}
                  className="w-full h-full object-cover rounded-xl"
                  data-testid="admin-avatar"
                />
              ) : (
                <div className="w-full h-full bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 font-bold text-xl">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight" data-testid="admin-dashboard-title">
                  Welcome, {user?.name || 'Administrator'}!
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Master Admin
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600 mt-2 font-medium">
                <span>Account: <strong className="font-mono text-emerald-600 font-bold">{user?.email || 'admin@attendance.edu'}</strong></span>
                <span className="text-slate-300">·</span>
                <span>Role: <strong className="text-slate-800">Master Administrator</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin/profile">
              <Button variant="outline" className="text-xs font-semibold border-emerald-500/30 text-emerald-800 hover:bg-emerald-50">
                <UserIcon className="w-4 h-4 mr-1.5" />
                Edit Profile
              </Button>
            </Link>
            <Link to="/admin/announcements">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-xs">
                <Megaphone className="w-4 h-4 mr-1.5" />
                Post Announcement
              </Button>
            </Link>
            <Link to="/admin/events">
              <Button variant="outline" className="text-xs font-semibold border-emerald-500/30 text-emerald-800 hover:bg-emerald-50">
                <Plus className="w-4 h-4 mr-1.5" />
                New Event
              </Button>
            </Link>
            <Link to="/admin/settings">
              <Button variant="outline" className="text-xs font-semibold">
                <Settings className="w-4 h-4 mr-1.5" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card" data-testid="students-stat">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Students
              </CardTitle>
              <Users className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-extrabold text-slate-900">
                {analytics?.total_students ?? (loading ? '—' : 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Registered student profiles</p>
            </CardContent>
          </Card>

          <Card className="glass-card" data-testid="officers-stat">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Officers
              </CardTitle>
              <Shield className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-extrabold text-slate-900">
                {analytics?.total_officers ?? (loading ? '—' : 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Authorized gate scanners</p>
            </CardContent>
          </Card>

          <Card className="glass-card" data-testid="events-stat">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Events
              </CardTitle>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-extrabold text-slate-900">
                {analytics?.total_events ?? (loading ? '—' : 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Academic events logged</p>
            </CardContent>
          </Card>

          <Card className="glass-card" data-testid="attendance-stat">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Attendance
              </CardTitle>
              <CheckSquare className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-extrabold text-slate-900">
                {analytics?.total_attendance ?? (loading ? '—' : 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Verified check-in records</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Management Navigation Grid */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-800">System Management Sections</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <Link to="/admin/announcements" className="block">
              <Card className="glass-card hover:shadow-lg hover:border-emerald-500/50 transition-all cursor-pointer h-full border-emerald-500/30">
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-2">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900">Announcements</CardTitle>
                  <CardDescription className="text-xs">
                    Broadcast official news, guidelines, and notices to student dashboards.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/admin/events" className="block">
              <Card className="glass-card hover:shadow-lg hover:border-emerald-500/50 transition-all cursor-pointer h-full">
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-2">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900">Events Management</CardTitle>
                  <CardDescription className="text-xs">
                    Schedule events, assign clearance points, and export attendance.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/admin/students" className="block">
              <Card className="glass-card hover:shadow-lg hover:border-emerald-500/50 transition-all cursor-pointer h-full">
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 mb-2">
                    <Users className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900">Student Directory</CardTitle>
                  <CardDescription className="text-xs">
                    Search and filter students, freeze/unfreeze accounts, and award points.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/admin/officers" className="block">
              <Card className="glass-card hover:shadow-lg hover:border-emerald-500/50 transition-all cursor-pointer h-full">
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 mb-2">
                    <Shield className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900">Officer Accounts</CardTitle>
                  <CardDescription className="text-xs">
                    Authorize officers, freeze/unfreeze scanner privileges, and manage CSG.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/admin/admins" className="block">
              <Card className="glass-card hover:shadow-lg hover:border-emerald-500/50 transition-all cursor-pointer h-full">
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 mb-2">
                    <Settings className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900">Admin Accounts</CardTitle>
                  <CardDescription className="text-xs">
                    Manage system administrators, freeze/unfreeze accounts, and view logs.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>

        {/* Official Campus Announcements Broadcast Panel */}
        <div className="bg-linear-to-r from-emerald-50/70 via-white to-emerald-50/40 p-6 rounded-2xl border border-emerald-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Official Campus Announcements (Broadcast)</h3>
                <p className="text-xs text-slate-500 font-medium">Broadcasted directly across all Student & Officer dashboards.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/admin/announcements">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Post Announcement
                </Button>
              </Link>
              <Link to="/admin/announcements">
                <Button size="sm" variant="outline" className="text-xs font-semibold">
                  Manage All ({announcements.length})
                </Button>
              </Link>
            </div>
          </div>

          {announcements.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-dashed border-emerald-300 text-center space-y-2">
              <p className="text-xs text-slate-500">No campus announcements posted yet.</p>
              <Link to="/admin/announcements">
                <Button size="sm" variant="outline" className="text-xs text-emerald-700 border-emerald-300">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create First Announcement
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {announcements.slice(0, 3).map((ann: any) => (
                <div key={ann.id} className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {ann.organization || 'College of Sciences'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        ann.priority === 'urgent' ? 'bg-rose-100 text-rose-800' : ann.priority === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {ann.priority || 'Notice'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{ann.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2">{ann.content}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>By {ann.created_by}</span>
                    <Link to="/admin/announcements" className="text-emerald-700 font-semibold hover:underline flex items-center">
                      Manage →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Semesters & Recent Audit Activity Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Semesters Card */}
          <Card className="glass-card lg:col-span-5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Semesters Overview
              </CardTitle>
              <CardDescription className="text-xs">
                Select an academic semester to view detailed statistics and event participation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(analytics?.semesters || []).map((sem: string) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => handleSemesterClick(sem)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-emerald-50/70 border border-slate-200/80 transition-colors text-left text-xs group"
                >
                  <span className="font-semibold text-slate-800 group-hover:text-emerald-800">{sem}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Audit Trail Card */}
          <Card className="glass-card lg:col-span-7">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Recent System Audit Logs
                </CardTitle>
                <CardDescription className="text-xs">
                  Immutable audit trail of administrative and operational actions.
                </CardDescription>
              </div>
              <Link to="/admin/admins">
                <Button variant="ghost" size="sm" className="text-xs text-emerald-700">View All Logs</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-slate-400 text-xs">Loading audit trail...</p>
              ) : (analytics?.recent_activity || []).length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">No audit logs recorded.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {(analytics?.recent_activity || []).map((log: any) => (
                    <div key={log.id} className="p-2.5 bg-white rounded-lg border border-slate-200/80 text-xs flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{log.action}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            {log.user_name || 'System'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{log.details}</p>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Semester Details Modal */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{selectedSemester}</DialogTitle>
              <DialogDescription className="text-xs">
                Performance breakdown and event listing for this academic period.
              </DialogDescription>
            </DialogHeader>

            {detailsLoading ? (
              <p className="text-center py-8 text-sm text-slate-500">Loading semester data...</p>
            ) : semesterDetails ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold uppercase">Total Events</span>
                    <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{semesterDetails.total_events}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold uppercase">Total Attendance</span>
                    <p className="text-2xl font-mono font-bold text-emerald-600 mt-1">{semesterDetails.total_attendance}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Scheduled Events</h4>
                  {semesterDetails.events?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No events recorded for this semester.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {semesterDetails.events.map((ev: any) => (
                        <div key={ev.id} className="p-2.5 bg-slate-50 rounded-lg text-xs flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-900">{ev.name}</p>
                            <p className="text-[11px] text-slate-500">{ev.date} · {ev.venue}</p>
                          </div>
                          <span className="font-mono text-emerald-700 font-bold">+{ev.points} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button onClick={() => setDialogOpen(false)} variant="outline" size="sm">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
