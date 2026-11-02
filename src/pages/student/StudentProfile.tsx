import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Phone, Building, QrCode, Upload, Save, CheckCircle2 } from 'lucide-react';
import { Navbar } from '../../components/Navbar.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Label } from '../../components/ui/label.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select.tsx';
import { STUDENT_ORGANIZATIONS } from '../../utils/organizations.ts';
import { profileAPI, authAPI } from '../../utils/api.ts';
import { getUser, setUser } from '../../utils/auth.ts';
import { toast } from 'sonner';

export const StudentProfile: React.FC = () => {
  const [currentUser, setCurrentUserState] = useState(getUser());
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    contact: currentUser?.contact || '',
    organization: currentUser?.organization || '',
    year_level: currentUser?.year_level || '1st Year',
    photo: currentUser?.photo || ''
  });

  useEffect(() => {
    authAPI.getMe().then(({ data }) => {
      setCurrentUserState(data);
      setUser(data);
      setFormData({
        name: data.name || '',
        contact: data.contact || '',
        organization: data.organization || '',
        year_level: data.year_level || '1st Year',
        photo: data.photo || ''
      });
    }).catch(console.error);
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData(prev => ({ ...prev, photo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await profileAPI.update(formData);
      setUser(data);
      setCurrentUserState(data);
      window.dispatchEvent(new Event('auth_user_updated'));
      toast.success('Profile updated successfully!');
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
        {/* Top Header Banner with Student Photo around Name & Student Code */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/50 p-0.5 bg-white shadow-sm shrink-0 flex items-center justify-center">
              {formData.photo || currentUser?.photo ? (
                <img
                  src={(formData.photo || currentUser?.photo)!}
                  alt={currentUser?.name || 'Student Profile'}
                  className="w-full h-full object-cover rounded-xl"
                  data-testid="profile-header-avatar"
                />
              ) : (
                <div className="w-full h-full bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 font-bold text-xl">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
                {currentUser?.name || 'Student Profile'}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600 mt-2 font-medium">
                <span>Code: <strong className="font-mono text-emerald-600 font-bold">{currentUser?.student_code || 'N/A'}</strong></span>
                <span className="text-slate-300">·</span>
                <span>ID: <strong className="font-mono text-slate-800">{currentUser?.student_id || 'Not Assigned'}</strong></span>
                <span className="text-slate-300">·</span>
                <span>Year: <strong className="text-slate-800">{currentUser?.year_level || '1st Year'}</strong></span>
              </div>
            </div>
          </div>

          <Link to="/student/dashboard">
            <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold" data-testid="back-button">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: QR Code & Photo preview */}
          <Card className="glass-card flex flex-col items-center text-center p-6 space-y-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-emerald-500/80 bg-slate-100 flex items-center justify-center shadow-md">
                {formData.photo ? (
                  <img src={formData.photo} alt="Student Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-slate-400" />
                )}
              </div>
              <label
                htmlFor="photo-upload"
                className="absolute inset-0 bg-slate-900/50 text-white rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-semibold"
              >
                <Upload className="w-5 h-5 mb-1" />
                Change Photo
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                data-testid="photo-input"
              />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-900">{currentUser?.name}</h3>
              <p className="text-xs font-mono text-emerald-600 font-bold">{currentUser?.student_code}</p>
              <p className="text-[11px] text-slate-500">{currentUser?.email}</p>
            </div>

            {currentUser?.qr_code && (
              <div className="pt-4 border-t border-slate-200/80 w-full space-y-2">
                <p className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  Your Permanent QR
                </p>
                <div className="p-2 bg-white rounded-xl border border-slate-200 inline-block shadow-2xs">
                  <img
                    src={currentUser.qr_code.startsWith('data:') ? currentUser.qr_code : `data:image/png;base64,${currentUser.qr_code}`}
                    alt="Student QR Code"
                    className="w-28 h-28 object-contain"
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Right Column: Editable Profile Details */}
          <Card className="glass-card md:col-span-2" data-testid="profile-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-slate-900">Personal Information</CardTitle>
              <CardDescription className="text-xs">
                Keep your university contact details and organizational affiliation up to date.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-bold text-slate-700">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="name-input"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Student Code (Read-Only)</Label>
                    <Input
                      value={currentUser?.student_code || ''}
                      disabled
                      className="bg-slate-100 text-slate-600 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Student ID (Read-Only)</Label>
                    <Input
                      value={currentUser?.student_id || ''}
                      disabled
                      className="bg-slate-100 text-slate-600 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact" className="text-xs font-bold text-slate-700">Contact Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      id="contact"
                      className="pl-9"
                      placeholder="09123456789"
                      value={formData.contact}
                      onChange={e => setFormData({ ...formData, contact: e.target.value })}
                      data-testid="contact-input"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Department / Organization</Label>
                  <div data-testid="organization-select">
                    <Select
                      value={formData.organization}
                      onValueChange={(val: string) => setFormData({ ...formData, organization: val })}
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

                <div className="space-y-1.5">
                  <Label htmlFor="year_level" className="text-xs font-bold text-slate-700">Year Level</Label>
                  <Input
                    id="year_level"
                    value={formData.year_level}
                    onChange={e => setFormData({ ...formData, year_level: e.target.value })}
                    data-testid="year-level-input"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl mt-4"
                  data-testid="save-profile-button"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
