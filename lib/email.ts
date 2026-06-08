import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || 'dummy');
}

interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  date: string;
  time: string;
  serviceName: string;
  duration: number;
  price: number;
  salonName: string;
  salonPhone: string;
  salonAddress: string;
  staffName?: string;
}

export async function sendBookingConfirmationEmail(data: BookingEmailData): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set, skipping email');
    return false;
  }

  if (!data.customerEmail) {
    console.log('No customer email, skipping');
    return false;
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const dateObj = new Date(data.date + 'T00:00:00+09:00');
  const dayName = dayNames[dateObj.getDay()];
  const formattedDate = `${data.date.replace(/-/g, '/')}（${dayName}）`;

  try {
    await getResend().emails.send({
      from: `${data.salonName} <${fromEmail}>`,
      to: [data.customerEmail],
      subject: `【予約確定】${formattedDate} ${data.time}〜 ${data.serviceName}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8f8f8;font-family:'Helvetica Neue',Arial,'Hiragino Sans',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#1A1A1A;padding:30px 20px;text-align:center;border-radius:12px 12px 0 0;">
      <h1 style="color:#C9A96E;font-size:24px;margin:0;letter-spacing:2px;">${data.salonName}</h1>
    </div>

    <div style="background:#fff;padding:30px 25px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <p style="font-size:16px;color:#333;margin:0 0 5px;">
        ${data.customerName} 様
      </p>
      <p style="font-size:14px;color:#666;margin:0 0 25px;line-height:1.8;">
        ご予約ありがとうございます。<br>
        以下の内容で予約が確定いたしました。
      </p>

      <div style="background:#faf8f5;border-left:4px solid #C9A96E;padding:20px;border-radius:0 8px 8px 0;margin-bottom:25px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#999;font-size:13px;width:80px;vertical-align:top;">日時</td>
            <td style="padding:8px 0;color:#333;font-size:15px;font-weight:600;">
              ${formattedDate}<br>${data.time}〜（${data.duration}分）
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#999;font-size:13px;vertical-align:top;">メニュー</td>
            <td style="padding:8px 0;color:#333;font-size:15px;">${data.serviceName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#999;font-size:13px;vertical-align:top;">料金</td>
            <td style="padding:8px 0;color:#333;font-size:15px;">¥${data.price.toLocaleString()}（税込）</td>
          </tr>
          ${data.staffName ? `
          <tr>
            <td style="padding:8px 0;color:#999;font-size:13px;vertical-align:top;">担当</td>
            <td style="padding:8px 0;color:#333;font-size:15px;">${data.staffName}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${data.salonAddress || data.salonPhone ? `
      <div style="border-top:1px solid #eee;padding-top:20px;margin-bottom:20px;">
        <p style="font-size:13px;color:#999;margin:0 0 8px;">サロン情報</p>
        ${data.salonAddress ? `<p style="font-size:14px;color:#333;margin:0 0 4px;">📍 ${data.salonAddress}</p>` : ''}
        ${data.salonPhone ? `<p style="font-size:14px;color:#333;margin:0;">📞 ${data.salonPhone}</p>` : ''}
      </div>
      ` : ''}

      <div style="background:#fff8e7;border-radius:8px;padding:15px;margin-bottom:20px;">
        <p style="font-size:13px;color:#8B6914;margin:0;line-height:1.8;">
          ⚠️ キャンセル・変更をご希望の場合は、お電話にてご連絡ください。
        </p>
      </div>

      <p style="font-size:12px;color:#999;margin:20px 0 0;text-align:center;">
        このメールは ${data.salonName} の予約システムから自動送信されています。
      </p>
    </div>
  </div>
</body>
</html>
      `.trim(),
    });

    console.log(`Booking confirmation email sent to ${data.customerEmail}`);
    return true;
  } catch (err) {
    console.error('Failed to send booking confirmation email:', err);
    return false;
  }
}
