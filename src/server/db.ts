import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import QRCode from 'qrcode';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'scanlog.db');
export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for performance and concurrent reads
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'student' | 'officer' | 'admin'
  student_code TEXT,
  student_id TEXT,
  contact TEXT DEFAULT '',
  organization TEXT DEFAULT '',
  year_level TEXT DEFAULT '',
  photo TEXT,
  qr_code TEXT,
  nfc_id TEXT,
  is_active INTEGER DEFAULT 1,
  total_points INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  date TEXT NOT NULL,
  start_time TEXT DEFAULT '08:00',
  end_time TEXT DEFAULT '17:00',
  venue TEXT DEFAULT '',
  points INTEGER DEFAULT 10,
  timein_points INTEGER DEFAULT 5,
  timeout_points INTEGER DEFAULT 5,
  semester TEXT NOT NULL,
  organization TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  student_code TEXT NOT NULL,
  student_name TEXT NOT NULL,
  event_name TEXT NOT NULL,
  mode TEXT NOT NULL, -- 'TIMEIN' | 'TIMEOUT'
  timestamp TEXT NOT NULL,
  points INTEGER DEFAULT 5,
  status TEXT DEFAULT 'ON_TIME', -- 'ON_TIME' | 'LATE' | 'TIMEOUT_LOGGED'
  recorded_by TEXT DEFAULT '',
  semester TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bonus_points (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_code TEXT NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  semester TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT DEFAULT 'Admin',
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  organization TEXT DEFAULT 'College of Sciences',
  priority TEXT DEFAULT 'normal', -- 'normal' | 'high' | 'urgent'
  created_by TEXT DEFAULT 'Admin',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  timestamp TEXT NOT NULL
);
`);

// Generate base64 QR code for student
export async function generateQRCodeBase64(text: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(text, {
    width: 320,
    margin: 2,
    color: {
      dark: '#059669', // Emerald-600
      light: '#ffffff'
    }
  });
  // Strip data:image/png;base64,
  return dataUrl.replace(/^data:image\/png;base64,/, '');
}

// Seed Initial Data
export async function seedDatabase(forceReset = false) {
  if (forceReset) {
    console.log('[Database] Resetting all tables...');
    db.exec('DELETE FROM attendance;');
    db.exec('DELETE FROM bonus_points;');
    db.exec('DELETE FROM audit_logs;');
    db.exec('DELETE FROM announcements;');
    db.exec('DELETE FROM events;');
    db.exec('DELETE FROM users;');
  }

  const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = (userCountStmt.get() as { count: number }).count;

  if (userCount === 0) {
    console.log('[Database] Seeding fresh accounts and configuration...');
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password, name, role, student_code, student_id, contact, organization, year_level, photo, qr_code, is_active, total_points, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Master Admin: Victor Racion Jr. (vracion29@gmail.com / admin123)
    const adminId = 'admin-root-001';
    insertUser.run(
      adminId,
      'vracion29@gmail.com',
      'admin123',
      'Victor Racion Jr.',
      'admin',
      null,
      null,
      '09171234567',
      'College of Sciences',
      null,
      null,
      null,
      1,
      0,
      now,
      now
    );

    // 2. CSG Officer: Victor Racion Jr. (racion96@gmail.com / 123456)
    const officerId = 'officer-root-001';
    insertUser.run(
      officerId,
      'racion96@gmail.com',
      '123456',
      'Victor Racion Jr.',
      'officer',
      null,
      null,
      '09297795695',
      'College of Sciences · College Student Government',
      null,
      null,
      null,
      1,
      0,
      now,
      now
    );

    // 3. Students (Starting from 01 and continuous)
    // Student 1: SITE01 (Primary demo student)
    const student1Id = 'student-site-01';
    const student1Qr = await generateQRCodeBase64('SITE01');
    insertUser.run(
      student1Id,
      'juan.delacruz@psu.palawan.edu.ph',
      '123',
      'Juan Dela Cruz',
      'student',
      'SITE01',
      '2024-8-0001',
      '09123456789',
      'Society of Information Technology Enthusiasts',
      '1st Year',
      null,
      student1Qr,
      1,
      35,
      now,
      now
    );

    // Student 2: SITE02
    const student2Id = 'student-site-02';
    const student2Qr = await generateQRCodeBase64('SITE02');
    insertUser.run(
      student2Id,
      'maria.santos@psu.palawan.edu.ph',
      '123',
      'Maria Santos',
      'student',
      'SITE02',
      '2024-8-0002',
      '09181122334',
      'Society of Information Technology Enthusiasts',
      '2nd Year',
      null,
      student2Qr,
      1,
      25,
      now,
      now
    );

    // Student 3: ACS01
    const student3Id = 'student-acs-01';
    const student3Qr = await generateQRCodeBase64('ACS01');
    insertUser.run(
      student3Id,
      'john.cruz@psu.palawan.edu.ph',
      '123',
      'John Patrick Cruz',
      'student',
      'ACS01',
      '2024-8-0003',
      '09204455667',
      'Association of Computer Scientists',
      '1st Year',
      null,
      student3Qr,
      1,
      40,
      now,
      now
    );

    // Student 4: ESSA01 (Environmental Science Student Association)
    const student4Id = 'student-essa-01';
    const student4Qr = await generateQRCodeBase64('ESSA01');
    insertUser.run(
      student4Id,
      'clara.reyes@psu.palawan.edu.ph',
      '123',
      'Clara Elena Reyes',
      'student',
      'ESSA01',
      '2024-8-0004',
      '09357788990',
      'Environmental Science Student Association',
      '3rd Year',
      null,
      student4Qr,
      1,
      50,
      now,
      now
    );

    // Student 5: MBS01
    const student5Id = 'student-mbs-01';
    const student5Qr = await generateQRCodeBase64('MBS01');
    insertUser.run(
      student5Id,
      'mark.diaz@psu.palawan.edu.ph',
      '123',
      'Mark Anthony Diaz',
      'student',
      'MBS01',
      '2024-8-0005',
      '09451122334',
      'Marine Biologist Society',
      '2nd Year',
      null,
      student5Qr,
      1,
      20,
      now,
      now
    );

    // Student 6: YBA01
    const student6Id = 'student-yba-01';
    const student6Qr = await generateQRCodeBase64('YBA01');
    insertUser.run(
      student6Id,
      'sarah.flores@psu.palawan.edu.ph',
      '123',
      'Sarah Jane Flores',
      'student',
      'YBA01',
      '2024-8-0006',
      '09562233445',
      'Young Biologist Association',
      '4th Year',
      null,
      student6Qr,
      1,
      15,
      now,
      now
    );

    // Seed Events
    console.log('[Database] Seeding Science Month 2026 events...');
    const currentSemester = '1st Semester 2026-2027';
    const insertEvent = db.prepare(`
      INSERT INTO events (id, name, description, date, start_time, end_time, venue, points, timein_points, timeout_points, semester, organization, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Science Month 2026: Grand Opening
    const eventOpeningId = 'event-sm2026-opening';
    insertEvent.run(
      eventOpeningId,
      'Science Month 2026: Grand Opening',
      'Grand opening ceremony, banner parade, and keynote address kicking off Science Month 2026 for all College of Sciences students.',
      '2026-11-02',
      '08:00',
      '12:00',
      'University Gymnasium & Science Quadrangle',
      10,
      5,
      5,
      currentSemester,
      'College of Sciences · College Student Government',
      1,
      now
    );

    // 2. Science Month 2026: Day 1
    const eventDay1Id = 'event-sm2026-day1';
    insertEvent.run(
      eventDay1Id,
      'Science Month 2026: Day 1',
      'Science Month 2026 Day 1 activities: Inter-departmental Quiz Bee, laboratory exhibits, and scientific lecture series.',
      '2026-11-03',
      '08:00',
      '17:00',
      'College of Sciences Amphitheater & Laboratories',
      10,
      5,
      5,
      currentSemester,
      'College of Sciences · College Student Government',
      1,
      now
    );

    // 3. Science Month 2026: Day 2
    const eventDay2Id = 'event-sm2026-day2';
    insertEvent.run(
      eventDay2Id,
      'Science Month 2026: Day 2',
      'Science Month 2026 Day 2: Student research pitch, environmental innovation booth exhibits, and hackathon.',
      '2026-11-04',
      '08:00',
      '17:00',
      'CS Innovation Pavilion & Quadrangle',
      10,
      5,
      5,
      currentSemester,
      'College of Sciences · College Student Government',
      1,
      now
    );

    // 4. Science Month 2026: Closing
    const eventClosingId = 'event-sm2026-closing';
    insertEvent.run(
      eventClosingId,
      'Science Month 2026: Closing',
      'Grand closing ceremonies, presentation of awards, and recognition of outstanding student scientists and winners.',
      '2026-11-05',
      '13:00',
      '18:00',
      'University Auditorium',
      10,
      5,
      5,
      currentSemester,
      'College of Sciences · College Student Government',
      1,
      now
    );

    // Seed Attendance for EVERY student
    console.log('[Database] Seeding Science Month 2026 attendance for every student...');
    const insertAttendance = db.prepare(`
      INSERT INTO attendance (id, event_id, user_id, student_code, student_name, event_name, mode, timestamp, points, status, recorded_by, semester)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const allStudents = [
      { id: student1Id, code: 'SITE01', name: 'Juan Dela Cruz' },
      { id: student2Id, code: 'SITE02', name: 'Maria Santos' },
      { id: student3Id, code: 'ACS01', name: 'John Patrick Cruz' },
      { id: student4Id, code: 'ESSA01', name: 'Clara Elena Reyes' },
      { id: student5Id, code: 'MBS01', name: 'Mark Anthony Diaz' },
      { id: student6Id, code: 'YBA01', name: 'Sarah Jane Flores' },
    ];

    allStudents.forEach((stu, index) => {
      // Grand Opening TIMEIN
      const inTimeOpening = new Date('2026-11-02T08:05:00Z');
      inTimeOpening.setMinutes(inTimeOpening.getMinutes() + index * 4);
      insertAttendance.run(
        crypto.randomUUID(),
        eventOpeningId,
        stu.id,
        stu.code,
        stu.name,
        'Science Month 2026: Grand Opening',
        'TIMEIN',
        inTimeOpening.toISOString(),
        5,
        'ON_TIME',
        officerId,
        currentSemester
      );

      // Grand Opening TIMEOUT
      const outTimeOpening = new Date('2026-11-02T12:02:00Z');
      outTimeOpening.setMinutes(outTimeOpening.getMinutes() + index * 2);
      insertAttendance.run(
        crypto.randomUUID(),
        eventOpeningId,
        stu.id,
        stu.code,
        stu.name,
        'Science Month 2026: Grand Opening',
        'TIMEOUT',
        outTimeOpening.toISOString(),
        5,
        'TIMEOUT_LOGGED',
        officerId,
        currentSemester
      );

      // Day 1 TIMEIN
      const inTimeDay1 = new Date('2026-11-03T08:10:00Z');
      inTimeDay1.setMinutes(inTimeDay1.getMinutes() + index * 3);
      insertAttendance.run(
        crypto.randomUUID(),
        eventDay1Id,
        stu.id,
        stu.code,
        stu.name,
        'Science Month 2026: Day 1',
        'TIMEIN',
        inTimeDay1.toISOString(),
        5,
        'ON_TIME',
        officerId,
        currentSemester
      );

      // Day 1 TIMEOUT
      const outTimeDay1 = new Date('2026-11-03T17:03:00Z');
      outTimeDay1.setMinutes(outTimeDay1.getMinutes() + index * 2);
      insertAttendance.run(
        crypto.randomUUID(),
        eventDay1Id,
        stu.id,
        stu.code,
        stu.name,
        'Science Month 2026: Day 1',
        'TIMEOUT',
        outTimeDay1.toISOString(),
        5,
        'TIMEOUT_LOGGED',
        officerId,
        currentSemester
      );
    });

    // Seed Bonus Points for SITE01
    const insertBonus = db.prepare(`
      INSERT INTO bonus_points (id, student_id, student_code, points, reason, semester, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertBonus.run(
      crypto.randomUUID(),
      student1Id,
      'SITE01',
      15,
      'Volunteer committee support during Science Month 2026 preparation',
      currentSemester,
      now,
      'Victor Racion Jr.'
    );

    // Calculate and synchronize total points for all students
    for (const stu of allStudents) {
      const attSumStmt = db.prepare('SELECT COALESCE(SUM(points), 0) as total FROM attendance WHERE user_id = ? AND semester = ?');
      const attSum = (attSumStmt.get(stu.id, currentSemester) as { total: number }).total;
      const bonusSumStmt = db.prepare('SELECT COALESCE(SUM(points), 0) as total FROM bonus_points WHERE student_id = ? AND semester = ?');
      const bonusSum = (bonusSumStmt.get(stu.id, currentSemester) as { total: number }).total;
      db.prepare('UPDATE users SET total_points = ? WHERE id = ?').run(attSum + bonusSum, stu.id);
    }

    // Seed Settings
    const insertSetting = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
    `);
    insertSetting.run('current_semester', currentSemester);
    insertSetting.run('required_points', '50');
    insertSetting.run('academic_year', '2026-2027');
    insertSetting.run('late_threshold_minutes', '15');

    // Seed Announcements
    const insertAnnouncement = db.prepare(`
      INSERT INTO announcements (id, title, content, organization, priority, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertAnnouncement.run(
      crypto.randomUUID(),
      'Science Month 2026: Schedule of Activities & Attendance Protocol',
      'All students under the College of Sciences (SITE, ACS, ESSA, MBS, YBA) are invited and required to participate in Science Month 2026 events. Please present your digital QR code to CSG officers at the entry and exit gates. Points will be automatically credited towards semestral clearance.',
      'College of Sciences · College Student Government',
      'high',
      'Victor Racion Jr.',
      now
    );

    insertAnnouncement.run(
      crypto.randomUUID(),
      'Welcome to Academic Year 2026-2027',
      'Official Web-Based Attendance Monitoring System is active for the College of Sciences College Student Government. Please verify your student profile, view your clearance progress, and check your registered organization.',
      'College of Sciences · College Student Government',
      'normal',
      'Victor Racion Jr.',
      now
    );

    // Seed initial Audit Log
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, user_role, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertAudit.run(
      crypto.randomUUID(),
      adminId,
      'Victor Racion Jr.',
      'admin',
      'SYSTEM_INITIALIZED',
      'Database seeded with fresh demo accounts: Student (SITE01), Officer (Victor Racion Jr.), and Master Admin (Victor Racion Jr.).',
      now
    );

    console.log('[Database] Seeding completed successfully!');
  }
}
