import { google } from 'googleapis';
import { dbGet, dbRun } from './db';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
const ICAL_URL = process.env.GOOGLE_ICAL_URL || '';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

// --- OAuth2 ヘルパー ---

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';

  if (!clientId || !clientSecret) return null;

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(): string | null {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) return null;

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) throw new Error('OAuth2 client not configured');

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function saveTokensToDB(tokens: {
  access_token?: string | null;
  refresh_token?: string | null;
  token_type?: string | null;
  expiry_date?: number | null;
  scope?: string | null;
}, email?: string) {
  const now = new Date().toISOString();

  const existing = await dbGet<Record<string, unknown>>('SELECT * FROM google_tokens WHERE id = 1');

  const accessToken = tokens.access_token || (existing?.access_token as string) || '';
  const refreshToken = tokens.refresh_token || (existing?.refresh_token as string) || '';
  const tokenType = tokens.token_type || 'Bearer';
  const expiryDate = tokens.expiry_date || 0;
  const scope = tokens.scope || (existing?.scope as string) || '';
  const connectedEmail = email || (existing?.connected_email as string) || '';

  await dbRun(`
    UPDATE google_tokens SET
      access_token = ?, refresh_token = ?, token_type = ?,
      expiry_date = ?, scope = ?, connected_email = ?, updated_at = ?
    WHERE id = 1
  `, [accessToken, refreshToken, tokenType, expiryDate, scope, connectedEmail, now]);
}

export async function getTokensFromDB(): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  connected_email: string;
} | null> {
  const row = await dbGet<Record<string, unknown>>('SELECT * FROM google_tokens WHERE id = 1');
  if (!row || (!row.access_token && !row.refresh_token)) return null;

  return {
    access_token: (row.access_token as string) || '',
    refresh_token: (row.refresh_token as string) || '',
    expiry_date: (row.expiry_date as number) || 0,
    connected_email: (row.connected_email as string) || '',
  };
}

export async function clearTokensFromDB() {
  const now = new Date().toISOString();
  await dbRun(`
    UPDATE google_tokens SET
      access_token = '', refresh_token = '', token_type = 'Bearer',
      expiry_date = 0, scope = '', connected_email = '', updated_at = ?
    WHERE id = 1
  `, [now]);
}

async function getAuthenticatedClient() {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) return null;

  const tokens = await getTokensFromDB();
  if (!tokens || (!tokens.access_token && !tokens.refresh_token)) return null;

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  // トークンの有効期限が切れている場合はリフレッシュ
  if (tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      await saveTokensToDB({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || tokens.refresh_token,
        expiry_date: credentials.expiry_date,
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  return oauth2Client;
}

// --- カレンダー操作 ---

export async function addEventToCalendar(params: {
  name: string;
  phone: string;
  serviceName: string;
  price: number;
  date: string;
  time: string;
  duration: number;
  notes?: string;
}): Promise<string | null> {
  const auth = await getAuthenticatedClient();
  if (!auth) return null;

  try {
    const calendar = google.calendar({ version: 'v3', auth });
    const startDateTime = `${params.date}T${params.time}:00+09:00`;
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + params.duration * 60000);

    const event = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `【予約】${params.name} - ${params.serviceName}`,
        description: `電話: ${params.phone}\nメニュー: ${params.serviceName}\n料金: ¥${params.price.toLocaleString()}\nメモ: ${params.notes || 'なし'}`,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: 'Asia/Tokyo',
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: 'Asia/Tokyo',
        },
      },
    });

    return event.data.id || null;
  } catch (error) {
    console.error('Google Calendar event creation failed:', error);
    return null;
  }
}

export async function deleteEventFromCalendar(eventId: string): Promise<boolean> {
  const auth = await getAuthenticatedClient();
  if (!auth) return false;

  try {
    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId,
    });
    return true;
  } catch (error) {
    console.error('Google Calendar event deletion failed:', error);
    return false;
  }
}

export async function getCalendarEvents(date: string): Promise<Array<{ start: string; end: string }>> {
  // iCalフィード優先、なければGoogle Calendar API
  if (ICAL_URL) {
    return getEventsFromIcal(date);
  }

  const auth = await getAuthenticatedClient();
  if (!auth) return [];

  try {
    const calendar = google.calendar({ version: 'v3', auth });
    const timeMin = new Date(`${date}T00:00:00+09:00`).toISOString();
    const timeMax = new Date(`${date}T23:59:59+09:00`).toISOString();

    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return (response.data.items || [])
      .filter((e) => e.start?.dateTime && e.end?.dateTime)
      .map((e) => ({
        start: e.start!.dateTime!,
        end: e.end!.dateTime!,
      }));
  } catch (error) {
    console.error('Google Calendar events fetch failed:', error);
    return [];
  }
}

// --- iCal フィード連携 ---

let icalCache: { data: string; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchIcalData(): Promise<string> {
  if (icalCache && Date.now() - icalCache.fetchedAt < CACHE_TTL) {
    return icalCache.data;
  }

  try {
    const res = await fetch(ICAL_URL, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`iCal fetch failed: ${res.status}`);
    const data = await res.text();
    icalCache = { data, fetchedAt: Date.now() };
    return data;
  } catch (error) {
    console.error('iCal feed fetch failed:', error);
    return icalCache?.data || '';
  }
}

interface IcalEvent {
  summary: string;
  dtstart: Date | null;
  dtend: Date | null;
}

function parseIcalEvents(icalText: string): IcalEvent[] {
  const events: IcalEvent[] = [];
  const lines = unfoldIcalLines(icalText);

  let inEvent = false;
  let summary = '';
  let dtstart: Date | null = null;
  let dtend: Date | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      summary = '';
      dtstart = null;
      dtend = null;
    } else if (line === 'END:VEVENT') {
      if (inEvent && dtstart) {
        events.push({ summary, dtstart, dtend });
      }
      inEvent = false;
    } else if (inEvent) {
      if (line.startsWith('SUMMARY:')) {
        summary = line.slice(8);
      } else if (line.startsWith('DTSTART')) {
        dtstart = parseIcalDate(line);
      } else if (line.startsWith('DTEND')) {
        dtend = parseIcalDate(line);
      }
    }
  }

  return events;
}

function unfoldIcalLines(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const result: string[] = [];
  for (const line of raw.split('\n')) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && result.length > 0) {
      result[result.length - 1] += line.slice(1);
    } else {
      result.push(line);
    }
  }
  return result;
}

function parseIcalDate(line: string): Date | null {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return null;

  const params = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1).trim();

  if (!value) return null;

  const isDateOnly = params.includes('VALUE=DATE');

  if (isDateOnly) {
    const y = parseInt(value.slice(0, 4));
    const m = parseInt(value.slice(4, 6)) - 1;
    const d = parseInt(value.slice(6, 8));
    return new Date(y, m, d, 0, 0, 0);
  }

  const isUtc = value.endsWith('Z');
  const clean = value.replace('Z', '');

  const y = parseInt(clean.slice(0, 4));
  const m = parseInt(clean.slice(4, 6)) - 1;
  const d = parseInt(clean.slice(6, 8));
  const hh = parseInt(clean.slice(9, 11));
  const mm = parseInt(clean.slice(11, 13));
  const ss = parseInt(clean.slice(13, 15) || '0');

  if (isUtc) {
    return new Date(Date.UTC(y, m, d, hh, mm, ss));
  }

  const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}+09:00`;
  return new Date(iso);
}

async function getEventsFromIcal(date: string): Promise<Array<{ start: string; end: string }>> {
  try {
    const icalText = await fetchIcalData();
    if (!icalText) return [];

    const allEvents = parseIcalEvents(icalText);

    const dayStart = new Date(`${date}T00:00:00+09:00`);
    const dayEnd = new Date(`${date}T23:59:59+09:00`);

    return allEvents
      .filter((e) => {
        if (!e.dtstart) return false;
        const eventEnd = e.dtend || new Date(e.dtstart.getTime() + 60 * 60000);
        return e.dtstart < dayEnd && eventEnd > dayStart;
      })
      .map((e) => ({
        start: e.dtstart!.toISOString(),
        end: (e.dtend || new Date(e.dtstart!.getTime() + 60 * 60000)).toISOString(),
      }));
  } catch (error) {
    console.error('iCal events parsing failed:', error);
    return [];
  }
}
