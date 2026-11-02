import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Edit3, Search, AlertCircle, Clock, Shield, Sparkles, Eye, CheckCircle2 } from 'lucide-react';
import { Navbar } from '../../components/Navbar.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog.tsx';
import { announcementAPI } from '../../utils/api.ts';
import { getUser } from '../../utils/auth.ts';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  title: string;
  content: string;
  organization: string;
  priority: 'normal' | 'high' | 'urgent';
  created_by: string;
  created_at: string;
}

const PRESET_ORGANIZATIONS = [
  'College of Sciences Student Government',
  'Environmental Science Student Association',
  'Information Technology Society',
  'Department of Mathematics & Physics',
  'General Sciences Directorate'
];

export const AdminAnnouncements: React.FC = () => {
  const currentUser = getUser();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [organization, setOrganization] = useState('College of Sciences Student Government');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data } = await announcementAPI.getAll();
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Failed to load announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setOrganization('College of Sciences Student Government');
    setPriority('normal');
    setSelectedId(null);
    setIsEditing(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (ann: Announcement) => {
    setSelectedId(ann.id);
    setTitle(ann.title);
    setContent(ann.content);
    setOrganization(ann.organization || 'College of Sciences Student Government');
    setPriority(ann.priority || 'normal');
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter an announcement title');
      return;
    }
    if (!content.trim()) {
      toast.error('Please enter the announcement content');
      return;
    }

    try {
      setFormSubmitting(true);
      if (isEditing && selectedId) {
        await announcementAPI.update(selectedId, {
          title: title.trim(),
          content: content.trim(),
          organization: organization.trim(),
          priority
        });
        toast.success('Announcement updated successfully!');
      } else {
        await announcementAPI.create({
          title: title.trim(),
          content: content.trim(),
          organization: organization.trim(),
          priority
        });
        toast.success('Announcement posted to Student Dashboard!');
      }
      setDialogOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (error: any) {
      console.error('Failed to save announcement:', error);
      toast.error(error.response?.data?.detail || 'Failed to save announcement');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      await announcementAPI.delete(id);
      toast.success('Announcement removed from dashboards');
      setDeleteConfirmId(null);
      fetchAnnouncements();
    } catch (error: any) {
      console.error('Failed to delete announcement:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete announcement');
    } finally {
      setDeleting(false);
    }
  };

  const filteredAnnouncements = announcements.filter((ann) => {
    const matchesSearch =
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.organization?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || ann.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            URGENT
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            HIGH PRIORITY
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            NORMAL NOTICE
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs border border-emerald-200">
              <Megaphone className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight" data-testid="admin-announcements-title">
                  Official Campus Announcements
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Admin Broadcast
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Create and manage official announcements displayed directly on the Student & Officer Dashboards.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={openCreateDialog}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              data-testid="create-announcement-button"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Post Announcement
            </Button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Announcements
              </CardTitle>
              <Megaphone className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-extrabold text-slate-900">
                {loading ? '—' : announcements.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Published across all student portals</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                High & Urgent Alerts
              </CardTitle>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-extrabold text-slate-900">
                {loading ? '—' : announcements.filter(a => a.priority === 'urgent' || a.priority === 'high').length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Priority notices requiring attention</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Organization
              </CardTitle>
              <Shield className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-slate-900 truncate">
                CSG · College of Sciences
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Authorized campus dispatch</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search announcements by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs sm:text-sm bg-slate-50"
              data-testid="search-announcements-input"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-emerald-600"
            >
              <option value="all">All Priorities</option>
              <option value="normal">Normal</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Active Broadcasts</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {filteredAnnouncements.length}
              </span>
            </h2>
            <span className="text-xs text-slate-500">
              Updates reflect immediately on Student & Officer dashboards
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Clock className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Loading campus announcements...</p>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Megaphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Announcements Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery
                  ? 'No announcements match your search criteria. Try a different query.'
                  : 'No active announcements have been published yet. Click "Post Announcement" to broadcast to all students.'}
              </p>
              {!searchQuery && (
                <Button
                  onClick={openCreateDialog}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Post First Announcement
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAnnouncements.map((ann) => (
                <Card
                  key={ann.id}
                  className="border border-slate-200/90 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between"
                  data-testid={`announcement-card-${ann.id}`}
                >
                  <CardHeader className="pb-2 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          {ann.organization || 'College of Sciences'}
                        </span>
                        <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                          {ann.title}
                        </CardTitle>
                      </div>
                      <div className="shrink-0">{getPriorityBadge(ann.priority)}</div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-1 flex-1 flex flex-col justify-between">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      {ann.content}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div>
                        <span>Posted by <strong className="text-slate-700">{ann.created_by || 'Admin'}</strong></span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span>{new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(ann)}
                          className="h-8 px-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="Edit announcement"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmId(ann.id)}
                          className="h-8 px-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Live Student Dashboard Preview Card */}
        <Card className="glass-card border-amber-200/80 bg-linear-to-br from-amber-50/40 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-base font-bold text-slate-900">
                  Student Dashboard Preview
                </CardTitle>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                Live Preview
              </span>
            </div>
            <CardDescription className="text-xs">
              This is an exact preview of how announcements appear on the Student Portal under "Official Campus Announcements".
            </CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <div className="p-4 bg-white rounded-xl border border-dashed border-amber-300 text-center text-xs text-slate-500">
                No active announcements to display in preview.
              </div>
            ) : (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Megaphone className="w-4 h-4 text-amber-600" />
                  Official Campus Announcements
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {announcements.slice(0, 2).map((ann) => (
                    <div key={ann.id} className="bg-white p-3.5 rounded-xl border border-amber-200/50 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span>{ann.title}</span>
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md uppercase font-semibold">
                          {ann.priority || 'Notice'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{ann.content}</p>
                      <p className="text-[10px] text-slate-400 font-medium pt-1">
                        Posted by {ann.created_by} · {new Date(ann.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Megaphone className="w-5 h-5 text-emerald-600" />
              {isEditing ? 'Edit Announcement' : 'Post Campus Announcement'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Broadcast an official notification to all students and officers in the College of Sciences.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Announcement Title <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Science Month 2026 Grand Opening Ceremony"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-sm font-semibold text-slate-900"
                data-testid="announcement-title-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Publishing Organization
                </label>
                <select
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-emerald-600"
                  data-testid="announcement-org-select"
                >
                  {PRESET_ORGANIZATIONS.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-emerald-600"
                  data-testid="announcement-priority-select"
                >
                  <option value="normal">Normal (Green Notice)</option>
                  <option value="high">High (Amber Alert)</option>
                  <option value="urgent">Urgent (Rose Priority)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Announcement Message / Details <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {content.length} characters
                </span>
              </div>
              <textarea
                rows={4}
                placeholder="Write the full message, guidelines, venue, schedules, or clearance instructions..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-emerald-600 leading-relaxed font-sans"
                data-testid="announcement-content-textarea"
              />
            </div>

            {/* In-modal live preview */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" /> Quick Preview
              </span>
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{title || 'Sample Announcement Title'}</span>
                  {getPriorityBadge(priority)}
                </div>
                <p className="text-slate-600 text-[11px] line-clamp-2">
                  {content || 'Your announcement message will be rendered here for all students to read.'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium pt-0.5">
                  Posted by {currentUser?.name || 'Administrator'} · Just now
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                data-testid="submit-announcement-button"
              >
                {formSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : isEditing ? (
                  'Update Announcement'
                ) : (
                  'Publish Announcement'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 font-bold">
              <Trash2 className="w-5 h-5" />
              Remove Announcement?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to remove this announcement? It will immediately disappear from the Student and Officer dashboards.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              data-testid="confirm-delete-announcement-button"
            >
              {deleting ? 'Removing...' : 'Confirm Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
