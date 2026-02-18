import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const FROM_EMAIL = 'Student Diaries <diaries@theppsuchronicles.com>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://theppsuchronicles.com';

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { type, to, subscriberName, writerName, writerId, postTitle, postUrl, postSubtitle, readTime, unsubscribeUrl } = await req.json();

    if (!to) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    let subject = '';
    let html = '';

    if (type === 'welcome') {
      subject = `Welcome to ${writerName}'s Diary ✨`;
      const firstName = (subscriberName || 'there').split(' ')[0];
      html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f8f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
        
        <!-- Header with gradient -->
        <tr><td style="background:linear-gradient(135deg,#FF6719 0%,#ff8f4f 50%,#ffb380 100%);padding:40px 32px;text-align:center">
          <div style="font-size:28px;margin-bottom:8px">📖</div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">Student Diaries</h1>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);font-weight:500">The PPSU Chronicles</p>
        </td></tr>

        <!-- Main Content -->
        <tr><td style="padding:36px 32px 24px">
          <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px">
            You're in, ${firstName}! 🎉
          </h2>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4a4a4a">
            You've successfully subscribed to <strong style="color:#1a1a1a">${writerName}</strong>'s diary. Every time they publish a new story, you'll get a beautifully crafted email straight to your inbox.
          </p>

          <!-- Writer Card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:12px;border:1px solid #f0f0f0;margin:0 0 24px">
            <tr><td style="padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40" valign="top">
                    <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#FF6719,#ff8f4f);display:flex;align-items:center;justify-content:center;text-align:center;line-height:40px;color:#fff;font-weight:700;font-size:16px">${(writerName || '?').charAt(0).toUpperCase()}</div>
                  </td>
                  <td style="padding-left:14px" valign="middle">
                    <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a1a">${writerName}</p>
                    <p style="margin:3px 0 0;font-size:12px;color:#6b6b6b">Student Writer · PPSU</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 16px">
              <a href="${SITE_URL}/diaries/writers/${writerId}" style="display:inline-block;background:#FF6719;color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.2px;box-shadow:0 4px 14px rgba(255,103,25,0.3)">
                View Their Profile →
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px"><div style="height:1px;background:#f0f0f0"></div></td></tr>

        <!-- What to Expect -->
        <tr><td style="padding:24px 32px">
          <h3 style="margin:0 0 14px;font-size:14px;font-weight:600;color:#1a1a1a;text-transform:uppercase;letter-spacing:0.8px">What to expect</h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#4a4a4a;line-height:1.5">
                <span style="margin-right:8px">📬</span> New post notifications delivered to your inbox
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#4a4a4a;line-height:1.5">
                <span style="margin-right:8px">✍️</span> Authentic stories from fellow students
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#4a4a4a;line-height:1.5">
                <span style="margin-right:8px">🔗</span> Quick links to read, like, and comment
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#fafafa;padding:24px 32px;text-align:center;border-top:1px solid #f0f0f0">
          <p style="margin:0;font-size:12px;color:#999;line-height:1.6">
            Student Diaries by <a href="${SITE_URL}" style="color:#FF6719;text-decoration:none;font-weight:500">The PPSU Chronicles</a>
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#bbb">
            P. P. Savani University · You subscribed to ${writerName}'s diary
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
    } else if (type === 'new_post') {
      subject = `${writerName} published: "${postTitle}"`;
      html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f8f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
        
        <!-- Header -->
        <tr><td style="padding:24px 32px;border-bottom:1px solid #f0f0f0">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="font-size:16px;font-weight:700;color:#1a1a1a">📖 Student Diaries</span></td>
              <td align="right"><span style="font-size:12px;color:#6b6b6b">${writerName}</span></td>
            </tr>
          </table>
        </td></tr>

        <!-- Post Content -->
        <tr><td style="padding:32px">
          <p style="margin:0 0 12px;font-size:13px;color:#FF6719;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">New Post</p>
          <h2 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3;letter-spacing:-0.3px">${postTitle}</h2>
          ${postSubtitle ? `<p style="margin:0 0 16px;font-size:15px;color:#6b6b6b;line-height:1.6">${postSubtitle}</p>` : ''}
          ${readTime ? `<p style="margin:0 0 28px;font-size:13px;color:#999">🕐 ${readTime} min read</p>` : '<div style="height:12px"></div>'}
          <a href="${postUrl || `${SITE_URL}/diaries`}" style="display:inline-block;background:#FF6719;color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;box-shadow:0 4px 14px rgba(255,103,25,0.3)">
            Read Now →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #f0f0f0">
          <p style="margin:0;font-size:12px;color:#999">
            <a href="${SITE_URL}" style="color:#FF6719;text-decoration:none">The PPSU Chronicles</a>
          </p>
          ${unsubscribeUrl ? `<p style="margin:6px 0 0;font-size:11px"><a href="${unsubscribeUrl}" style="color:#bbb;text-decoration:underline">Unsubscribe</a></p>` : ''}
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
    } else {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

