import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, XCircle, Award, FileText, Printer, Calendar, Trophy, Percent } from 'lucide-react';
import { Navbar } from '../../components/Navbar.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select.tsx';
import { clearanceAPI, adminAPI } from '../../utils/api.ts';
import { getUser } from '../../utils/auth.ts';
import { toast } from 'sonner';

export const StudentClearance: React.FC = () => {
  const user = getUser();
  const [selectedSemester, setSelectedSemester] = useState('1st Semester 2026-2027');
  const [semesters, setSemesters] = useState<string[]>([
    '1st Semester 2026-2027',
    '2nd Semester 2025-2026',
    '1st Semester 2025-2026',
    '2nd Semester 2024-2025'
  ]);
  const [clearanceData, setClearanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClearance(selectedSemester);
  }, [selectedSemester]);

  const fetchClearance = async (semester: string) => {
    try {
      setLoading(true);
      const { data } = await clearanceAPI.get(semester);
      setClearanceData(data);
    } catch (error) {
      console.error('Failed to load clearance details:', error);
      toast.error('Failed to load clearance details');
    } finally {
      setLoading(false);
    }
  };

  const isCleared = clearanceData?.clearance_status === 'cleared';
  const totalPoints = clearanceData?.total_points || 0;
  const requiredPoints = clearanceData?.required_points || 50;
  const events = clearanceData?.events || [];
  const bonusPoints = clearanceData?.bonus_points_list || [];
  const attendedCount = clearanceData?.events_attended || 0;
  const totalEvents = clearanceData?.total_events || 0;
  const missedCount = Math.max(totalEvents - attendedCount, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/student/dashboard">
              <Button variant="outline" size="sm" className="rounded-xl" data-testid="back-button">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight" data-testid="clearance-title">
                Clearance Form
              </h1>
              <p className="text-xs text-slate-500 font-medium">Review your attendance requirements and semester clearance status.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-60" data-testid="semester-selector">
              <Select value={selectedSemester} onValueChange={(val: string) => setSelectedSemester(val)}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handlePrint} variant="outline" size="sm" className="hidden sm:inline-flex items-center gap-1.5">
              <Printer className="w-4 h-4" />
              Print Record
            </Button>
          </div>
        </div>

        {/* Student Identity Banner */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-emerald-600/20 p-1 bg-white shadow-xs shrink-0 hidden sm:flex items-center justify-center">
              <img
                src="/assets/aistudio/image_3b71bef2.png"
                alt="College of Sciences College Student Government"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{clearanceData?.student?.name || user?.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1">
                <span>Code: <strong className="font-mono text-emerald-600 font-bold">{clearanceData?.student?.student_code || user?.student_code}</strong></span>
                <span>·</span>
                <span>ID: <strong className="font-mono text-slate-800">{clearanceData?.student?.student_id || user?.student_id}</strong></span>
                <span>·</span>
                <span>Department: <strong className="text-slate-800">{clearanceData?.student?.organization || user?.organization || 'College of Sciences · College Student Government'}</strong></span>
                <span>·</span>
                <span>Year: <strong className="text-slate-800">{clearanceData?.student?.year_level || user?.year_level}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                isCleared
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {isCleared ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
              {isCleared ? 'CLEARED' : 'PENDING'}
            </div>
          </div>
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card" data-testid="total-points-card">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Total Points Earned
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-3xl font-mono font-extrabold text-emerald-600">{totalPoints}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Attendance + Bonus credits</p>
            </CardContent>
          </Card>

          <Card className="glass-card" data-testid="required-points-card">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Required Points
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-3xl font-mono font-extrabold text-slate-800">{requiredPoints}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Minimum for clearance</p>
            </CardContent>
          </Card>

          <Card className="glass-card" data-testid="attended-events-card">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Events Attended
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-3xl font-mono font-extrabold text-blue-600">{attendedCount}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Out of {totalEvents} total events</p>
            </CardContent>
          </Card>

          <Card className="glass-card" data-testid="status-card">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-3xl font-mono font-extrabold text-purple-600">
                {clearanceData?.attendance_rate || 0}%
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Event attendance ratio</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Events Breakdown Table */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Event Participation Breakdown ({selectedSemester})
            </CardTitle>
            <CardDescription className="text-xs">
              Complete status of all institutional events scheduled for this academic semester.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-slate-500 text-sm">Loading event records...</p>
            ) : events.length === 0 ? (
              <p className="text-center py-8 text-slate-500 text-sm">No events found for this semester.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-600 uppercase bg-slate-50/50">
                      <th className="p-3">Event Name</th>
                      <th className="p-3">Date & Venue</th>
                      <th className="p-3">Time-In</th>
                      <th className="p-3">Time-Out</th>
                      <th className="p-3">Points Earned</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.map((ev: any) => (
                      <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">{ev.name}</td>
                        <td className="p-3 text-xs text-slate-600">
                          <div>{ev.date}</div>
                          <div className="text-slate-400">{ev.venue}</div>
                        </td>
                        <td className="p-3">
                          {ev.has_timein ? (
                            <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Recorded
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          {ev.has_timeout ? (
                            <span className="text-blue-700 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                              Recorded
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-700">
                          +{ev.points_earned} / {ev.total_points_possible} pts
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                              ev.status === 'COMPLETE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ev.status === 'TIMEIN_ONLY'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {ev.status}
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

        {/* Bonus Points Section */}
        <Card className="glass-card" data-testid="bonus-points-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Bonus Points & Commendations
            </CardTitle>
            <CardDescription className="text-xs">
              Special points granted by organization officers or administrators for voluntary work or achievements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bonusPoints.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-4">No bonus points awarded this semester.</p>
            ) : (
              <div className="space-y-2">
                {bonusPoints.map((b: any) => (
                  <div key={b.id} className="p-3 bg-white rounded-xl border border-slate-200/80 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{b.reason}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Awarded by: {b.created_by} · {new Date(b.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="font-mono font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                      +{b.points} pts
                    </span>
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
