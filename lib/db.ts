import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'data', 'headspa.db');
  const fs = require('fs');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initDB(db);

  return db;
}

function initDB(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      duration INTEGER NOT NULL,
      price INTEGER NOT NULL,
      status TEXT DEFAULT 'confirmed',
      google_event_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS salon_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      salon_name TEXT DEFAULT 'Head Spa',
      salon_name_sub TEXT DEFAULT 'ヘッドスパ',
      catch_copy TEXT DEFAULT '至福のヘッドスパ体験',
      description TEXT DEFAULT '頭皮から美しく。心まで満たされる特別なひとときを。',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      line_url TEXT DEFAULT '',
      instagram_url TEXT DEFAULT '',
      hero_color TEXT DEFAULT '#C9A96E',
      logo_text TEXT DEFAULT 'HeadSpa',
      primary_color TEXT DEFAULT '#C9A96E',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      duration INTEGER NOT NULL,
      price INTEGER NOT NULL,
      description TEXT DEFAULT '',
      detail TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS business_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week INTEGER NOT NULL,
      is_open INTEGER DEFAULT 1,
      open_time TEXT DEFAULT '10:00',
      close_time TEXT DEFAULT '20:00',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS special_holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      reason TEXT DEFAULT '臨時休業',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS google_tokens (
      id INTEGER PRIMARY KEY DEFAULT 1,
      access_token TEXT DEFAULT '',
      refresh_token TEXT DEFAULT '',
      token_type TEXT DEFAULT 'Bearer',
      expiry_date INTEGER DEFAULT 0,
      scope TEXT DEFAULT '',
      connected_email TEXT DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS booking_rules (
      id INTEGER PRIMARY KEY DEFAULT 1,
      slot_interval INTEGER DEFAULT 30,
      max_bookings_per_slot INTEGER DEFAULT 1,
      min_advance_hours INTEGER DEFAULT 2,
      max_advance_days INTEGER DEFAULT 60,
      cancellation_hours INTEGER DEFAULT 24,
      booking_open INTEGER DEFAULT 1,
      booking_closed_message TEXT DEFAULT '現在予約を受け付けておりません',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`INSERT OR IGNORE INTO salon_settings (id) VALUES (1);`);
  db.exec(`INSERT OR IGNORE INTO booking_rules (id) VALUES (1);`);
  db.exec(`INSERT OR IGNORE INTO google_tokens (id) VALUES (1);`);

  const bhCount = db.prepare('SELECT COUNT(*) as count FROM business_hours').get() as { count: number };
  if (bhCount.count === 0) {
    db.exec(`
      INSERT INTO business_hours (day_of_week, is_open, open_time, close_time) VALUES
        (0, 0, '10:00', '20:00'),
        (1, 1, '10:00', '20:00'),
        (2, 1, '10:00', '20:00'),
        (3, 1, '10:00', '20:00'),
        (4, 1, '10:00', '20:00'),
        (5, 1, '10:00', '20:00'),
        (6, 1, '10:00', '20:00');
    `);
  }

  const svcCount = db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number };
  if (svcCount.count === 0) {
    db.exec(`
      INSERT INTO services (id, name, duration, price, description, sort_order) VALUES
        ('head-spa-60', 'ヘッドスパ 60分', 60, 8800, '頭皮クレンジング＋スパトリートメント', 1),
        ('head-spa-90', 'ヘッドスパ 90分', 90, 12100, '60分コース＋ヘッドマッサージ', 2),
        ('head-spa-120', 'プレミアムスパ 120分', 120, 16500, '全身リラクゼーション＋プレミアムトリートメント', 3),
        ('scalp-care', '頭皮ケア 45分', 45, 6600, '頭皮診断＋集中ケアトリートメント', 4);
    `);
  }
}
