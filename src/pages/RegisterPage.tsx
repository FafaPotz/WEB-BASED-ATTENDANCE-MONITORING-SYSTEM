import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Lock, Mail, User, Phone, BookOpen, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.tsx';
import { STUDENT_ORGANIZATIONS } from '../utils/organizations.ts';
import { authAPI } from '../utils/api.ts';
import { setToken, setUser } from '../utils/auth.ts';
import { toast } from 'sonner';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    student_id: '',
    organization: STUDENT_ORGANIZATIONS[3].value, // Default to SITE
    year_level: '1st Year',
    contact: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const payload = {
      ...formData,
      role: 'student'
    };

    try {
      const { data } = await authAPI.register(payload);
      setToken(data.token);
      setUser(data.user);
      toast.success(`Account created! Welcome, ${data.user.name} (${data.user.student_code})!`);
      navigate('/student/dashboard');
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.message || 'Registration failed';
      setErrorMessage(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-slate-50 to-amber-50" />

      <Card className="w-full max-w-lg relative glass-card-heavy border border-white/60 shadow-2xl my-8">
        <CardHeader className="text-center space-y-2 pb-3">
          <Link to="/" className="inline-flex items-center text-xs text-slate-500 hover:text-emerald-700 self-start mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Login
          </Link>
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center p-1 bg-white border-2 border-emerald-600/30 shadow-md">
            <img
              src="/assets/aistudio/image_3b71bef2.png"
              alt="College of Sciences College Student Government"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight leading-tight">
            Web-Based Attendance Monitoring System
          </CardTitle>
          <CardDescription className="text-slate-600 text-xs font-semibold">
            College of Sciences · College Student Government
          </CardDescription>

          <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-center mt-2">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              Student Registration
            </div>
            <p className="text-[11px] text-emerald-700/90 font-medium mt-0.5">
              Create your official student account to access event check-ins, clearance tracking, and your QR pass.
            </p>
          </div>
        </CardHeader>

        <CardContent>
          {errorMessage && (
            <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs font-bold text-slate-700">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="name"
                  placeholder="e.g., Juan Dela Cruz"
                  className="pl-9"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-bold text-slate-700">University Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@psu.palawan.edu.ph"
                    className="pl-9"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500">e.g., example@psu.palawan.edu.ph</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-bold text-slate-700">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 3 characters"
                    className="pl-9"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="student_id" className="text-xs font-bold text-slate-700">
                  Student ID Number
                </Label>
                <Input
                  id="student_id"
                  placeholder="e.g., 2023-8-0117"
                  value={formData.student_id}
                  onChange={e => setFormData({ ...formData, student_id: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="contact" className="text-xs font-bold text-slate-700">Contact Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="contact"
                    placeholder="09123456789"
                    className="pl-9"
                    value={formData.contact}
                    onChange={e => setFormData({ ...formData, contact: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Department / Organization field */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Academic Department / Organization *</Label>
              <Select
                value={formData.organization}
                onValueChange={(val: string) => setFormData({ ...formData, organization: val })}
              >
                <SelectTrigger data-testid="org-select">
                  <SelectValue placeholder="Select Organization" />
                </SelectTrigger>
                <SelectContent>
                  {/* CSG and CS are removed for student registration */}
                  {STUDENT_ORGANIZATIONS.map(org => (
                    <SelectItem key={org.code} value={org.value}>
                      {org.label} ({org.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500">Pick your academic student organization.</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Year Level</Label>
              <Select
                value={formData.year_level}
                onValueChange={(val: string) => setFormData({ ...formData, year_level: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Year Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Year">1st Year</SelectItem>
                  <SelectItem value="2nd Year">2nd Year</SelectItem>
                  <SelectItem value="3rd Year">3rd Year</SelectItem>
                  <SelectItem value="4th Year">4th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl mt-2"
              data-testid="complete-register-btn"
            >
              {loading ? 'Creating Student Account & Pass...' : 'Complete Student Registration'}
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-slate-200/60 mt-4">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link to="/" className="font-bold text-emerald-600 hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
