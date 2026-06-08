import type { InValue } from '@libsql/client';

// ---- Turso HTTP Pipeline API を直接使う ----
// @libsql/client はリードレプリカにルーティングされることがあり、
// サーバーレス環境で read-after-write 一貫性が保証されない。
// Turso HTTP Pipeline API を直接使うことで常にプライマリDBにアクセスする。

interface TursoRow {
  type: string;
  value: string | number | null;
}

interface TursoCol {
  name: string;
  decltype?: string;
}

interface TursoResult {
  cols: TursoCol[];
  rows: TursoRow[][];
  affected_row_count: number;
}

interface TursoResponse {
  results: Array<{
    type: string;
    response?: {
      type: string;
      result?: TursoResult;
    };
    error?: { message: string };
  }>;
}

function getTursoConfig() {
  const rawUrl = process.env.TURSO_DATABASE_URL || '';
  const authToken = process.env.TURSO_AUTH_TOKEN || '';

  // Convert any protocol to https
  let baseUrl = rawUrl;
  if (baseUrl.startsWith('libsql://')) {
    baseUrl = baseUrl.replace('libsql://', 'https://');
  } else if (!baseUrl.startsWith('https://')) {
    baseUrl = 'https://' + baseUrl;
  }

  return { baseUrl: baseUrl + '/v2/pipeline', authToken };
}

function convertRow(cols: TursoCol[], row: TursoRow[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  cols.forEach((col, i) => {
    const cell = row[i];
    if (cell === null || cell === undefined || cell.value === null) {
      obj[col.name] = null;
    } else if (cell.type === 'integer') {
      obj[col.name] = Number(cell.value);
    } else {
      obj[col.name] = cell.value;
    }
  });
  return obj;
}

async function tursoExecute(
  statements: Array<{ sql: string; args?: unknown[] }>
): Promise<TursoResult[]> {
  const { baseUrl, authToken } = getTursoConfig();

  const requests = statements.map((stmt) => ({
    type: 'execute' as const,
    stmt: {
      sql: stmt.sql,
      args: (stmt.args || []).map((a) => {
        if (a === null || a === undefined) return { type: 'null', value: null };
        if (typeof a === 'number') return { type: 'integer', value: String(a) };
        if (typeof a === 'boolean') return { type: 'integer', value: a ? '1' : '0' };
        return { type: 'text', value: String(a) };
      }),
    },
  }));

  // Add close request
  requests.push({ type: 'close' as const } as unknown as typeof requests[0]);

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Turso HTTP error ${res.status}: ${text}`);
  }

  const data: TursoResponse = await res.json();

  const results: TursoResult[] = [];
  for (const r of data.results) {
    if (r.type === 'ok' && r.response?.type === 'execute' && r.response.result) {
      results.push(r.response.result);
    } else if (r.type === 'error') {
      throw new Error(`Turso SQL error: ${r.error?.message || 'unknown'}`);
    }
    // Skip 'close' responses
  }

  return results;
}

// ---- 初期化 ----

let initialized = false;

async function initDB(): Promise<void> {
  if (initialized) return;

  const initStatements = [
    {
      sql: `CREATE TABLE IF NOT EXISTS bookings (
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
    )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS salon_settings (
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
    )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS services (
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
    )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS business_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week INTEGER NOT NULL,
      is_open INTEGER DEFAULT 1,
      open_time TEXT DEFAULT '10:00',
      close_time TEXT DEFAULT '20:00',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS special_holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      reason TEXT DEFAULT '臨時休業',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS google_tokens (
      id INTEGER PRIMARY KEY DEFAULT 1,
      access_token TEXT DEFAULT '',
      refresh_token TEXT DEFAULT '',
      token_type TEXT DEFAULT 'Bearer',
      expiry_date INTEGER DEFAULT 0,
      scope TEXT DEFAULT '',
      connected_email TEXT DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS booking_rules (
      id INTEGER PRIMARY KEY DEFAULT 1,
      slot_interval INTEGER DEFAULT 30,
      max_bookings_per_slot INTEGER DEFAULT 1,
      min_advance_hours INTEGER DEFAULT 2,
      max_advance_days INTEGER DEFAULT 60,
      cancellation_hours INTEGER DEFAULT 24,
      booking_open INTEGER DEFAULT 1,
      booking_closed_message TEXT DEFAULT '現在予約を受け付けておりません',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT DEFAULT '',
      color TEXT DEFAULT '#C9A96E',
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS staff_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT DEFAULT '10:00',
      end_time TEXT DEFAULT '20:00',
      is_off INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(staff_id, date)
    )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      gender TEXT DEFAULT '',
      birthday TEXT DEFAULT '',
      memo TEXT DEFAULT '',
      visit_count INTEGER DEFAULT 0,
      last_visit TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS customer_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT NOT NULL,
      booking_id TEXT DEFAULT '',
      staff_id TEXT DEFAULT '',
      staff_name TEXT DEFAULT '',
      date TEXT NOT NULL,
      service_name TEXT DEFAULT '',
      content TEXT DEFAULT '',
      scalp_condition TEXT DEFAULT '',
      treatment_detail TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    },
    { sql: `INSERT OR IGNORE INTO salon_settings (id) VALUES (1)` },
    { sql: `INSERT OR IGNORE INTO booking_rules (id) VALUES (1)` },
    { sql: `INSERT OR IGNORE INTO google_tokens (id) VALUES (1)` },
  ];

  await tursoExecute(initStatements);

  // 営業時間の初期データ
  const bhResult = await tursoExecute([
    { sql: 'SELECT COUNT(*) as count FROM business_hours' },
  ]);
  if (Number(bhResult[0].rows[0][0].value) === 0) {
    const bhInserts = [];
    for (let d = 0; d < 7; d++) {
      bhInserts.push({
        sql: 'INSERT INTO business_hours (day_of_week, is_open, open_time, close_time) VALUES (?, ?, ?, ?)',
        args: [d, d === 0 ? 0 : 1, '10:00', '20:00'] as unknown[],
      });
    }
    await tursoExecute(bhInserts);
  }

  // メニューの初期データ
  const svcResult = await tursoExecute([
    { sql: 'SELECT COUNT(*) as count FROM services' },
  ]);
  if (Number(svcResult[0].rows[0][0].value) === 0) {
    await tursoExecute([
      { sql: "INSERT INTO services (id, name, duration, price, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)", args: ['head-spa-60', 'ヘッドスパ 60分', 60, 8800, '頭皮クレンジング＋スパトリートメント', 1] },
      { sql: "INSERT INTO services (id, name, duration, price, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)", args: ['head-spa-90', 'ヘッドスパ 90分', 90, 12100, '60分コース＋ヘッドマッサージ', 2] },
      { sql: "INSERT INTO services (id, name, duration, price, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)", args: ['head-spa-120', 'プレミアムスパ 120分', 120, 16500, '全身リラクゼーション＋プレミアムトリートメント', 3] },
      { sql: "INSERT INTO services (id, name, duration, price, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)", args: ['scalp-care', '頭皮ケア 45分', 45, 6600, '頭皮診断＋集中ケアトリートメント', 4] },
    ]);
  }

  // bookingsテーブルにstaff_id, staff_name, customer_idカラムを追加（既存DBの移行用）
  try {
    await tursoExecute([
      { sql: "ALTER TABLE bookings ADD COLUMN staff_id TEXT DEFAULT ''" },
    ]);
  } catch { /* column already exists */ }
  try {
    await tursoExecute([
      { sql: "ALTER TABLE bookings ADD COLUMN staff_name TEXT DEFAULT ''" },
    ]);
  } catch { /* column already exists */ }
  try {
    await tursoExecute([
      { sql: "ALTER TABLE bookings ADD COLUMN customer_id TEXT DEFAULT ''" },
    ]);
  } catch { /* column already exists */ }
  try {
    await tursoExecute([
      { sql: "ALTER TABLE services ADD COLUMN image_url TEXT DEFAULT ''" },
    ]);
  } catch { /* column already exists */ }
  try {
    await tursoExecute([
      { sql: "ALTER TABLE customers ADD COLUMN referral_source TEXT DEFAULT ''" },
    ]);
  } catch { /* column already exists */ }
  try {
    await tursoExecute([
      { sql: "ALTER TABLE bookings ADD COLUMN referral_source TEXT DEFAULT ''" },
    ]);
  } catch { /* column already exists */ }

  // その他収入テーブル
  await tursoExecute([
    {
      sql: `CREATE TABLE IF NOT EXISTS other_income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      description TEXT DEFAULT '',
      amount INTEGER NOT NULL DEFAULT 0,
      staff_id TEXT DEFAULT '',
      staff_name TEXT DEFAULT '',
      customer_id TEXT DEFAULT '',
      customer_name TEXT DEFAULT '',
      memo TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    },
  ]);

  // 回数券テーブル
  await tursoExecute([
    {
      sql: `CREATE TABLE IF NOT EXISTS ticket_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      service_id TEXT DEFAULT '',
      service_name TEXT DEFAULT '',
      total_count INTEGER NOT NULL DEFAULT 5,
      price INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS customer_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT NOT NULL,
      customer_name TEXT DEFAULT '',
      ticket_plan_id TEXT DEFAULT '',
      plan_name TEXT DEFAULT '',
      service_name TEXT DEFAULT '',
      total_count INTEGER NOT NULL DEFAULT 5,
      used_count INTEGER DEFAULT 0,
      remaining_count INTEGER NOT NULL DEFAULT 5,
      purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT DEFAULT '',
      memo TEXT DEFAULT ''
    )`,
    },
  ]);

  initialized = true;
}

// ---- Public API (互換性維持) ----

export interface ResultSet {
  rows: Record<string, unknown>[];
  rowsAffected: number;
  columns: string[];
}

export async function dbExecute(sql: string, args?: Record<string, unknown> | unknown[]): Promise<ResultSet> {
  await initDB();
  const argsArr = args && Array.isArray(args) ? args : [];
  const results = await tursoExecute([{ sql, args: argsArr }]);
  const result = results[0];
  return {
    rows: result.rows.map((row) => convertRow(result.cols, row)),
    rowsAffected: result.affected_row_count,
    columns: result.cols.map((c) => c.name),
  };
}

export async function dbAll<T = Record<string, unknown>>(sql: string, args?: Record<string, unknown> | unknown[]): Promise<T[]> {
  const result = await dbExecute(sql, args);
  return result.rows as unknown as T[];
}

export async function dbGet<T = Record<string, unknown>>(sql: string, args?: Record<string, unknown> | unknown[]): Promise<T | undefined> {
  const rows = await dbAll<T>(sql, args);
  return rows[0];
}

export async function dbRun(sql: string, args?: Record<string, unknown> | unknown[]): Promise<ResultSet> {
  return dbExecute(sql, args);
}

/**
 * Run multiple statements in a single pipeline request.
 * All operations go directly to the Turso primary database.
 */
export async function dbBatch(statements: Array<{ sql: string; args?: unknown[] }>): Promise<ResultSet[]> {
  await initDB();
  const results = await tursoExecute(statements);
  return results.map((result) => ({
    rows: result.rows.map((row) => convertRow(result.cols, row)),
    rowsAffected: result.affected_row_count,
    columns: result.cols.map((c) => c.name),
  }));
}

// Re-export InValue type for compatibility
export type { InValue };
