import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Plus, Edit, Trash2, Activity, Key, Lock, UserCheck, Snowflake, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Navbar } from '../../components/Navbar.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Label } from '../../components/ui/label.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select.tsx';
import { adminAPI } from '../../utils/api.ts';
import { getUser } from '../../utils/auth.ts';
import { toast } from 'sonner';

export const AdminManagement: React.FC = () => {
  const currentUser = getUser();
  const [admins, setAdmins] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    newPassword: '',
    contact: '',
    organization: 'College of Sciences',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adminsRes, logsRes] = await Promise.all([
        adminAPI.getUsers('admin'),
        adminAPI.getAuditLogs().catch(() => ({ data: [] }))
      ]);
      setAdmins(adminsRes.data);
      setAuditLogs(logsRes.data);
    } catch (error) {
      console.error('Failed to load admins data:', error);
      toast.error('Failed to load administrator accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingAdmin(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      newPassword: '',
      contact: '',
      organization: 'College of Sciences',
      is_active: true
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (admin: any) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: '',
      newPassword: '',
      contact: admin.contact || '',
      organization: admin.organization || 'College of Sciences',
      is_active: admin.is_active === 1
    });
    setDialogOpen(true);
  };

  const handleToggleFreeze = async (admin: any) => {
    if (admin.id === currentUser?.id) {
      toast.error('Cannot freeze your own administrator account');
      return;
    }
    const isCurrentlyActive = admin.is_active === 1;
    const actionLabel = isCurrentlyActive ? 'Freeze' : 'Unfreeze';
    try {
      const res = await adminAPI.toggleUserFreeze(admin.id);
      toast.success(res.data?.message || `Administrator account ${actionLabel.toLowerCase()}d successfully`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || `Failed to ${actionLabel.toLowerCase()} administrator account`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAdmin) {
        await adminAPI.updateUser(editingAdmin.id, {
          name: formData.name,
          contact: formData.contact,
          organization: formData.organization,
          password: formData.newPassword || undefined,
          is_active: formData.is_active
        });
        toast.success(`Administrator ${formData.name} updated!`);
      } else {
        await adminAPI.createAdmin({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          contact: formData.contact,
          organization: formData.organization
        });
        toast.success(`Administrator account created for ${formData.name}!`);
      }
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save admin');
    }
  };

  const handleDelete = async (admin: any) => {
    if (admin.id === currentUser?.id) {
      toast.error('Cannot delete your own administrator account');
      return;
    }
    try {
      await adminAPI.deleteUser(admin.id);
      toast.success(`Admin ${admin.name} deleted`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete admin');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/admin/dashboard">
              <Button variant="outline" size="sm" className="rounded-xl" data-testid="back-button">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight" data-testid="admins-title">
                Admin Management
              </h1>
              <p className="text-xs text-slate-500 font-medium">Manage system administrators, security privileges, and comprehensive audit logs.</p>
            </div>
          </div>

          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl"
            data-testid="create-admin-button"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add System Admin
          </Button>
        </div>

        {/* Admins Table Card */}
        <Card className="glass-card" data-testid="admins-table-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">System Administrators</CardTitle>
              <CardDescription className="text-xs">
                Accounts with root access to configuration, student records, and system settings.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-10 text-slate-500 text-sm">Loading administrators...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-600 uppercase bg-slate-50/50">
                      <th className="p-3">Administrator</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Organization</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Role Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {admins.map(admin => (
                      <tr key={admin.id} className={`hover:bg-slate-50/80 transition-colors ${admin.is_active === 0 ? 'bg-sky-50/30' : ''}`}>
                        <td className="p-3 font-semibold text-slate-900">
                          {admin.name} {admin.id === currentUser?.id ? <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold ml-1">(You)</span> : null}
                        </td>
                        <td className="p-3 text-xs text-slate-600 font-mono">
                          {admin.email}
                        </td>
                        <td className="p-3 text-xs text-slate-700">
                          {admin.organization || 'College of Sciences · College Student Government'}
                        </td>
                        <td className="p-3 text-xs text-slate-600 font-mono">
                          {admin.contact || '—'}
                        </td>
                        <td className="p-3">
                          {admin.is_active === 1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                              <CheckCircle2 className="w-3 h-3 text-purple-600" />
                              Active Super Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-sky-100 text-sky-800 border border-sky-300">
                              <Snowflake className="w-3 h-3 text-sky-600" />
                              ❄️ Frozen Admin
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {admin.id !== currentUser?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleFreeze(admin)}
                                className={admin.is_active === 1 ? "text-slate-500 hover:text-sky-600 hover:bg-sky-50" : "text-sky-600 hover:text-emerald-700 hover:bg-emerald-50"}
                                title={admin.is_active === 1 ? "Freeze Administrator Account" : "Unfreeze Administrator Account"}
                                data-testid={`freeze-admin-btn-${admin.id}`}
                              >
                                {admin.is_active === 1 ? (
                                  <Snowflake className="w-4 h-4 text-sky-600" />
                                ) : (
                                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(admin)}
                              className="text-slate-500 hover:text-emerald-700"
                              title="Edit Admin"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {admin.id !== currentUser?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(admin)}
                                className="text-slate-500 hover:text-rose-600"
                                title="Delete Admin"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
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

        {/* Audit Logs Section */}
        <Card className="glass-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Comprehensive Audit Logs
              </CardTitle>
              <CardDescription className="text-xs">
                Permanent record of user authentication, student modifications, attendance logs, and administrative actions.
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-slate-500">{auditLogs.length} events logged</span>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">No audit records found.</p>
            ) : (
              <div className="overflow-x-auto max-h-[450px]">
                <table className="w-full text-left text-xs font-medium">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 uppercase bg-slate-50/50 sticky top-0 font-bold">
                      <th className="p-2.5">Timestamp</th>
                      <th className="p-2.5">User</th>
                      <th className="p-2.5">Role</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-2.5 font-bold text-slate-800">
                          {log.user_name || 'Anonymous'}
                        </td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 text-slate-700">
                            {log.user_role || 'SYSTEM'}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-emerald-700">
                          {log.action}
                        </td>
                        <td className="p-2.5 text-slate-600 max-w-md truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog for Create/Edit Admin */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md" data-testid="admin-dialog">
            <DialogHeader>
              <DialogTitle>{editingAdmin ? 'Edit Administrator' : 'Add System Administrator'}</DialogTitle>
              <DialogDescription className="text-xs">
                Administrators have complete control over system rules, accounts, and attendance modifications.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="admin-name" className="text-xs font-bold text-slate-700">Full Name *</Label>
                <Input
                  id="admin-name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="admin-name-input"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="admin-email" className="text-xs font-bold text-slate-700">Email *</Label>
                <Input
                  id="admin-email"
                  type="email"
                  disabled={!!editingAdmin}
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                  className={editingAdmin ? 'bg-slate-100 text-slate-500' : ''}
                  data-testid="admin-email-input"
                />
              </div>

              {!editingAdmin ? (
                <div className="space-y-1">
                  <Label htmlFor="admin-pass" className="text-xs font-bold text-slate-700">Password *</Label>
                  <Input
                    id="admin-pass"
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required
                    data-testid="admin-password-input"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="admin-new-pass" className="text-xs font-bold text-slate-700">New Password (Optional)</Label>
                  <Input
                    id="admin-new-pass"
                    type="password"
                    placeholder="Leave blank to keep existing..."
                    value={formData.newPassword}
                    onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                    data-testid="admin-new-password-input"
                  />
                  <p className="text-[10px] text-slate-400">Only fill this if you want to change the admin's password</p>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="admin-contact" className="text-xs font-bold text-slate-700">Contact Number</Label>
                <Input
                  id="admin-contact"
                  value={formData.contact}
                  onChange={e => setFormData({ ...formData, contact: e.target.value })}
                  data-testid="admin-contact-input"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="admin-org" className="text-xs font-bold text-slate-700">Organization</Label>
                <Input
                  id="admin-org"
                  value={formData.organization}
                  onChange={e => setFormData({ ...formData, organization: e.target.value })}
                  data-testid="admin-organization-input"
                />
              </div>

              {editingAdmin && editingAdmin.id !== currentUser?.id && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Account Access Status</Label>
                  <Select
                    value={formData.is_active ? 'active' : 'frozen'}
                    onValueChange={(val: string) => setFormData({ ...formData, is_active: val === 'active' })}
                  >
                    <SelectTrigger className="text-xs" data-testid="admin-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Normal Access)</SelectItem>
                      <SelectItem value="frozen">❄️ Frozen (Account Locked)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400">Frozen administrators cannot log in or perform administrative actions.</p>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" data-testid="save-admin-button">
                  {editingAdmin ? 'Update Admin' : 'Create Admin'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
