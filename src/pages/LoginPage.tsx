import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Lock, Mail, QrCode, User, Eye, EyeOff, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.tsx';
import { authAPI } from '../utils/api.ts';
import { setToken, setUser } from '../utils/auth.ts';
import { toast } from 'sonner';
import { QRScanner } from '../components/QRScanner.tsx';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal.tsx';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'credentials' | 'qr'>('credentials');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: ''
  });

  const redirectToDashboard = (role: string) => {
    switch (role) {
      case 'student':
        navigate('/student/dashboard');
        break;
      case 'officer':
        navigate('/officer/dashboard');
        break;
      case 'admin':
        navigate('/admin/dashboard');
        break;
      default:
        navigate('/');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data } = await authAPI.login(credentials);
      setToken(data.token);
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      redirectToDashboard(data.user.role);
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.message || 'Login failed. Please verify credentials.';
      setErrorMessage(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = async (studentCode: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data } = await authAPI.qrLogin({ student_code: studentCode });
      setToken(data.token);
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      redirectToDashboard(data.user.role);
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'QR login failed. Student code not recognized.';
      setErrorMessage(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (identifier: string, pass: string) => {
    setCredentials({ identifier, password: pass });
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      {/* Dynamic Background Blurs */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-slate-50 to-amber-50" />
      <div className="absolute top-12 left-16 w-80 h-80 bg-emerald-300/25 rounded-full filter blur-3xl animate-pulse" />
      <div className="absolute bottom-12 right-16 w-80 h-80 bg-amber-300/25 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

      <Card className="w-full max-w-md relative glass-card-heavy border border-white/60 shadow-2xl" data-testid="login-card">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center p-1 bg-white border-2 border-emerald-600/30 shadow-lg shadow-emerald-600/15 transform hover:scale-105 transition-transform">
            <img
              src="/assets/aistudio/image_3b71bef2.png"
              alt="College of Sciences College Student Government"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div>
            <CardTitle className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight leading-tight">
              Web-Based Attendance Monitoring System
            </CardTitle>
            <CardDescription className="text-slate-600 font-semibold mt-1">
              College of Sciences · College Student Government
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Quick Demo Credentials Strip */}
          <div className="p-3 bg-slate-100/90 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                Quick Demo Accounts:
              </span>
              <span className="text-[10px] text-slate-400">Click to autofill</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setDemoAccount('SITE01', '123')}
                className="px-2 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-slate-700 font-semibold text-center transition-all shadow-xs"
              >
                🎓 Student
                <span className="block text-[10px] text-slate-400 font-mono">SITE01</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount('racion96@gmail.com', '123456')}
                className="px-2 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-slate-700 font-semibold text-center transition-all shadow-xs"
                title="Victor Racion Jr. (racion96@gmail.com)"
              >
                🛡️ Officer
                <span className="block text-[10px] text-slate-400 font-medium truncate">Victor Racion Jr.</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount('vracion29@gmail.com', 'admin123')}
                className="px-2 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-slate-700 font-semibold text-center transition-all shadow-xs"
                title="Victor Racion Jr. (vracion29@gmail.com)"
              >
                ⚙️ Admin
                <span className="block text-[10px] text-slate-400 font-medium truncate">Victor Racion Jr.</span>
              </button>
            </div>
          </div>

          {/* Error Message banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tabs for Credentials vs QR Code */}
          <Tabs value={loginMethod} onValueChange={(v: any) => setLoginMethod(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-200/70 p-1 rounded-xl">
              <TabsTrigger value="credentials" data-testid="credentials-tab" className="rounded-lg text-xs font-semibold py-2">
                <User className="w-4 h-4 mr-2" />
                Login
              </TabsTrigger>
              <TabsTrigger value="qr" data-testid="qr-tab" className="rounded-lg text-xs font-semibold py-2">
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </TabsTrigger>
            </TabsList>

            {/* Credentials Tab Content */}
            <TabsContent value="credentials" className="space-y-4 pt-2">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="identifier" className="text-xs font-bold text-slate-700">
                    Email or Student Code
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      id="identifier"
                      placeholder="e.g., SITE01 or example@psu.palawan.edu.ph"
                      className="pl-9 h-11 bg-white/90 border-slate-200 text-sm font-medium focus-visible:ring-emerald-500"
                      value={credentials.identifier}
                      onChange={e => setCredentials({ ...credentials, identifier: e.target.value })}
                      required
                      data-testid="identifier-input"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-bold text-slate-700">
                      Password
                    </Label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setForgotModalOpen(true)}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                        data-testid="forgot-password-link"
                      >
                        Forgot password?
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter account password"
                      className="pl-9 pr-10 h-11 bg-white/90 border-slate-200 text-sm font-medium focus-visible:ring-emerald-500"
                      value={credentials.password}
                      onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                      required
                      data-testid="password-input"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  data-testid="login-button"
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 text-sm tracking-wide transition-all"
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            {/* QR Code Tab Content */}
            <TabsContent value="qr" className="space-y-4 pt-2">
              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-100 text-center">
                <p className="text-xs font-semibold text-emerald-800">
                  Hold your Student QR Code up to the camera or upload a QR image to sign in.
                </p>
              </div>
              <QRScanner onScan={handleQRScan} isActive={loginMethod === 'qr'} hideManualEntry={true} theme="light" />
            </TabsContent>
          </Tabs>

          {/* Registration Footer */}
          <div className="text-center pt-2 border-t border-slate-200/60">
            <p className="text-xs text-slate-600">
              Don't have an account yet?{' '}
              <Link to="/register" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
                Register as Student
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        open={forgotModalOpen}
        onOpenChange={setForgotModalOpen}
        onPasswordResetSuccess={(id) => {
          setCredentials(prev => ({ ...prev, identifier: id, password: '' }));
        }}
      />
    </div>
  );
};
