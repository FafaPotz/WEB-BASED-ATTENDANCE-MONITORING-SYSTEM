import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Plus, Edit, Trash2, Mail, Phone, Building, Snowflake, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Navbar } from '../../components/Navbar.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Label } from '../../components/ui/label.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select.tsx';
import { adminAPI } from '../../utils/api.ts';
import { ORGANIZATIONS } from '../../utils/organizations.ts';
import { toast } from 'sonner';

export const AdminOfficers: React.FC = () => {
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    newPassword: '',
    contact: '',
    organization: 'College of Sciences · College Student Government',
    is_active: true
  });

  useEffect(() => {
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getUsers('officer');
      setOfficers(data);
    } catch (error) {
      console.error('Failed to load officers:', error);
      toast.error('Failed to load officer accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingOfficer(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      newPassword: '',
      contact: '',
      organization: 'College of Sciences · College Student Government',
      is_active: true
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (officer: any) => {
    setEditingOfficer(officer);
    setFormData({
      name: officer.name,
      email: officer.email,
      password: '',
      newPassword: '',
      contact: officer.contact || '',
      organization: 'College of Sciences · College Student Government',
      is_active: officer.is_active === 1
    });
    setDialogOpen(true);
  };

  const handleToggleFreeze = async (officer: any) => {
    const isCurrentlyActive = officer.is_active === 1;
    const actionLabel = isCurrentlyActive ? 'Freeze' : 'Unfreeze';
    try {
      const res = await adminAPI.toggleUserFreeze(officer.id);
      toast.success(res.data?.message || `Officer account ${actionLabel.toLowerCase()}d successfully`);
      fetchOfficers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || `Failed to ${actionLabel.toLowerCase()} officer account`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOfficer) {
        await adminAPI.updateUser(editingOfficer.id, {
          name: formData.name,
          contact: formData.contact,
          organization: formData.organization,
          password: formData.newPassword || undefined,
          is_active: formData.is_active
        });
        toast.success(`Officer ${formData.name} updated!`);
      } else {
        await adminAPI.createOfficer({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          contact: formData.contact,
          organization: formData.organization
        });
        toast.success(`Officer account created for ${formData.name}!`);
      }
      setDialogOpen(false);
      fetchOfficers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save officer');
    }
  };

  const handleDelete = async (officer: any) => {
    if (!confirm(`Are you sure you want to remove officer "${officer.name}"?`)) return;
    try {
      await adminAPI.deleteUser(officer.id);
      toast.success(`Officer ${officer.name} deleted`);
      fetchOfficers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete officer');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/admin/dashboard">
              <Button variant="outline" size="sm" className="rounded-xl" data-testid="back-button">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight" data-testid="officers-title">
                Officer Management
              </h1>
              <p className="text-xs text-slate-500 font-medium">Manage student organization officers authorized to scan attendance.</p>
            </div>
          </div>

          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl"
            data-testid="create-officer-button"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add New Officer
          </Button>
        </div>

        <Card className="glass-card" data-testid="officers-table-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Authorized Attendance Officers</CardTitle>
              <CardDescription className="text-xs">
                Showing {officers.length} registered officers
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-12 text-slate-500 text-sm">Loading officers...</p>
            ) : officers.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Shield className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-slate-600 font-bold text-sm">No officers registered</p>
                <p className="text-xs text-slate-400">Click "Add New Officer" to create scanner credentials.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-600 uppercase bg-slate-50/50">
                      <th className="p-3">Officer Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Organization</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {officers.map(officer => (
                      <tr key={officer.id} className={`hover:bg-slate-50/80 transition-colors ${officer.is_active === 0 ? 'bg-sky-50/30' : ''}`}>
                        <td className="p-3 font-semibold text-slate-900">
                          {officer.name}
                        </td>
                        <td className="p-3 text-xs text-slate-600 font-mono">
                          {officer.email}
                        </td>
                        <td className="p-3 text-xs text-slate-700">
                          {officer.organization || 'College of Sciences · College Student Government'}
                        </td>
                        <td className="p-3 text-xs text-slate-600 font-mono">
                          {officer.contact || '—'}
                        </td>
                        <td className="p-3">
                          {officer.is_active === 1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Active Officer
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                              <Snowflake className="w-3 h-3 text-sky-600" />
                              ❄️ Frozen Officer
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleFreeze(officer)}
                              className={officer.is_active === 1 ? "text-slate-500 hover:text-sky-600 hover:bg-sky-50" : "text-sky-600 hover:text-emerald-700 hover:bg-emerald-50"}
                              title={officer.is_active === 1 ? "Freeze Officer (Lock account)" : "Unfreeze Officer (Restore access)"}
                              data-testid={`freeze-officer-btn-${officer.id}`}
                            >
                              {officer.is_active === 1 ? (
                                <Snowflake className="w-4 h-4 text-sky-600" />
                              ) : (
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(officer)}
                              className="text-slate-500 hover:text-emerald-700"
                              title="Edit Officer"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(officer)}
                              className="text-slate-500 hover:text-rose-600"
                              title="Delete Officer"
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

        {/* Dialog for Create/Edit Officer */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md" data-testid="officer-dialog">
            <DialogHeader>
              <DialogTitle>{editingOfficer ? 'Edit Officer Account' : 'Create Officer Account'}</DialogTitle>
              <DialogDescription className="text-xs">
                Authorized officers can log in to the Officer Dashboard and operate QR/NFC gate scanners.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="officer-name" className="text-xs font-bold text-slate-700">Full Name *</Label>
                <Input
                  id="officer-name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="officer-name-input"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="officer-email" className="text-xs font-bold text-slate-700">Email *</Label>
                <Input
                  id="officer-email"
                  type="email"
                  placeholder="example@psu.palawan.edu.ph"
                  disabled={!!editingOfficer}
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                  className={editingOfficer ? 'bg-slate-100 text-slate-500' : ''}
                  data-testid="officer-email-input"
                />
              </div>

              {!editingOfficer ? (
                <div className="space-y-1">
                  <Label htmlFor="officer-pass" className="text-xs font-bold text-slate-700">Password *</Label>
                  <Input
                    id="officer-pass"
                    type="password"
                    placeholder="Enter account password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required
                    data-testid="officer-password-input"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="officer-new-pass" className="text-xs font-bold text-slate-700">New Password (Optional)</Label>
                  <Input
                    id="officer-new-pass"
                    type="password"
                    placeholder="Leave blank to keep existing..."
                    value={formData.newPassword}
                    onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                    data-testid="officer-new-password-input"
                  />
                  <p className="text-[10px] text-slate-400">Only fill this if you want to change the officer's password</p>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="officer-contact" className="text-xs font-bold text-slate-700">Contact Number</Label>
                <Input
                  id="officer-contact"
                  placeholder="09123456789"
                  value={formData.contact}
                  onChange={e => setFormData({ ...formData, contact: e.target.value })}
                  data-testid="officer-contact-input"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Department</Label>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200/90 rounded-lg flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-950">
                    College of Sciences · College Student Government
                  </span>
                  <span className="bg-emerald-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                    CSG
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Officers are assigned exclusively to CSG.</p>
              </div>

              {editingOfficer && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Account Access Status</Label>
                  <Select
                    value={formData.is_active ? 'active' : 'frozen'}
                    onValueChange={(val: string) => setFormData({ ...formData, is_active: val === 'active' })}
                  >
                    <SelectTrigger className="text-xs" data-testid="officer-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Normal Access)</SelectItem>
                      <SelectItem value="frozen">❄️ Frozen (Account Locked)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400">Frozen officers cannot log in or operate event gate scanners.</p>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" data-testid="save-officer-button">
                  {editingOfficer ? 'Update Officer' : 'Create Officer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
