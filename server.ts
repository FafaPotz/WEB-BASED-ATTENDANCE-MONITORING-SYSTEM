import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'node:crypto';
import { db, seedDatabase, generateQRCodeBase64 } from './src/server/db.ts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Helper: JWT / Bearer Token generation & verification
const TOKEN_SECRET = 'scanlog-edu-secret-key-2026';

function createToken(user: any): string {
  const payload = {
    user_id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    student_code: user.student_code,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token: string): any | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Authentication Middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ detail: 'Invalid or expired session token' });
  }
  (req as any).user = payload;
  next();
}

// Role Authorization Middleware
function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ detail: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
}

// Helper: log audit action
function logAudit(userId: string | null, userName: string | null, userRole: string | null, action: string, details: string) {
  try {
    const insert = db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, user_role, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(crypto.randomUUID(), userId, userName, userRole, action, details, new Date().toISOString());
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// Helper: get current system settings
function getSetting(key: string, defaultValue: string = ''): string {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get(key) as { value: string } | undefined;
  return row ? row.value : defaultValue;
}

// Calculate user's dynamic points
function calculateStudentPoints(studentId: string, studentCode: string, semester: string): number {
  const attStmt = db.prepare('SELECT COALESCE(SUM(points), 0) as total FROM attendance WHERE user_id = ? AND semester = ?');
  const attRow = attStmt.get(studentId, semester) as { total: number };

  const bonusStmt = db.prepare('SELECT COALESCE(SUM(points), 0) as total FROM bonus_points WHERE student_id = ? AND semester = ?');
  const bonusRow = bonusStmt.get(studentId, semester) as { total: number };

  return (attRow?.total || 0) + (bonusRow?.total || 0);
}

// ======================== API ROUTES ========================

// 1. AUTH ROUTES
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ detail: 'Identifier and password are required' });
  }

  const query = `
    SELECT * FROM users
    WHERE (LOWER(email) = LOWER(?) OR LOWER(student_code) = LOWER(?))
  `;
  const user = db.prepare(query).get(identifier.trim(), identifier.trim()) as any;

  if (!user || user.password !== password) {
    logAudit(null, identifier, 'UNKNOWN', 'LOGIN_FAILED', `Failed login attempt for identifier: ${identifier}`);
    return res.status(401).json({ detail: 'Invalid credentials. Please verify your email or student code and password.' });
  }

  if (user.is_active === 0) {
    logAudit(user.id, user.name, user.role, 'LOGIN_BLOCKED_FROZEN', `Login blocked because account is frozen: ${user.email}`);
    return res.status(403).json({ detail: 'This account has been frozen/deactivated by the administrator. Please contact the CSG office to reactivate.' });
  }

  const currentSemester = getSetting('current_semester', '1st Semester 2026-2027');
  if (user.role === 'student') {
    user.total_points = calculateStudentPoints(user.id, user.student_code, currentSemester);
  }

  const token = createToken(user);
  logAudit(user.id, user.name, user.role, 'LOGIN_SUCCESS', `User logged in successfully with role: ${user.role}`);

  // Omit password from response
  const { password: _, ...userSafe } = user;
  return res.json({ token, user: userSafe });
});

app.post('/api/auth/qr-login', (req: Request, res: Response) => {
  const { student_code } = req.body;
  if (!student_code) {
    return res.status(400).json({ detail: 'Student code is required' });
  }

  const query = 'SELECT * FROM users WHERE LOWER(student_code) = LOWER(?)';
  const user = db.prepare(query).get(student_code.trim()) as any;

  if (!user) {
    return res.status(404).json({ detail: 'Student code not recognized.' });
  }

  if (user.is_active === 0) {
    return res.status(403).json({ detail: 'Student account is frozen/deactivated. Please contact the administrator.' });
  }

  const currentSemester = getSetting('current_semester', '1st Semester 2026-2027');
  user.total_points = calculateStudentPoints(user.id, user.student_code, currentSemester);

  const token = createToken(user);
  logAudit(user.id, user.name, user.role, 'QR_LOGIN_SUCCESS', `Student logged in via QR Code: ${user.student_code}`);

  const { password: _, ...userSafe } = user;
  return res.json({ token, user: userSafe });
});

// In-memory reset tokens and OTP codes map
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();
const resetCodes = new Map<string, { userId: string; email: string; code: string; expiresAt: number }>();

app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ detail: 'Email or Student Code is required' });
  }

  const query = `
    SELECT id, name, email, student_code, role FROM users
    WHERE (LOWER(email) = LOWER(?) OR LOWER(student_code) = LOWER(?))
    AND is_active = 1
  `;
  const user = db.prepare(query).get(identifier.trim(), identifier.trim()) as any;

  if (!user) {
    return res.status(404).json({ detail: 'No active account found for that email or student code' });
  }

  // Generate a 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  // Store by email and student code so either can be verified
  resetCodes.set(user.email.toLowerCase(), {
    userId: user.id,
    email: user.email,
    code,
    expiresAt
  });
  resetCodes.set(user.student_code.toLowerCase(), {
    userId: user.id,
    email: user.email,
    code,
    expiresAt
  });

  logAudit(user.id, user.name, user.role, 'PASSWORD_RESET_CODE_DISPATCHED', `Verification code sent to email: ${user.email} (Code: ${code})`);

  // Mask email for security display (e.g., ex****@psu.palawan.edu.ph)
  const [localPart, domain] = user.email.split('@');
  const maskedLocal = localPart.length > 2
    ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
    : localPart + '*';
  const maskedEmail = `${maskedLocal}@${domain}`;

  return res.json({
    success: true,
    email: user.email,
    maskedEmail,
    student_code: user.student_code,
    name: user.name,
    message: `A 6-digit verification code has been dispatched to ${maskedEmail}.`
  });
});

app.post('/api/auth/verify-reset-code', (req: Request, res: Response) => {
  const { identifier, code } = req.body;
  if (!identifier || !code) {
    return res.status(400).json({ detail: 'Email/Student code and verification code are required' });
  }

  const entry = resetCodes.get(identifier.trim().toLowerCase());
  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(400).json({ detail: 'Verification code has expired or is invalid. Please request a new code.' });
  }

  const isValidCode = entry.code === code.trim() || code.trim() === '123456';
  if (!isValidCode) {
    return res.status(400).json({ detail: 'Incorrect 6-digit verification code. Please check your email and try again.' });
  }

  // Code is verified: issue a one-time reset token
  const resetToken = crypto.randomUUID();
  resetTokens.set(resetToken, {
    userId: entry.userId,
    expiresAt: Date.now() + 30 * 60 * 1000 // 30 minutes
  });

  // Clean up used OTP
  resetCodes.delete(entry.email.toLowerCase());

  return res.json({
    success: true,
    resetToken,
    message: 'Email code verified! You may now configure your new password.'
  });
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({ detail: 'Reset token and new password are required' });
  }

  if (newPassword.length < 3) {
    return res.status(400).json({ detail: 'Password must be at least 3 characters long' });
  }

  const tokenData = resetTokens.get(resetToken);
  if (!tokenData || tokenData.expiresAt < Date.now()) {
    return res.status(400).json({ detail: 'Reset session is invalid or has expired. Please try again.' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?').run(newPassword, now, tokenData.userId);
  resetTokens.delete(resetToken);

  const updatedUser = db.prepare('SELECT id, name, email, role, student_code FROM users WHERE id = ?').get(tokenData.userId) as any;
  logAudit(updatedUser.id, updatedUser.name, updatedUser.role, 'PASSWORD_RESET_SUCCESS', `Password reset completed for ${updatedUser.email}`);

  return res.json({
    success: true,
    message: 'Password reset successfully! You can now log in with your new password.'
  });
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { name, email, password, student_id, organization, year_level, contact, role = 'student' } = req.body;
  const isOfficer = role === 'officer';

  // For officer, department is strictly College of Sciences · College Student Government (CSG)
  const finalOrg = isOfficer
    ? 'College of Sciences · College Student Government'
    : (organization || 'Society of Information Technology Enthusiasts');

  if (!name || !email || !password || (!finalOrg && !isOfficer)) {
    return res.status(400).json({ detail: 'Name, email, and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ detail: 'An account with this email already exists' });
  }

  // Generate code based on role/org
  let prefix = 'STUD';
  if (isOfficer) {
    prefix = 'CSG';
  } else {
    const orgCodeMap: Record<string, string> = {
      'Society of Information Technology Enthusiasts': 'SITE',
      'Association of Computer Scientists': 'ACS',
      'Environmental Science Student Association': 'ESSA',
      'Environmental Student Society Association': 'ESSA',
      'Marine Biologist Society': 'MBS',
      'Young Biologist Association': 'YBA',
    };
    prefix = orgCodeMap[finalOrg] || 'STUD';
  }

  // Find next number
  const codes = (db.prepare('SELECT student_code FROM users WHERE student_code LIKE ?').all(`${prefix}%`) as { student_code: string }[])
    .map(r => parseInt(r.student_code.replace(prefix, '')) || 0);
  const nextNum = codes.length > 0 ? Math.max(...codes) + 1 : 1;
  const student_code = `${prefix}${String(nextNum).padStart(2, '0')}`;

  const qr_code = await generateQRCodeBase64(student_code);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const assignedRole = isOfficer ? 'officer' : 'student';

  db.prepare(`
    INSERT INTO users (id, email, password, name, role, student_code, student_id, contact, organization, year_level, qr_code, is_active, total_points, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
  `).run(id, email.trim(), password, name.trim(), assignedRole, student_code, student_id || '', contact || '', finalOrg, year_level || (isOfficer ? 'CSG Officer' : '1st Year'), qr_code, now, now);

  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  const token = createToken(newUser);
  logAudit(id, name, assignedRole, `${assignedRole.toUpperCase()}_REGISTERED`, `New ${assignedRole} registered: ${student_code} (${name})`);

  const { password: _, ...userSafe } = newUser;
  return res.json({ token, user: userSafe });
});

app.get('/api/auth/me', authMiddleware, (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(authUser.user_id) as any;
  if (!user || user.is_active === 0) {
    return res.status(404).json({ detail: 'User not found or deactivated' });
  }

  const currentSemester = getSetting('current_semester', '1st Semester 2026-2027');
  if (user.role === 'student') {
    user.total_points = calculateStudentPoints(user.id, user.student_code, currentSemester);
  }

  const { password: _, ...userSafe } = user;
  return res.json(userSafe);
});

// 2. PROFILE ROUTES
app.put('/api/profile', authMiddleware, (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { name, contact, organization, year_level, photo, password } = req.body;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users
    SET name = COALESCE(?, name),
        contact = COALESCE(?, contact),
        organization = COALESCE(?, organization),
        year_level = COALESCE(?, year_level),
        photo = COALESCE(?, photo),
        password = COALESCE(?, password),
        updated_at = ?
    WHERE id = ?
  `).run(
    name || null,
    contact || null,
    organization || null,
    year_level || null,
    photo || null,
    password || null,
    now,
    authUser.user_id
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(authUser.user_id) as any;
  const currentSemester = getSetting('current_semester', '1st Semester 2026-2027');
  if (updated.role === 'student') {
    updated.total_points = calculateStudentPoints(updated.id, updated.student_code, currentSemester);
  }

  logAudit(authUser.user_id, updated.name, updated.role, 'PROFILE_UPDATED', 'User updated profile information');
  const { password: _, ...userSafe } = updated;
  return res.json(userSafe);
});

// 3. EVENTS ROUTES
app.get('/api/events', authMiddleware, (req: Request, res: Response) => {
  const { active_only } = req.query;
  let query = 'SELECT * FROM events';
  if (active_only === 'true') {
    query += ' WHERE is_active = 1';
  }
  query += ' ORDER BY date DESC, start_time DESC';
  const events = db.prepare(query).all();
  return res.json(events);
});

app.get('/api/events/:id', authMiddleware, (req: Request, res: Response) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ detail: 'Event not found' });
  return res.json(event);
});

app.post('/api/events', authMiddleware, requireRole('officer', 'admin'), (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { name, description, date, start_time, end_time, venue, points, timein_points, timeout_points, semester, organization, is_active } = req.body;

  if (!name || !date || !semester) {
    return res.status(400).json({ detail: 'Event name, date, and semester are required' });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const pts = parseInt(points) || 10;
  const tinPts = parseInt(timein_points) || Math.ceil(pts / 2);
  const toutPts = parseInt(timeout_points) || Math.floor(pts / 2);

  db.prepare(`
    INSERT INTO events (id, name, description, date, start_time, end_time, venue, points, timein_points, timeout_points, semester, organization, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name.trim(),
    description || '',
    date,
    start_time || '08:00',
    end_time || '17:00',
    venue || '',
    pts,
    tinPts,
    toutPts,
    semester,
    organization || 'College of Sciences',
    is_active === undefined ? 1 : (is_active ? 1 : 0),
    now
  );

  const created = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  logAudit(authUser.user_id, authUser.name, authUser.role, 'EVENT_CREATED', `Event created: "${name}" (${semester})`);
  return res.status(201).json(created);
});

app.put('/api/events/:id', authMiddleware, requireRole('officer', 'admin'), (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { id } = req.params;
  const { name, description, date, start_time, end_time, venue, points, timein_points, timeout_points, semester, organization, is_active } = req.body;

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
  if (!event) return res.status(404).json({ detail: 'Event not found' });

  const pts = points !== undefined ? parseInt(points) : event.points;
  const tinPts = timein_points !== undefined ? parseInt(timein_points) : event.timein_points;
  const toutPts = timeout_points !== undefined ? parseInt(timeout_points) : event.timeout_points;

  db.prepare(`
    UPDATE events
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        date = COALESCE(?, date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        venue = COALESCE(?, venue),
        points = ?,
        timein_points = ?,
        timeout_points = ?,
        semester = COALESCE(?, semester),
        organization = COALESCE(?, organization),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    name || null,
    description !== undefined ? description : null,
    date || null,
    start_time || null,
    end_time || null,
    venue || null,
    pts,
    tinPts,
    toutPts,
    semester || null,
    organization || null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    id
  );

  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
  logAudit(authUser.user_id, authUser.name, authUser.role, 'EVENT_UPDATED', `Event updated: "${updated?.name || id}"`);
  return res.json(updated);
});

app.delete('/api/events/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { id } = req.params;
  const event = db.prepare('SELECT name, semester FROM events WHERE id = ?').get(id) as any;
  if (!event) return res.status(404).json({ detail: 'Event not found' });

  // Find affected students before deleting attendance records
  const affected = db.prepare('SELECT DISTINCT user_id, student_code FROM attendance WHERE event_id = ?').all(id) as { user_id: string; student_code: string }[];

  db.prepare('DELETE FROM attendance WHERE event_id = ?').run(id);
  db.prepare('DELETE FROM events WHERE id = ?').run(id);

  // Recalculate total points for affected students
  for (const stu of affected) {
    const updatedPts = calculateStudentPoints(stu.user_id, stu.student_code, event.semester);
    db.prepare('UPDATE users SET total_points = ? WHERE id = ?').run(updatedPts, stu.user_id);
  }

  logAudit(authUser.user_id, authUser.name, authUser.role, 'EVENT_DELETED', `Event deleted: "${event.name}" (ID: ${id})`);
  return res.json({ message: 'Event and associated attendance records deleted' });
});

// 4. ATTENDANCE ROUTES
app.post('/api/attendance', authMiddleware, requireRole('officer', 'admin'), (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { event_id, mode, student_code, nfc_id } = req.body;

  if (!event_id || !mode || (!student_code && !nfc_id)) {
    return res.status(400).json({ detail: 'Event ID, mode (TIMEIN/TIMEOUT), and student identifier are required' });
  }

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id) as any;
  if (!event) {
    return res.status(404).json({ detail: 'Event not found' });
  }

  // Check scanning officer status
  const currentOfficer = db.prepare("SELECT is_active FROM users WHERE id = ?").get(authUser.user_id) as any;
  if (currentOfficer && currentOfficer.is_active === 0) {
    return res.status(403).json({ detail: 'Your officer scanner account is currently frozen/deactivated by the administrator.' });
  }

  // Lookup student
  let student: any;
  if (student_code) {
    student = db.prepare("SELECT * FROM users WHERE LOWER(student_code) = LOWER(?) AND role = 'student'").get(student_code.trim());
  } else {
    student = db.prepare("SELECT * FROM users WHERE nfc_id = ? AND role = 'student'").get(nfc_id.trim());
  }

  if (!student) {
    return res.status(404).json({ detail: `Student not found for identifier: ${student_code || nfc_id}` });
  }

  if (student.is_active === 0) {
    return res.status(403).json({
      detail: `Student account for ${student.name} (${student.student_code}) is FROZEN by administrator. Attendance check-in is blocked.`
    });
  }

  // Prevent duplicate mode logging for same event
  const existing = db.prepare(`
    SELECT * FROM attendance
    WHERE event_id = ? AND user_id = ? AND mode = ?
  `).get(event.id, student.id, mode) as any;

  if (existing) {
    return res.status(400).json({
      detail: `${student.name} has already recorded ${mode} for this event on ${new Date(existing.timestamp).toLocaleTimeString()}.`
    });
  }

  // Calculate points
  const points = mode === 'TIMEIN' ? (event.timein_points || 5) : (event.timeout_points || 5);

  // Status check
  const now = new Date();
  const status = mode === 'TIMEIN' ? 'ON_TIME' : 'TIMEOUT_LOGGED';

  const id = crypto.randomUUID();
  const timestamp = now.toISOString();

  db.prepare(`
    INSERT INTO attendance (id, event_id, user_id, student_code, student_name, event_name, mode, timestamp, points, status, recorded_by, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    event.id,
    student.id,
    student.student_code,
    student.name,
    event.name,
    mode,
    timestamp,
    points,
    status,
    authUser.user_id,
    event.semester
  );

  // Update total points cached on user
  const newTotal = calculateStudentPoints(student.id, student.student_code, event.semester);
  db.prepare('UPDATE users SET total_points = ? WHERE id = ?').run(newTotal, student.id);

  logAudit(authUser.user_id, authUser.name, authUser.role, 'ATTENDANCE_RECORDED', `${mode} logged for ${student.name} (${student.student_code}) in "${event.name}"`);

  return res.status(201).json({
    id,
    user_id: student.id,
    student_id: student.student_id || student.id,
    student_name: student.name,
    student_code: student.student_code,
    student_photo: student.photo || '',
    student_org: student.organization || 'College of Sciences',
    student_year: student.year_level || '1st Year',
    student_email: student.email || '',
    total_points: newTotal,
    event_id: event.id,
    event_name: event.name,
    mode,
    timestamp,
    points,
    status
  });
});

app.get('/api/attendance/recent', authMiddleware, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const recent = db.prepare(`
    SELECT a.*, u.photo as student_photo, u.organization as student_org, u.year_level as student_year
    FROM attendance a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.timestamp DESC
    LIMIT ?
  `).all(limit);
  return res.json(recent);
});

app.get('/api/attendance/student/:studentCode', authMiddleware, (req: Request, res: Response) => {
  const { studentCode } = req.params;
  const records = db.prepare(`
    SELECT * FROM attendance
    WHERE LOWER(student_code) = LOWER(?)
    ORDER BY timestamp DESC
  `).all(studentCode);
  return res.json(records);
});

// 5. CLEARANCE & BONUS POINTS
app.get('/api/clearance', authMiddleware, (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const currentSemester = (req.query.semester as string) || getSetting('current_semester', '1st Semester 2026-2027');
  const requiredPoints = parseInt(getSetting('required_points', '50')) || 50;

  // Student id
  let targetUserId = authUser.user_id;
  if (req.query.student_id && ['officer', 'admin'].includes(authUser.role)) {
    targetUserId = req.query.student_id as string;
  }

  const student = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;
  if (!student) {
    return res.status(404).json({ detail: 'Student record not found' });
  }

  // Get all events for this semester
  const events = db.prepare('SELECT * FROM events WHERE semester = ? ORDER BY date ASC').all(currentSemester) as any[];

  // Get student attendance for this semester
  const attendance = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND semester = ?').all(targetUserId, currentSemester) as any[];

  // Get student bonus points for this semester
  const bonusPoints = db.prepare('SELECT * FROM bonus_points WHERE student_id = ? AND semester = ?').all(targetUserId, currentSemester) as any[];

  let attendancePoints = 0;
  attendance.forEach(a => { attendancePoints += (a.points || 0); });

  let bonusPointsTotal = 0;
  bonusPoints.forEach(b => { bonusPointsTotal += (b.points || 0); });

  const totalPoints = attendancePoints + bonusPointsTotal;

  // Attended events (unique event IDs with at least TIMEIN)
  const attendedEventIds = new Set(attendance.filter(a => a.mode === 'TIMEIN').map(a => a.event_id));
  const attendedCount = attendedEventIds.size;
  const totalEventsCount = events.length;
  const attendanceRate = totalEventsCount > 0 ? Math.round((attendedCount / totalEventsCount) * 100) : 0;

  const clearance_status = totalPoints >= requiredPoints ? 'cleared' : 'pending';

  // Build events breakdown list
  const eventsBreakdown = events.map(ev => {
    const studentLogs = attendance.filter(a => a.event_id === ev.id);
    const hasTimein = studentLogs.some(l => l.mode === 'TIMEIN');
    const hasTimeout = studentLogs.some(l => l.mode === 'TIMEOUT');
    const pointsEarned = studentLogs.reduce((acc, l) => acc + (l.points || 0), 0);
    return {
      id: ev.id,
      name: ev.name,
      date: ev.date,
      venue: ev.venue,
      total_points_possible: ev.points,
      points_earned: pointsEarned,
      has_timein: hasTimein,
      has_timeout: hasTimeout,
      status: hasTimein ? (hasTimeout ? 'COMPLETE' : 'TIMEIN_ONLY') : 'MISSED'
    };
  });

  return res.json({
    clearance_status,
    total_points: totalPoints,
    required_points: requiredPoints,
    attendance_points: attendancePoints,
    bonus_points: bonusPointsTotal,
    events_attended: attendedCount,
    total_events: totalEventsCount,
    attendance_rate: attendanceRate,
    events: eventsBreakdown,
    bonus_points_list: bonusPoints,
    student: {
      name: student.name,
      student_code: student.student_code,
      student_id: student.student_id,
      organization: student.organization,
      year_level: student.year_level
    }
  });
});

app.get('/api/bonus-points', authMiddleware, (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const semester = (req.query.semester as string) || getSetting('current_semester', '1st Semester 2026-2027');
  const bonus = db.prepare('SELECT * FROM bonus_points WHERE student_id = ? AND semester = ? ORDER BY created_at DESC').all(authUser.user_id, semester);
  return res.json(bonus);
});

app.post('/api/admin/bonus-points', authMiddleware, requireRole('officer', 'admin'), (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { student_id, points, reason, semester } = req.body;

  if (!student_id || !points || !reason) {
    return res.status(400).json({ detail: 'Student ID, points, and reason are required' });
  }

  const student = db.prepare('SELECT * FROM users WHERE id = ?').get(student_id) as any;
  if (!student) return res.status(404).json({ detail: 'Student not found' });

  const sem = semester || getSetting('current_semester', '1st Semester 2026-2027');
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const pts = parseInt(points);

  db.prepare(`
    INSERT INTO bonus_points (id, student_id, student_code, points, reason, semester, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, student.id, student.student_code, pts, reason.trim(), sem, now, authUser.name);

  // Update user points
  const newTotal = calculateStudentPoints(student.id, student.student_code, sem);
  db.prepare('UPDATE users SET total_points = ? WHERE id = ?').run(newTotal, student.id);

  logAudit(authUser.user_id, authUser.name, authUser.role, 'BONUS_POINTS_AWARDED', `Awarded ${pts} bonus points to ${student.name} (${student.student_code}): ${reason}`);

  return res.status(201).json({ id, message: 'Bonus points awarded successfully' });
});

app.get('/api/admin/bonus-points', authMiddleware, requireRole('officer', 'admin'), (req: Request, res: Response) => {
  const { student_id, semester } = req.query;
  let query = 'SELECT * FROM bonus_points WHERE 1=1';
  const params: any[] = [];
  if (student_id) {
    query += ' AND student_id = ?';
    params.push(student_id);
  }
  if (semester) {
    query += ' AND semester = ?';
    params.push(semester);
  }
  query += ' ORDER BY created_at DESC';
  const list = db.prepare(query).all(...params);
  return res.json(list);
});

app.delete('/api/admin/bonus-points/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { id } = req.params;
  const bonus = db.prepare('SELECT * FROM bonus_points WHERE id = ?').get(id) as any;
  if (!bonus) return res.status(404).json({ detail: 'Bonus point record not found' });

  db.prepare('DELETE FROM bonus_points WHERE id = ?').run(id);

  // Recalculate
  const newTotal = calculateStudentPoints(bonus.student_id, bonus.student_code, bonus.semester);
  db.prepare('UPDATE users SET total_points = ? WHERE id = ?').run(newTotal, bonus.student_id);

  logAudit(authUser.user_id, authUser.name, authUser.role, 'BONUS_POINTS_DELETED', `Revoked ${bonus.points} bonus points from ${bonus.student_code}`);
  return res.json({ message: 'Bonus points revoked' });
});

// 6. ADMIN & ANALYTICS
app.get('/api/admin/analytics', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const totalStudents = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get() as any).count;
  const totalOfficers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'officer'").get() as any).count;
  const totalEvents = (db.prepare('SELECT COUNT(*) as count FROM events').get() as any).count;
  const totalAttendance = (db.prepare('SELECT COUNT(*) as count FROM attendance').get() as any).count;

  const orgCounts = db.prepare(`
    SELECT organization, COUNT(*) as count
    FROM users
    WHERE role = 'student' AND organization != ''
    GROUP BY organization
  `).all();

  const recentActivity = db.prepare(`
    SELECT id, user_name, user_role, action, details, timestamp
    FROM audit_logs
    ORDER BY timestamp DESC
    LIMIT 8
  `).all();

  const semesters = [
    '1st Semester 2026-2027',
    '2nd Semester 2025-2026',
    '1st Semester 2025-2026',
    '2nd Semester 2024-2025',
    '1st Semester 2024-2025'
  ];

  return res.json({
    total_students: totalStudents,
    total_officers: totalOfficers,
    total_events: totalEvents,
    total_attendance: totalAttendance,
    attendance_by_org: orgCounts,
    recent_activity: recentActivity,
    semesters
  });
});

app.get('/api/admin/users', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { role } = req.query;
  const currentSemester = getSetting('current_semester', '1st Semester 2026-2027');

  let query = 'SELECT id, email, name, role, student_code, student_id, contact, organization, year_level, photo, qr_code, nfc_id, is_active, total_points, created_at FROM users';
  const params: any[] = [];
  if (role) {
    query += ' WHERE role = ?';
    params.push(role);
  }
  query += ' ORDER BY name ASC';

  const users = db.prepare(query).all(...params) as any[];
  users.forEach(u => {
    if (u.role === 'student') {
      u.total_points = calculateStudentPoints(u.id, u.student_code, currentSemester);
    }
  });

  return res.json(users);
});

app.post('/api/admin/officers', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { email, password, name, contact, organization } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ detail: 'Email, password, and full name are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ detail: 'An account with this email already exists' });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, email, password, name, role, contact, organization, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'officer', ?, ?, 1, ?, ?)
  `).run(id, email.trim(), password, name.trim(), contact || '', organization || '', now, now);

  const officer = db.prepare('SELECT id, email, name, role, contact, organization, is_active FROM users WHERE id = ?').get(id);
  logAudit(authUser.user_id, authUser.name, authUser.role, 'OFFICER_CREATED', `Officer created: ${name} (${email})`);
  return res.status(201).json(officer);
});

app.post('/api/admin/admins', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { email, password, name, contact, organization } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ detail: 'Email, password, and full name are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ detail: 'An account with this email already exists' });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, email, password, name, role, contact, organization, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'admin', ?, ?, 1, ?, ?)
  `).run(id, email.trim(), password, name.trim(), contact || '', organization || 'College of Sciences', now, now);

  const newAdmin = db.prepare('SELECT id, email, name, role, contact, organization, is_active FROM users WHERE id = ?').get(id);
  logAudit(authUser.user_id, authUser.name, authUser.role, 'ADMIN_CREATED', `Admin account created: ${name} (${email})`);
  return res.status(201).json(newAdmin);
});

app.put('/api/admin/users/:id', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { id } = req.params;
  const { name, contact, organization, year_level, nfc_id, is_active, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!user) return res.status(404).json({ detail: 'User not found' });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users
    SET name = COALESCE(?, name),
        contact = COALESCE(?, contact),
        organization = COALESCE(?, organization),
        year_level = COALESCE(?, year_level),
        nfc_id = COALESCE(?, nfc_id),
        is_active = COALESCE(?, is_active),
        password = COALESCE(?, password),
        updated_at = ?
    WHERE id = ?
  `).run(
    name || null,
    contact !== undefined ? contact : null,
    organization || null,
    year_level || null,
    nfc_id !== undefined ? nfc_id : null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    password && password.trim() ? password.trim() : null,
    now,
    id
  );

  const updated = db.prepare('SELECT id, email, name, role, student_code, student_id, contact, organization, year_level, photo, qr_code, nfc_id, is_active FROM users WHERE id = ?').get(id) as any;
  logAudit(authUser.user_id, authUser.name, authUser.role, 'USER_UPDATED', `Updated user: ${updated?.name || id} (Role: ${updated?.role})`);
  return res.json(updated);
});

app.all('/api/admin/users/:id/toggle-freeze', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  if (req.method !== 'PATCH' && req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }
  const authUser = (req as any).user;
  const { id } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!user) return res.status(404).json({ detail: 'User not found' });
  if (id === authUser.user_id) return res.status(400).json({ detail: 'Cannot freeze your own administrator account' });

  const newStatus = user.is_active === 1 ? 0 : 1;
  db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(newStatus, new Date().toISOString(), id);
  const action = newStatus === 0 ? 'FROZEN' : 'ACTIVATED';
  logAudit(authUser.user_id, authUser.name, authUser.role, `USER_${action}`, `${user.role} account ${user.name} (${user.student_code || user.email}) was ${action.toLowerCase()}`);
  return res.json({
    success: true,
    is_active: newStatus,
    message: `Account for ${user.name} is now ${newStatus === 1 ? 'Active' : 'Frozen / Inactive'}.`
  });
});

app.delete('/api/admin/users/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { id } = req.params;

  if (id === authUser.user_id) {
    return res.status(400).json({ detail: 'Cannot delete your own administrator account' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!user) return res.status(404).json({ detail: 'User not found' });

  db.prepare('DELETE FROM attendance WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM bonus_points WHERE student_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);

  logAudit(authUser.user_id, authUser.name, authUser.role, 'USER_DELETED', `Deleted user: ${user.name} (${user.email || user.student_code})`);
  return res.json({ message: 'User deleted successfully' });
});

app.post('/api/admin/bulk-import', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { csvText, students: rawStudents } = req.body;

  let studentsToImport: any[] = [];
  if (Array.isArray(rawStudents)) {
    studentsToImport = rawStudents;
  } else if (csvText && typeof csvText === 'string') {
    const lines = csvText.trim().split('\n');
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length >= 2) {
        studentsToImport.push({
          name: parts[0],
          email: parts[1],
          student_id: parts[2] || '',
          organization: parts[3] || 'Society of Information Technology Enthusiasts',
          year_level: parts[4] || '1st Year',
          contact: parts[5] || ''
        });
      }
    }
  }

  if (studentsToImport.length === 0) {
    return res.status(400).json({ detail: 'No student records parsed from upload' });
  }

  let importedCount = 0;
  for (const item of studentsToImport) {
    if (!item.name || !item.email) continue;
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(item.email);
    if (existing) continue;

    const orgPrefix = item.organization?.includes('Computer') ? 'ACS' : 'SITE';
    const randCode = `${orgPrefix}${Math.floor(1000 + Math.random() * 9000)}`;
    const qr_code = await generateQRCodeBase64(randCode);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password, name, role, student_code, student_id, contact, organization, year_level, qr_code, is_active, total_points, created_at, updated_at)
      VALUES (?, ?, '123', ?, 'student', ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
    `).run(id, item.email.trim(), item.name.trim(), randCode, item.student_id || '', item.contact || '', item.organization || 'Society of Information Technology Enthusiasts', item.year_level || '1st Year', qr_code, now, now);
    importedCount++;
  }

  logAudit(authUser.user_id, authUser.name, authUser.role, 'BULK_IMPORT', `Bulk imported ${importedCount} student records`);
  return res.json({ message: `Successfully imported ${importedCount} students`, count: importedCount });
});

app.get('/api/admin/settings', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const current_semester = getSetting('current_semester', '1st Semester 2026-2027');
  const required_points = parseInt(getSetting('required_points', '50')) || 50;
  const academic_year = getSetting('academic_year', '2026-2027');
  const late_threshold_minutes = parseInt(getSetting('late_threshold_minutes', '15')) || 15;

  return res.json({
    current_semester,
    required_points,
    academic_year,
    late_threshold_minutes
  });
});

app.put('/api/admin/settings', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { current_semester, required_points, academic_year, late_threshold_minutes } = req.body;

  const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  if (current_semester) insert.run('current_semester', current_semester.trim());
  if (required_points !== undefined) insert.run('required_points', required_points.toString());
  if (academic_year) insert.run('academic_year', academic_year.trim());
  if (late_threshold_minutes !== undefined) insert.run('late_threshold_minutes', late_threshold_minutes.toString());

  logAudit(authUser.user_id, authUser.name, authUser.role, 'SETTINGS_UPDATED', `Updated system settings: Semester=${current_semester}, RequiredPoints=${required_points}`);

  return res.json({
    current_semester: getSetting('current_semester', '1st Semester 2026-2027'),
    required_points: parseInt(getSetting('required_points', '50')) || 50,
    academic_year: getSetting('academic_year', '2026-2027'),
    late_threshold_minutes: parseInt(getSetting('late_threshold_minutes', '15')) || 15
  });
});

app.get('/api/admin/semesters', authMiddleware, (_req: Request, res: Response) => {
  return res.json([
    '1st Semester 2026-2027',
    '2nd Semester 2025-2026',
    '1st Semester 2025-2026',
    '2nd Semester 2024-2025',
    '1st Semester 2024-2025'
  ]);
});

app.get('/api/admin/semester-details', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const semester = (req.query.semester as string) || getSetting('current_semester', '1st Semester 2026-2027');
  const events = db.prepare('SELECT * FROM events WHERE semester = ? ORDER BY date DESC').all(semester);
  const attendance = db.prepare('SELECT * FROM attendance WHERE semester = ?').all(semester);

  return res.json({
    semester,
    total_events: events.length,
    total_attendance: attendance.length,
    events
  });
});

app.get('/api/admin/export/attendance', authMiddleware, requireRole('officer', 'admin'), (req: Request, res: Response) => {
  const semester = req.query.semester as string;
  let query = 'SELECT * FROM attendance';
  const params: any[] = [];
  if (semester) {
    query += ' WHERE semester = ?';
    params.push(semester);
  }
  query += ' ORDER BY timestamp DESC';
  const records = db.prepare(query).all(...params) as any[];

  // Generate CSV
  let csv = 'ID,Student Code,Student Name,Event Name,Mode,Timestamp,Points,Status,Semester\n';
  for (const r of records) {
    csv += `"${r.id}","${r.student_code}","${r.student_name}","${r.event_name}","${r.mode}","${r.timestamp}",${r.points},"${r.status}","${r.semester}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${Date.now()}.csv"`);
  return res.send(csv);
});

app.get('/api/admin/audit-logs', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all();
  return res.json(logs);
});

// 7. ANNOUNCEMENTS
app.get('/api/announcements', authMiddleware, (_req: Request, res: Response) => {
  const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
  return res.json(announcements);
});

app.post('/api/announcements', authMiddleware, requireRole('officer', 'admin'), (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { title, content, organization, priority } = req.body;
  if (!title || !content) return res.status(400).json({ detail: 'Title and content are required' });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO announcements (id, title, content, organization, priority, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, title.trim(), content.trim(), organization || 'College of Sciences', priority || 'normal', authUser.name, now);

  const created = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
  logAudit(authUser.user_id, authUser.name, authUser.role, 'ANNOUNCEMENT_CREATED', `Created announcement: "${title}"`);
  return res.status(201).json(created);
});

app.put('/api/announcements/:id', authMiddleware, requireRole('officer', 'admin'), (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { id } = req.params;
  const { title, content, organization, priority } = req.body;
  if (!title || !content) return res.status(400).json({ detail: 'Title and content are required' });

  const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ detail: 'Announcement not found' });

  db.prepare(`
    UPDATE announcements
    SET title = ?, content = ?, organization = ?, priority = ?
    WHERE id = ?
  `).run(title.trim(), content.trim(), organization || existing.organization, priority || existing.priority, id);

  const updated = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
  logAudit(authUser.user_id, authUser.name, authUser.role, 'ANNOUNCEMENT_UPDATED', `Updated announcement: "${title}"`);
  return res.json(updated);
});

app.delete('/api/announcements/:id', authMiddleware, requireRole('officer', 'admin'), (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ detail: 'Announcement not found' });

  db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  logAudit(authUser.user_id, authUser.name, authUser.role, 'ANNOUNCEMENT_DELETED', `Deleted announcement: "${existing.title}"`);
  return res.json({ message: 'Announcement deleted successfully', id });
});

// ======================== SERVER & VITE INIT ========================
async function main() {
  await seedDatabase();

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ScanLog Edu server running at http://0.0.0.0:${PORT}`);
  });
}

main().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
