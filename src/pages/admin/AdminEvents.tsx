import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Plus, Download, Edit, Trash2, CheckCircle2, Clock, MapPin, Search } from 'lucide-react';
import { Navbar } from '../../components/Navbar.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Label } from '../../components/ui/label.tsx';
import { Textarea } from '../../components/ui/textarea.tsx';
import { Switch } from '../../components/ui/switch.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select.tsx';
import { eventAPI, adminAPI } from '../../utils/api.ts';
import { ORGANIZATIONS } from '../../utils/organizations.ts';
import { toast } from 'sonner';

export const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState('All Semesters');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '17:00',
    venue: '',
    points: 10,
    timein_points: 5,
    timeout_points: 5,
    semester: '1st Semester 2026-2027',
    organization: 'College of Sciences · College Student Government',
    is_active: true
  });

  const semesters = [
    'All Semesters',
    '1st Semester 2026-2027',
    '2nd Semester 2025-2026',
    '1st Semester 2025-2026',
    '2nd Semester 2024-2025'
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data } = await eventAPI.getAll(false);
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingEventId(null);
    setFormData({
      name: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      start_time: '08:00',
      end_time: '17:00',
      venue: '',
      points: 10,
      timein_points: 5,
      timeout_points: 5,
      semester: selectedSemester === 'All Semesters' ? '1st Semester 2026-2027' : selectedSemester,
      organization: 'College of Sciences · College Student Government',
      is_active: true
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (ev: any) => {
    setEditingEventId(ev.id);
    setFormData({
      name: ev.name,
      description: ev.description || '',
      date: ev.date,
      start_time: ev.start_time || '08:00',
      end_time: ev.end_time || '17:00',
      venue: ev.venue || '',
      points: ev.points || 10,
      timein_points: ev.timein_points || 5,
      timeout_points: ev.timeout_points || 5,
      semester: ev.semester,
      organization: ev.organization || 'College of Sciences · College Student Government',
      is_active: ev.is_active === 1
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEventId) {
        await eventAPI.update(editingEventId, formData);
        toast.success(`Event "${formData.name}" updated successfully!`);
      } else {
        await eventAPI.create(formData);
        toast.success(`Event "${formData.name}" created successfully!`);
      }
      setDialogOpen(false);
      fetchEvents();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save event');
    }
  };

  const handleRequestDelete = (ev: { id: string; name: string }) => {
    setEventToDelete(ev);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      setDeleting(true);
      await eventAPI.delete(eventToDelete.id);
      toast.success(`Event "${eventToDelete.name}" deleted successfully!`);
      setDeleteConfirmOpen(false);
      setEventToDelete(null);
      fetchEvents();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const semesterParam = selectedSemester === 'All Semesters' ? undefined : selectedSemester;
      const response = await adminAPI.exportAttendance(semesterParam);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${selectedSemester.replace(/\s+/g, '-')}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Attendance records exported!');
    } catch (err) {
      toast.error('Failed to export attendance records');
    }
  };

  const filteredEvents = events.filter(ev => {
    const matchesSemester = selectedSemester === 'All Semesters' || ev.semester === selectedSemester;
    const matchesSearch = ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (ev.venue && ev.venue.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (ev.organization && ev.organization.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSemester && matchesSearch;
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
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight" data-testid="events-title">
                Event Management
              </h1>
              <p className="text-xs text-slate-500 font-medium">Create and manage institutional events, points, and attendance records.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleExport} variant="outline" size="sm" data-testid="export-button">
              <Download className="w-4 h-4 mr-1.5" />
              Export Attendance CSV
            </Button>
            <Button
              onClick={handleOpenCreate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl"
              data-testid="create-event-button"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Event
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search events by name, venue, org..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          <div className="w-full sm:w-64" data-testid="semester-filter">
            <Select value={selectedSemester} onValueChange={(val: string) => setSelectedSemester(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Semester" />
              </SelectTrigger>
              <SelectContent>
                {semesters.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Events Table Card */}
        <Card className="glass-card" data-testid="events-table-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Events Directory</CardTitle>
              <CardDescription className="text-xs">
                Showing {filteredEvents.length} scheduled events
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-10 text-slate-500 text-sm">Loading events...</p>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Calendar className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-slate-600 font-bold text-sm">No events found</p>
                <p className="text-xs text-slate-400">Click "Create Event" to schedule an attendance event.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-600 uppercase bg-slate-50/50">
                      <th className="p-3">Event Name</th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Venue</th>
                      <th className="p-3">Points (In/Out)</th>
                      <th className="p-3">Semester</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEvents.map(ev => (
                      <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{ev.name}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{ev.organization}</p>
                        </td>
                        <td className="p-3 font-mono text-xs text-slate-700">
                          <div>{ev.date}</div>
                          <div className="text-slate-400 text-[11px]">{ev.start_time} - {ev.end_time}</div>
                        </td>
                        <td className="p-3 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {ev.venue || 'Campus'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs">
                          <span className="font-bold text-emerald-700">+{ev.points} pts</span>
                          <span className="text-slate-400 text-[10px] block">
                            In: {ev.timein_points || 5} | Out: {ev.timeout_points || 5}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-600 font-medium">
                          {ev.semester}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                              ev.is_active === 1
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {ev.is_active === 1 ? 'Active' : 'Closed'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(ev)}
                              className="text-slate-500 hover:text-emerald-700"
                              title="Edit Event"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRequestDelete({ id: ev.id, name: ev.name })}
                              className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete Event"
                              data-testid={`delete-event-${ev.id}`}
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

        {/* Create / Edit Event Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-xl" data-testid="event-dialog">
            <DialogHeader>
              <DialogTitle>{editingEventId ? 'Edit Event' : 'Create Attendance Event'}</DialogTitle>
              <DialogDescription className="text-xs">
                Fill in the event parameters, points scheme, and active status.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="event-name" className="text-xs font-bold text-slate-700">Event Name *</Label>
                <Input
                  id="event-name"
                  placeholder="e.g., General Assembly 2026"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="event-name-input"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="event-desc" className="text-xs font-bold text-slate-700">Description</Label>
                <Textarea
                  id="event-desc"
                  placeholder="Event purpose, agenda, guidelines..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  data-testid="event-description-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="event-date" className="text-xs font-bold text-slate-700">Event Date *</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                    data-testid="event-date-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="start-time" className="text-xs font-bold text-slate-700">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end-time" className="text-xs font-bold text-slate-700">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="event-venue" className="text-xs font-bold text-slate-700">Venue</Label>
                  <Input
                    id="event-venue"
                    placeholder="e.g., University Gymnasium"
                    value={formData.venue}
                    onChange={e => setFormData({ ...formData, venue: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Semester *</Label>
                  <div data-testid="semester-input">
                    <Select
                      value={formData.semester}
                      onValueChange={(val: string) => setFormData({ ...formData, semester: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {semesters.filter(s => s !== 'All Semesters').map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="timein-pts" className="text-xs font-bold text-slate-700">Time-In Pts</Label>
                  <Input
                    id="timein-pts"
                    type="number"
                    min="1"
                    value={formData.timein_points}
                    onChange={e => {
                      const tin = parseInt(e.target.value) || 0;
                      setFormData({ ...formData, timein_points: tin, points: tin + formData.timeout_points });
                    }}
                    required
                    data-testid="timein-points-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="timeout-pts" className="text-xs font-bold text-slate-700">Time-Out Pts</Label>
                  <Input
                    id="timeout-pts"
                    type="number"
                    min="0"
                    value={formData.timeout_points}
                    onChange={e => {
                      const tout = parseInt(e.target.value) || 0;
                      setFormData({ ...formData, timeout_points: tout, points: formData.timein_points + tout });
                    }}
                    required
                    data-testid="timeout-points-input"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Total Points</Label>
                  <Input
                    type="number"
                    disabled
                    value={formData.points}
                    className="bg-slate-100 font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-xs font-bold text-slate-800">Event Active for Attendance</p>
                  <p className="text-[11px] text-slate-500">Allow gate scanners to record attendance for this event.</p>
                </div>
                <div data-testid="event-active-switch">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" data-testid="save-event-button">
                  {editingEventId ? 'Save Changes' : 'Create Event'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="max-w-md bg-white border border-slate-200" data-testid="delete-confirm-dialog">
            <DialogHeader>
              <DialogTitle className="text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Confirm Event Deletion
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-900 font-bold">"{eventToDelete?.name}"</strong>?
                This action will permanently delete this event and all associated student attendance records.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setEventToDelete(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                disabled={deleting}
                onClick={handleConfirmDelete}
                data-testid="confirm-delete-event-button"
              >
                {deleting ? 'Deleting...' : 'Delete Event'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
