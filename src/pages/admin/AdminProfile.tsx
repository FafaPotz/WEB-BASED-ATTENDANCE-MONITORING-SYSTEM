import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Phone, Shield, Upload, Save, Lock, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Navbar } from '../../components/Navbar.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Label } from '../../components/ui/label.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { profileAPI, authAPI } from '../../utils/api.ts';
import { getUser, setUser } from '../../utils/auth.ts';
import { toast } from 'sonner';

export const AdminProfile: React.FC = () => {
  const [currentUser, setCurrentUserState] = useState(getUser());
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    contact: currentUser?.contact || '',
    photo: currentUser?.photo || '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    authAPI.getMe()
      .then(({ data }) => {
        setCurrentUserState(data);
        setUser(data);
        setFormData(prev => ({
          ...prev,
          name: data.name || '',
          contact: data.contact || '',
          photo: data.photo || ''
        }));
      })
      .catch(console.error);
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image is too large. Please select a photo under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData(prev => ({ ...prev, photo: base64 }));
      toast.info('Photo loaded. Click "Save Profile Changes" to apply.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword) {
      if (formData.newPassword.length < 3) {
        toast.error('New password must be at least 3 characters.');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error('New passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = {
        name: formData.name,
        contact: formData.contact,
        photo: formData.photo
      };
      if (formData.newPassword) {
        payload.password = formData.newPassword;
      }

      const { data } = await profileAPI.update(payload);
      setUser(data);
      setCurrentUserState(data);
      window.dispatchEvent(new Event('auth_user_updated'));
      setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
      toast.success('Administrator profile updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header Banner with Photo around Name & Admin Code/Email */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/50 p-0.5 bg-white shadow-sm shrink-0 flex items-center justify-center">
              {formData.photo || currentUser?.photo ? (
                <img
                  src={(formData.photo || currentUser?.photo)!}
                  alt={currentUser?.name || 'Administrator'}
                  className="w-full h-full object-cover rounded-xl"
                  data-testid="admin-header-avatar"
                />
              ) : (
                <div className="w-full h-full bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 font-bold text-xl">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight" data-testid="admin-profile-title">
                  {currentUser?.name || 'Admin Profile'}
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Master Administrator
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600 mt-2 font-medium">
                <span>Account / Email: <strong className="font-mono text-emerald-600 font-bold">{currentUser?.email || 'admin@attendance.edu'}</strong></span>
                <span className="text-slate-300">·</span>
                <span>Code: <strong className="font-mono text-slate-800">{currentUser?.student_code || 'ADMIN-01'}</strong></span>
                <span className="text-slate-300">·</span>
                <span>Role: <strong className="text-slate-800">Master Admin</strong></span>
              </div>
            </div>
          </div>

          <Link to="/admin/dashboard">
            <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold" data-testid="back-button">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Photo Card & Upload */}
          <Card className="glass-card flex flex-col items-center text-center p-6 space-y-4">
            <div className="relative group">
              <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-emerald-500/80 bg-slate-100 flex items-center justify-center shadow-md">
                {formData.photo ? (
                  <img src={formData.photo} alt="Admin Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-slate-400" />
                )}
              </div>
              <label
                htmlFor="admin-photo-upload"
                className="absolute inset-0 bg-slate-900/60 text-white rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-semibold"
              >
                <Upload className="w-5 h-5 mb-1" />
                Change Photo
              </label>
              <input
                id="admin-photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                data-testid="admin-photo-input"
              />
            </div>

            <label
              htmlFor="admin-photo-upload"
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Profile Photo
            </label>

            <div className="space-y-1 pt-2 border-t border-slate-200/80 w-full text-center">
              <h3 className="font-bold text-slate-900 text-sm">{currentUser?.name}</h3>
              <p className="text-xs font-mono text-emerald-600 font-bold">{currentUser?.student_code || 'MASTER ADMIN'}</p>
              <p className="text-[11px] text-slate-500 font-mono">{currentUser?.email}</p>
            </div>

            <div className="w-full p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-left text-xs">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Administrative Scope
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Full governance of events, student body rosters, officer authorization, clearance rules, and system audits.
              </p>
            </div>
          </Card>

          {/* Right Column: Edit Profile Form */}
          <Card className="glass-card md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-heading font-extrabold text-slate-900">
                Administrator Account Details
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Update your administrator profile name, contact phone, and security credentials.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="admin-name" className="text-xs font-bold text-slate-700">Display Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      id="admin-name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="pl-9"
                      data-testid="admin-name-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="admin-email" className="text-xs font-bold text-slate-700">Administrator Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        id="admin-email"
                        value={currentUser?.email || ''}
                        disabled
                        className="pl-9 bg-slate-100 text-slate-500 cursor-not-allowed font-mono text-xs"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">Institutional email format: example@psu.palawan.edu.ph</p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="admin-contact" className="text-xs font-bold text-slate-700">Contact Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        id="admin-contact"
                        placeholder="09123456789"
                        value={formData.contact}
                        onChange={e => setFormData({ ...formData, contact: e.target.value })}
                        className="pl-9"
                        data-testid="admin-contact-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Change Section */}
                <div className="pt-2 border-t border-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        Change Master Password
                      </h4>
                      <p className="text-[11px] text-slate-500">Leave blank if you don't wish to change your password.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="admin-new-pw" className="text-xs text-slate-600">New Password</Label>
                      <Input
                        id="admin-new-pw"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="New password (optional)"
                        value={formData.newPassword}
                        onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                        data-testid="admin-new-pw-input"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="admin-confirm-pw" className="text-xs text-slate-600">Confirm New Password</Label>
                      <Input
                        id="admin-confirm-pw"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Re-type new password"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                        data-testid="admin-confirm-pw-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 shadow-sm"
                    data-testid="save-admin-profile-btn"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving Administrator Profile...' : 'Save Profile Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
