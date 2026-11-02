import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, LogOut, User as UserIcon, Calendar, QrCode, Users, Shield, Settings, FileCheck, Megaphone } from 'lucide-react';
import { Button } from './ui/button.tsx';
import { getUser, logout, isAuthenticated } from '../utils/auth.ts';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUserState] = React.useState(getUser());
  const authenticated = isAuthenticated();

  React.useEffect(() => {
    const updateUser = () => setUserState(getUser());
    window.addEventListener('auth_user_updated', updateUser);
    window.addEventListener('storage', updateUser);
    return () => {
      window.removeEventListener('auth_user_updated', updateUser);
      window.removeEventListener('storage', updateUser);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    switch (user?.role) {
      case 'student':
        return '/student/dashboard';
      case 'officer':
        return '/officer/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  return (
    <nav className="backdrop-blur-xl bg-white/80 border-b border-slate-200/80 shadow-xs sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          {/* Brand Logo & Title */}
          <Link to={getDashboardLink()} className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-emerald-600/20 shadow-xs bg-white group-hover:scale-105 transition-transform">
              <img
                src="/assets/aistudio/image_3b71bef2.png"
                alt="College of Sciences College Student Government"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base md:text-lg font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2 leading-tight">
                Web-Based Attendance Monitoring System
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold hidden sm:inline">
                College of Sciences · College Student Government
              </span>
            </div>
          </Link>

          {/* Role Navigation Links (Desktop) */}
          {authenticated && user && (
            <div className="hidden md:flex items-center gap-1 text-sm font-medium">
              {user.role === 'student' && (
                <>
                  <Link
                    to="/student/dashboard"
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                      location.pathname === '/student/dashboard'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <Link
                    to="/student/clearance"
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                      location.pathname === '/student/clearance'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <FileCheck className="w-4 h-4" />
                    Clearance Form
                  </Link>
                  <Link
                    to="/student/profile"
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                      location.pathname === '/student/profile'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <UserIcon className="w-4 h-4" />
                    Profile
                  </Link>
                </>
              )}

              {user.role === 'officer' && (
                <>
                  <Link
                    to="/officer/dashboard"
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                      location.pathname === '/officer/dashboard'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/officer/scanner"
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                      location.pathname === '/officer/scanner'
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    Open QR Scanner
                  </Link>
                  <Link
                    to="/officer/profile"
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                      location.pathname === '/officer/profile'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <UserIcon className="w-4 h-4" />
                    Profile
                  </Link>
                </>
              )}

              {user.role === 'admin' && (
                <>
                  <Link
                    to="/admin/dashboard"
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      location.pathname === '/admin/dashboard'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/admin/events"
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                      location.pathname === '/admin/events'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Events
                  </Link>
                  <Link
                    to="/admin/students"
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                      location.pathname === '/admin/students'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Students
                  </Link>
                  <Link
                    to="/admin/officers"
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                      location.pathname === '/admin/officers'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Officers
                  </Link>
                  <Link
                    to="/admin/admins"
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      location.pathname === '/admin/admins'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Admins
                  </Link>
                  <Link
                    to="/admin/announcements"
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                      location.pathname === '/admin/announcements'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    Announcements
                  </Link>
                  <Link
                    to="/admin/settings"
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                      location.pathname === '/admin/settings'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Settings
                  </Link>
                  <Link
                    to="/admin/profile"
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                      location.pathname === '/admin/profile'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    Profile
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Right Profile & Actions */}
          <div className="flex items-center space-x-3">
            {authenticated && user ? (
              <>
                <Link
                  to={user.role === 'student' ? '/student/profile' : user.role === 'officer' ? '/officer/profile' : '/admin/profile'}
                  className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-emerald-500/40 bg-emerald-50 flex items-center justify-center shrink-0 shadow-xs">
                    {user.photo ? (
                      <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-emerald-700" />
                    )}
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="font-semibold text-slate-900 text-sm leading-tight flex items-center justify-end gap-1.5 group-hover:text-emerald-700 transition-colors">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-semibold tracking-wider uppercase font-mono">
                      {user.role} {user.student_code ? `· ${user.student_code}` : ''}
                    </p>
                  </div>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  data-testid="logout-button"
                  title="Logout"
                  className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/">
                  <Button variant="ghost" size="sm">Log In</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
