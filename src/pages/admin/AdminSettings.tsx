import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings, Save, CheckCircle2, ShieldCheck, Clock, Award } from 'lucide-react';
import { Navbar } from '../../components/Navbar.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Label } from '../../components/ui/label.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { adminAPI } from '../../utils/api.ts';
import { toast } from 'sonner';

export const AdminSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    current_semester: '1st Semester 2026-2027',
    required_points: 50,
    academic_year: '2026-2027',
    late_threshold_minutes: 15
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getSettings();
      setFormData({
        current_semester: data.current_semester || '1st Semester 2026-2027',
        required_points: data.required_points || 50,
        academic_year: data.academic_year || '2026-2027',
        late_threshold_minutes: data.late_threshold_minutes || 15
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminAPI.updateSettings(formData);
      toast.success('System settings updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard">
            <Button variant="outline" size="sm" className="rounded-xl" data-testid="back-button">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight" data-testid="settings-title">
              System Settings
            </h1>
            <p className="text-xs text-slate-500 font-medium">Configure attendance system parameters, clearance thresholds, and current academic term.</p>
          </div>
        </div>

        <Card className="glass-card" data-testid="settings-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              Clearance Requirements & Semester Rules
            </CardTitle>
            <CardDescription className="text-xs">
              Set the minimum points required for student clearance and designate active academic parameters.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-slate-500 text-sm">Loading settings...</p>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-1.5">
                  <Label htmlFor="current-semester" className="text-xs font-bold text-slate-700">
                    Current Semester *
                  </Label>
                  <Input
                    id="current-semester"
                    value={formData.current_semester}
                    onChange={e => setFormData({ ...formData, current_semester: e.target.value })}
                    required
                    data-testid="current-semester-input"
                  />
                  <p className="text-[11px] text-slate-500">
                    This determines which semester is currently active for attendance check-ins and clearance tallying.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="required-points" className="text-xs font-bold text-slate-700">
                    Required Points Per Semester *
                  </Label>
                  <Input
                    id="required-points"
                    type="number"
                    min="1"
                    max="500"
                    value={formData.required_points}
                    onChange={e => setFormData({ ...formData, required_points: parseInt(e.target.value) || 0 })}
                    required
                    data-testid="required-points-input"
                  />
                  <p className="text-[11px] text-slate-500">
                    The minimum threshold of points students must accumulate across verified event participation to receive CLEARED status.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="academic-year" className="text-xs font-bold text-slate-700">
                      Academic Year
                    </Label>
                    <Input
                      id="academic-year"
                      placeholder="e.g., 2026-2027"
                      value={formData.academic_year}
                      onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="late-threshold" className="text-xs font-bold text-slate-700">
                      Late Arrival Grace Period (Minutes)
                    </Label>
                    <Input
                      id="late-threshold"
                      type="number"
                      min="0"
                      max="120"
                      value={formData.late_threshold_minutes}
                      onChange={e => setFormData({ ...formData, late_threshold_minutes: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                    data-testid="save-settings-button"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving System Settings...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
