import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Label } from './ui/label.tsx';
import { KeyRound, Mail, Lock, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck, Send, Sparkles } from 'lucide-react';
import { authAPI } from '../utils/api.ts';
import { toast } from 'sonner';

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordResetSuccess?: (identifier: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  open,
  onOpenChange,
  onPasswordResetSuccess
}) => {
  const [step, setStep] = useState<'find' | 'verify' | 'reset' | 'done'>('find');
  const [identifier, setIdentifier] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Verification details returned from server
  const [verifyData, setVerifyData] = useState<{
    email?: string;
    maskedEmail?: string;
    student_code?: string;
    name?: string;
    code?: string;
  } | null>(null);

  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleResetState = () => {
    setStep('find');
    setIdentifier('');
    setVerificationCode('');
    setErrorMsg(null);
    setVerifyData(null);
    setResetToken(null);
    setNewPassword('');
    setConfirmPassword('');
    setLoading(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      handleResetState();
    }
    onOpenChange(isOpen);
  };

  // Step 1: Request verification code to email
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const { data } = await authAPI.forgotPassword({ identifier: identifier.trim() });
      setVerifyData({
        email: data.email,
        maskedEmail: data.maskedEmail,
        student_code: data.student_code,
        name: data.name,
        code: data.code
      });
      setStep('verify');
      toast.success(`Verification code sent to ${data.maskedEmail || data.email}!`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'No active account matched the provided credentials.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code entered by user
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const { data } = await authAPI.verifyResetCode({
        identifier: identifier.trim(),
        code: verificationCode.trim()
      });
      setResetToken(data.resetToken);
      setStep('reset');
      toast.success('Code confirmed! You may now set your new password.');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Invalid verification code. Please check your email.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Configure new password
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken) return;

    if (newPassword.length < 3) {
      setErrorMsg('Password must be at least 3 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-type carefully.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await authAPI.resetPassword({ resetToken, newPassword });
      setStep('done');
      toast.success('Your password has been reset successfully!');
      if (onPasswordResetSuccess) {
        onPasswordResetSuccess(verifyData?.email || identifier);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to reset password. Please try again.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white border border-slate-200/90 shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="space-y-2 text-center pb-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
            {step === 'find' && <Mail className="w-6 h-6" />}
            {step === 'verify' && <ShieldCheck className="w-6 h-6" />}
            {step === 'reset' && <KeyRound className="w-6 h-6" />}
            {step === 'done' && <CheckCircle2 className="w-6 h-6" />}
          </div>
          <DialogTitle className="text-xl font-heading font-extrabold text-slate-900">
            {step === 'find' && 'Reset Account Password'}
            {step === 'verify' && 'Check Your Email'}
            {step === 'reset' && 'Create New Password'}
            {step === 'done' && 'Password Updated!'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {step === 'find' && 'Enter your university email or student code. We will send a 6-digit verification code to your inbox.'}
            {step === 'verify' && `We sent a 6-digit confirmation code to ${verifyData?.maskedEmail || 'your email'}. Enter it below to proceed.`}
            {step === 'reset' && 'Please choose and confirm a new secure password for your account.'}
            {step === 'done' && 'Your credentials have been securely updated. You can now log in.'}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Enter email/identifier */}
        {step === 'find' && (
          <form onSubmit={handleRequestCode} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-identifier" className="text-xs font-bold text-slate-700">
                Institutional Email or Student Code *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="forgot-identifier"
                  type="text"
                  placeholder="example@psu.palawan.edu.ph"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="pl-9 h-11 bg-slate-50 border-slate-200 text-sm focus-visible:ring-emerald-500"
                  required
                  autoFocus
                  data-testid="forgot-identifier-input"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Example: <strong className="text-slate-700 font-mono">example@psu.palawan.edu.ph</strong> or <strong className="text-slate-700 font-mono">SITE01</strong>
              </p>
            </div>

            <DialogFooter className="pt-2 sm:space-x-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)} className="rounded-xl text-xs font-semibold">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !identifier.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-5 shadow-xs"
                data-testid="send-code-button"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STEP 2: Enter Email Verification Code */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyCode} className="space-y-4 pt-1">
            {/* Notification of dispatched email */}
            <div className="p-3.5 bg-emerald-50/90 rounded-xl border border-emerald-200/90 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  Email Dispatched
                </span>
                <span className="font-mono text-emerald-700 text-[11px] font-semibold">
                  {verifyData?.student_code}
                </span>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                A 6-digit confirmation code has been sent to <strong>{verifyData?.maskedEmail}</strong>. Please check your inbox and enter the code below.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="verification-code" className="text-xs font-bold text-slate-700">
                6-Digit Verification Code *
              </Label>
              <Input
                id="verification-code"
                type="text"
                maxLength={6}
                placeholder="e.g., 123456"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="h-12 bg-slate-50 border-slate-200 text-center font-mono text-xl tracking-widest font-extrabold text-slate-900 focus-visible:ring-emerald-500"
                required
                autoFocus
                data-testid="verification-code-input"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Didn't receive the email?</span>
                <button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={loading}
                  className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Resend Code
                </button>
              </div>
            </div>

            <DialogFooter className="pt-2 sm:space-x-2">
              <Button type="button" variant="outline" onClick={() => setStep('find')} className="rounded-xl text-xs font-semibold">
                Change Email
              </Button>
              <Button
                type="submit"
                disabled={loading || verificationCode.length < 6}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-5 shadow-xs"
                data-testid="verify-code-button"
              >
                {loading ? 'Verifying Code...' : 'Verify Code & Proceed'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STEP 3: Set New Password */}
        {step === 'reset' && (
          <form onSubmit={handlePasswordReset} className="space-y-4 pt-1">
            <div className="p-3 bg-emerald-50/90 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900">{verifyData?.name || 'Account Verified'}</p>
                <p className="text-[11px] text-slate-600 font-mono">{verifyData?.email || identifier}</p>
              </div>
              <span className="font-mono text-emerald-700 font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-300 text-[11px] shadow-2xs">
                {verifyData?.student_code || 'VERIFIED'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-password" className="text-xs font-bold text-slate-700">
                  New Password *
                </Label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password (min. 3 characters)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="pl-9 h-11 bg-slate-50 border-slate-200 text-sm focus-visible:ring-emerald-500"
                  required
                  autoFocus
                  data-testid="new-password-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs font-bold text-slate-700">
                Confirm New Password *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-type your new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="pl-9 h-11 bg-slate-50 border-slate-200 text-sm focus-visible:ring-emerald-500"
                  required
                  data-testid="confirm-password-input"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 sm:space-x-2">
              <Button type="button" variant="outline" onClick={() => setStep('verify')} className="rounded-xl text-xs font-semibold">
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-5 shadow-xs"
                data-testid="save-new-password-button"
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STEP 4: Password Update Complete */}
        {step === 'done' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="font-heading font-extrabold text-slate-900 text-lg">Password Changed Successfully!</h4>
              <p className="text-xs text-slate-600">
                You can now log in using your newly configured password.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => handleClose(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 shadow-xs"
              data-testid="done-signin-button"
            >
              Back to Login
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
