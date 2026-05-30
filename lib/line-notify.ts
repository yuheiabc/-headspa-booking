/**
 * LINE Messaging API を使って予約通知を送信する
 */

interface LineNotifyBookingData {
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  serviceName: string;
  duration: number;
  price: number;
  staffName?: string;
  notes?: string;
}

async function getAccessToken(): Promise<string | null> {
  // 環境変数にトークンがあればそれを使う
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return process.env.LINE_CHANNEL_ACCESS_TOKEN;
  }

  // なければ Channel ID + Secret から発行
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelId || !channelSecret) {
    return null;
  }

  try {
    const res = await fetch('https://api.line.me/v2/oauth/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${channelId}&client_secret=${channelSecret}`,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

export async function sendLineBookingNotification(data: LineNotifyBookingData): Promise<boolean> {
  const userId = process.env.LINE_NOTIFY_USER_ID;
  if (!userId) {
    console.log('LINE_NOTIFY_USER_ID not set, skipping LINE notification');
    return false;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.log('LINE access token not available, skipping notification');
    return false;
  }

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const dateObj = new Date(data.date + 'T00:00:00+09:00');
  const dayName = dayNames[dateObj.getDay()];

  const lines = [
    '🔔 新しい予約が入りました',
    '',
    `📅 ${data.date.replace(/-/g, '/')}（${dayName}）${data.time}〜`,
    `💆 ${data.serviceName}（${data.duration}分）`,
    `💰 ¥${data.price.toLocaleString()}`,
    '',
    `👤 ${data.customerName}`,
    `📞 ${data.customerPhone}`,
  ];

  if (data.staffName) {
    lines.push(`🙋 担当: ${data.staffName}`);
  }

  if (data.notes) {
    lines.push('', `📝 ${data.notes}`);
  }

  const message = lines.join('\n');

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: message,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('LINE push message failed:', res.status, errorText);
      return false;
    }

    console.log(`LINE notification sent to ${userId}`);
    return true;
  } catch (err) {
    console.error('Failed to send LINE notification:', err);
    return false;
  }
}
