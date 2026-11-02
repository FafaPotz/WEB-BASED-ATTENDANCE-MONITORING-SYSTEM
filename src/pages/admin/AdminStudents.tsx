import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Search, Download, Upload, Plus, Edit, Trash2, Award, QrCode, CheckCircle2, XCircle, FileSpreadsheet, Snowflake, ShieldCheck } from 'lucide-react';
import { Navbar } from '../../components/Navbar.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Label } from '../../components/ui/label.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select.tsx';
import { adminAPI } from '../../utils/api.ts';
import { STUDENT_ORGANIZATIONS } from '../../utils/organizations.ts';
import { toast } from 'sonner';

export const AdminStudents: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('All Organizations');
  const [yearFilter, setYearFilter] = useState('All Year Levels');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  // Edit Student Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    contact: '',
    organization: '',
    year_level: '',
    nfc_id: '',
    password: '',
    is_active: true
  });

  // Bonus Points Dialog
  const [bonusDialogOpen, setBonusDialogOpen] = useState(false);
  const [bonusStudent, setBonusStudent] = useState<any>(null);
  const [bonusFormData, setBonusFormData] = useState({
    points: 10,
    reason: '',
    semester: '1st Semester 2026-2027'
  });

  // QR Modal
  const [qrModalStudent, setQrModalStudent] = useState<any>(null);

  const yearLevels = ['All Year Levels', '1st Year', '2nd Year', '3rd Year', '4th Year'];

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getUsers('student');
      setStudents(data);
    } catch (error) {
      console.error('Failed to load students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setOrgFilter('All Organizations');
    setYearFilter('All Year Levels');
    setStatusFilter('All Statuses');
  };

  const handleDownloadSampleCSV = () => {
    const csvContent =
      'Name,Email,Student ID,Organization,Year Level,Contact\n' +
      'Juan Dela Cruz,juan.delacruz@psu.palawan.edu.ph,2024-8-0123,Society of Information Technology Enthusiasts,1st Year,09123456789\n' +
      'Maria Santos,maria.santos@psu.palawan.edu.ph,2023-8-0456,Association of Computer Scientists,2nd Year,09987654321\n';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_students_import.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success('Sample CSV template downloaded!');
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await adminAPI.bulkImport(file);
      toast.success(response.data.message || 'Students imported successfully!');
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to import CSV');
    } finally {
      e.target.value = '';
    }
  };

  const handleOpenEdit = (student: any) => {
    setSelectedStudent(student);
    setEditFormData({
      name: student.name,
      contact: student.contact || '',
      organization: student.organization || 'Society of Information Technology Enthusiasts',
      year_level: student.year_level || '1st Year',
      nfc_id: student.nfc_id || '',
      password: '',
      is_active: student.is_active === 1
    });
    setEditDialogOpen(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      await adminAPI.updateUser(selectedStudent.id, editFormData);
      toast.success(`Student ${editFormData.name} updated successfully!`);
      setEditDialogOpen(false);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update student');
    }
  };

  const handleToggleFreeze = async (student: any) => {
    const isCurrentlyActive = student.is_active === 1;
    const actionLabel = isCurrentlyActive ? 'Freeze' : 'Unfreeze';
    try {
      const res = await adminAPI.toggleUserFreeze(student.id);
      toast.success(res.data?.message || `Student account ${actionLabel.toLowerCase()}d successfully`);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || `Failed to ${actionLabel.toLowerCase()} account`);
    }
  };

  const handleDeleteStudent = async (student: any) => {
    if (!confirm(`Are you sure you want to delete student "${student.name}" (${student.student_code})? This is irreversible.`)) {
      return;
    }
    try {
      await adminAPI.deleteUser(student.id);
      toast.success(`Student ${student.name} deleted`);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete student');
    }
  };

  const handleOpenBonus = (student: any) => {
    setBonusStudent(student);
    setBonusFormData({
      points: 10,
      reason: '',
      semester: '1st Semester 2026-2027'
    });
    setBonusDialogOpen(true);
  };

  const handleAwardBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonusStudent) return;
    try {
      await adminAPI.addBonusPoints({
        student_id: bonusStudent.id,
        points: bonusFormData.points,
        reason: bonusFormData.reason,
        semester: bonusFormData.semester
      });
      toast.success(`Awarded +${bonusFormData.points} bonus points to ${bonusStudent.name}!`);
      setBonusDialogOpen(false);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to award bonus points');
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.student_code && s.student_code.toLowerCase().includes(search.toLowerCase())) ||
      (s.student_id && s.student_id.toLowerCase().includes(search.toLowerCase())) ||
      s.email.toLowerCase().includes(search.toLowerCase());

    const matchesOrg = orgFilter === 'All Organizations' || s.organization === orgFilter;
    const matchesYear = yearFilter === 'All Year Levels' || s.year_level === yearFilter;
    const matchesStatus =
      statusFilter === 'All Statuses' ||
      (statusFilter === 'Active' && s.is_active === 1) ||
      (statusFilter === 'Frozen' && s.is_active === 0);

    return matchesSearch && matchesOrg && matchesYear && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/admin/dashboard">
              <Button variant="outline" size="sm" className="rounded-xl" data-testid="back-button">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight" data-testid="students-title">
                Student Directory & Management
              </h1>
              <p className="text-xs text-slate-500 font-medium">Manage student accounts, clearance points, QR passes, and CSV bulk imports.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadSampleCSV}
              variant="outline"
              size="sm"
              className="text-xs font-semibold"
              data-testid="download-sample-button"
            >
              <Download className="w-4 h-4 mr-1.5 text-slate-600" />
              Download Sample CSV
            </Button>
          </div>
        </div>

        {/* Bulk Import Card & Filter Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Search & Filter Card */}
          <Card className="glass-card md:col-span-2" data-testid="search-filter-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">Search & Filter Students</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Search by name, student code (e.g., SITE01), ID, or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-10 text-xs"
                  data-testid="search-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div data-testid="org-filter">
                  <Select value={orgFilter} onValueChange={(val: string) => setOrgFilter(val)}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="All Organizations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Organizations">All Organizations</SelectItem>
                      {STUDENT_ORGANIZATIONS.map(org => (
                        <SelectItem key={org.code} value={org.value}>
                          {org.code} · {org.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div data-testid="year-filter">
                  <Select value={yearFilter} onValueChange={(val: string) => setYearFilter(val)}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="All Year Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearLevels.map(y => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div data-testid="status-filter">
                  <Select value={statusFilter} onValueChange={(val: string) => setStatusFilter(val)}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Statuses">All Statuses</SelectItem>
                      <SelectItem value="Active">Active Only</SelectItem>
                      <SelectItem value="Frozen">❄️ Frozen Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  data-testid="clear-filters-button"
                >
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bulk CSV Upload Card */}
          <Card className="glass-card" data-testid="import-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Bulk CSV Student Import
              </CardTitle>
              <CardDescription className="text-xs">
                Upload student rosters to batch-create accounts and QR codes.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <label className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50/80 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group">
                <Upload className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold text-slate-800">Choose CSV File</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Click to browse file</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCSVUpload}
                  data-testid="csv-upload-input"
                />
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Students Table */}
        <Card className="glass-card" data-testid="students-table-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Registered Students</CardTitle>
              <CardDescription className="text-xs">
                Showing {filteredStudents.length} of {students.length} students
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-12 text-slate-500 text-sm">Loading student directory...</p>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-slate-600 font-bold text-sm">No students match current filters</p>
                <p className="text-xs text-slate-400">Try adjusting your search query or reset filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-600 uppercase bg-slate-50/50">
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Code / ID</th>
                      <th className="p-3">Organization</th>
                      <th className="p-3">Year Level</th>
                      <th className="p-3">Clearance Pts</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map(student => (
                      <tr key={student.id} className={`hover:bg-slate-50/80 transition-colors ${student.is_active === 0 ? 'bg-sky-50/30' : ''}`}>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{student.name}</p>
                          <p className="text-[11px] text-slate-400">{student.email}</p>
                        </td>
                        <td className="p-3 font-mono text-xs">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {student.student_code}
                          </span>
                          <span className="text-slate-400 text-[11px] block mt-0.5">{student.student_id || '—'}</span>
                        </td>
                        <td className="p-3 text-xs text-slate-700 max-w-[200px] truncate" title={student.organization}>
                          {student.organization}
                        </td>
                        <td className="p-3 text-xs text-slate-600">
                          {student.year_level || '1st Year'}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          <span className={student.total_points >= 50 ? 'text-emerald-700' : 'text-slate-700'}>
                            {student.total_points || 0} pts
                          </span>
                        </td>
                        <td className="p-3">
                          {student.is_active === 1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                              <Snowflake className="w-3 h-3 text-sky-600" />
                              ❄️ Frozen
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleFreeze(student)}
                              className={student.is_active === 1 ? "text-slate-500 hover:text-sky-600 hover:bg-sky-50" : "text-sky-600 hover:text-emerald-700 hover:bg-emerald-50"}
                              title={student.is_active === 1 ? "Freeze Account (Lock student out)" : "Unfreeze Account (Restore access)"}
                              data-testid={`freeze-btn-${student.id}`}
                            >
                              {student.is_active === 1 ? (
                                <Snowflake className="w-4 h-4 text-sky-600" />
                              ) : (
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setQrModalStudent(student)}
                              className="text-slate-500 hover:text-emerald-700"
                              title="View QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenBonus(student)}
                              className="text-slate-500 hover:text-amber-600"
                              title="Award Bonus Points"
                            >
                              <Award className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(student)}
                              className="text-slate-500 hover:text-blue-600"
                              title="Edit Student"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteStudent(student)}
                              className="text-slate-500 hover:text-rose-600"
                              title="Delete Student"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Student Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md" data-testid="edit-student-dialog">
            <DialogHeader>
              <DialogTitle>Edit Student Record</DialogTitle>
              <DialogDescription className="text-xs">
                Update credentials, organizational assignment, or status.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateStudent} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="edit-name" className="text-xs font-bold text-slate-700">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                  data-testid="edit-student-name-input"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-contact" className="text-xs font-bold text-slate-700">Contact Number</Label>
                <Input
                  id="edit-contact"
                  value={editFormData.contact}
                  onChange={e => setEditFormData({ ...editFormData, contact: e.target.value })}
                  data-testid="edit-student-contact-input"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Organization</Label>
                <div data-testid="edit-student-organization-select">
                  <Select
                    value={editFormData.organization}
                    onValueChange={(val: string) => setEditFormData({ ...editFormData, organization: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {STUDENT_ORGANIZATIONS.map(org => (
                        <SelectItem key={org.code} value={org.value}>
                          {org.label} ({org.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-year" className="text-xs font-bold text-slate-700">Year Level</Label>
                <Input
                  id="edit-year"
                  value={editFormData.year_level}
                  onChange={e => setEditFormData({ ...editFormData, year_level: e.target.value })}
                  data-testid="edit-student-year-level-input"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-nfc" className="text-xs font-bold text-slate-700">NFC Card ID (Optional)</Label>
                <Input
                  id="edit-nfc"
                  placeholder="e.g., NFC-123456"
                  value={editFormData.nfc_id}
                  onChange={e => setEditFormData({ ...editFormData, nfc_id: e.target.value })}
                  data-testid="edit-student-nfc-id-input"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-pass" className="text-xs font-bold text-slate-700">New Password (Leave blank to keep current)</Label>
                <Input
                  id="edit-pass"
                  type="password"
                  placeholder="Reset password..."
                  value={editFormData.password}
                  onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                  data-testid="edit-student-password-input"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Account Access Status</Label>
                <Select
                  value={editFormData.is_active ? 'active' : 'frozen'}
                  onValueChange={(val: string) => setEditFormData({ ...editFormData, is_active: val === 'active' })}
                >
                  <SelectTrigger className="text-xs" data-testid="edit-student-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Normal Access)</SelectItem>
                    <SelectItem value="frozen">❄️ Frozen (Account Locked)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400">Frozen accounts cannot log in or record event attendance.</p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" data-testid="update-student-button">
                  Update Student
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bonus Points Dialog */}
        <Dialog open={bonusDialogOpen} onOpenChange={setBonusDialogOpen}>
          <DialogContent className="max-w-md" data-testid="bonus-points-dialog">
            <DialogHeader>
              <DialogTitle>Award Bonus Clearance Points</DialogTitle>
              <DialogDescription className="text-xs">
                Award commendation points to {bonusStudent?.name} ({bonusStudent?.student_code}).
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAwardBonus} className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Semester</Label>
                <div data-testid="bonus-semester-select">
                  <Select
                    value={bonusFormData.semester}
                    onValueChange={(val: string) => setBonusFormData({ ...bonusFormData, semester: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st Semester 2026-2027">1st Semester 2026-2027</SelectItem>
                      <SelectItem value="2nd Semester 2025-2026">2nd Semester 2025-2026</SelectItem>
                      <SelectItem value="1st Semester 2025-2026">1st Semester 2025-2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="bonus-pts" className="text-xs font-bold text-slate-700">Points to Award</Label>
                <Input
                  id="bonus-pts"
                  type="number"
                  min="1"
                  max="100"
                  value={bonusFormData.points}
                  onChange={e => setBonusFormData({ ...bonusFormData, points: parseInt(e.target.value) || 0 })}
                  required
                  data-testid="bonus-points-input"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bonus-reason" className="text-xs font-bold text-slate-700">Justification / Reason *</Label>
                <Input
                  id="bonus-reason"
                  placeholder="e.g., Committee voluntary work during intramurals"
                  value={bonusFormData.reason}
                  onChange={e => setBonusFormData({ ...bonusFormData, reason: e.target.value })}
                  required
                  data-testid="bonus-reason-input"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setBonusDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" data-testid="award-bonus-button">
                  Award Points
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View QR Code Modal */}
        <Dialog open={!!qrModalStudent} onOpenChange={() => setQrModalStudent(null)}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <DialogTitle>{qrModalStudent?.name}</DialogTitle>
              <DialogDescription className="text-xs font-mono font-bold text-emerald-600">
                {qrModalStudent?.student_code}
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-center p-4">
              {qrModalStudent?.qr_code && (
                <div className="p-3 bg-white rounded-2xl border-2 border-emerald-500 shadow-md">
                  <img
                    src={qrModalStudent.qr_code.startsWith('data:') ? qrModalStudent.qr_code : `data:image/png;base64,${qrModalStudent.qr_code}`}
                    alt="Student QR Code"
                    className="w-48 h-48 object-contain"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setQrModalStudent(null)} variant="outline" size="sm" className="w-full">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
