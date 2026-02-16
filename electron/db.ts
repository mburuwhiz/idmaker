import Database from 'better-sqlite3'
import path from 'node:path'
import { app } from 'electron'

const dbPath = path.join(app.getPath('userData'), 'whizpoint.db')
console.log(`[DB] Opening database at: ${dbPath}`)
const db = new Database(dbPath)

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS printer_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    offsetX REAL DEFAULT 0,
    offsetY REAL DEFAULT 0,
    slot2YOffset REAL DEFAULT 0,
    scaleX REAL DEFAULT 1,
    scaleY REAL DEFAULT 1,
    isDefault INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT NOT NULL, -- JSON string of fabric objects
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    layoutId INTEGER,
    profileId INTEGER,
    dataSnapshot TEXT, -- Original Excel data if needed
    FOREIGN KEY(layoutId) REFERENCES layouts(id),
    FOREIGN KEY(profileId) REFERENCES printer_profiles(id)
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batchId INTEGER,
    admNo TEXT NOT NULL,
    data TEXT NOT NULL, -- JSON object of student details
    photoPath TEXT,
    printStatus TEXT DEFAULT 'pending', -- pending, printed, failed
    exceptionReason TEXT,
    FOREIGN KEY(batchId) REFERENCES batches(id)
  );
`)

// Insert default profile if none exists
const count = db.prepare('SELECT count(*) as count FROM printer_profiles').get() as { count: number }
if (count.count === 0) {
  db.prepare(`
    INSERT INTO printer_profiles (name, offsetX, offsetY, slot2YOffset, scaleX, scaleY, isDefault)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('Default Epson Tray', 0, 0, 0, 1, 1, 1)
}

export default db
