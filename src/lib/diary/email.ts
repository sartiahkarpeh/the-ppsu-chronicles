import { Resend } from 'resend';

const FROM_EMAIL = 'Student Diaries <diaries@theppsuchronicles.com>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theppsuchronicles.com';

interface EmailParams {
  type: 'welcome' | 'new_post';
  to: string;
  subscriberName?: string;
  writerName?: string;
  writerId?: string;
  postTitle?: string;
  postUrl?: string;
  postSubtitle?: string;
  readTime?: number;
  unsubscribeUrl?: string;
  featuredImage?: string;
  contentPreview?: string;
  authorAvatar?: string;
  publishedAt?: string;
}

export async function sendDiaryEmail(params: EmailParams) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { type, to, subscriberName, writerName, writerId, postTitle, postUrl, postSubtitle, readTime, unsubscribeUrl } = params;

  let subject = '';
  let html = '';

  if (type === 'welcome') {
    subject = `Welcome to the Student Diaries Circle ✨`;
    const firstName = (subscriberName || 'there').split(' ')[0];
    html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;color:#1a1a1a;-webkit-font-smoothing:antialiased">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #f0f0f0;border-radius:12px;overflow:hidden">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding:40px 40px 20px;text-align:center">
              <div style="font-size:32px;margin-bottom:12px">📚</div>
              <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:1.5px;color:#FF6719;text-transform:uppercase">Student Diaries</p>
              <p style="margin:4px 0 0;font-size:14px;color:#6b6b6b">The PPSU Chronicles</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:20px 40px 40px">
              <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#111111;line-height:1.2">It's great to have you with us, ${firstName}.</h1>
              
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#333333">
                You've just joined the subscriber circle for <strong style="color: #111111">${writerName || 'one of our writers'}</strong>. We're thrilled to have you as part of our growing community of readers and student voices.
              </p>

              <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#333333">
                From now on, whenever <strong>${writerName || 'our student writers'}</strong> or anyone else in our diary circle shares a new story, we'll make sure it finds its way to your inbox. No noise, just authentic student experiences.
              </p>

              <!-- Writer context -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff8f5;border-radius:8px;margin-bottom:32px">
                <tr>
                  <td style="padding:24px;border-left:4px solid #FF6719">
                    <p style="margin:0 0 4px;font-size:14px;color:#FF6719;font-weight:600">Supporting Writer</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#111111">${writerName}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#666666">You can follow their journey and read past entries on their profile.</p>
                  </td>
                </tr>
              </table>

              <!-- Action -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${SITE_URL}/diaries/writers/${writerId}" style="display:inline-block;background-color:#1a1a1a;color:#ffffff;padding:16px 36px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;transition: background-color 0.2s">
                      Visit ${writerName ? writerName.split(' ')[0] : 'the'}'s Profile
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:40px;background-color:#ffffff;border-top:1px solid #f0f0f0;text-align:center">
              <p style="margin:0;font-size:14px;color:#999999;line-height:1.5">
                Sent with ❤️ from <a href="${SITE_URL}" style="color:#FF6719;text-decoration:none;font-weight:500">The PPSU Chronicles</a><br>
                P. P. Savani University, Dhamdod.
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:#cccccc">
                You received this because you subscribed to Student Diaries.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  } else if (type === 'new_post') {
    const { featuredImage, contentPreview, authorAvatar, publishedAt } = params;
    subject = `New from Student Diaries: ${postTitle}`;
    html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@700&display=swap');
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;color:#1a1a1a;-webkit-font-smoothing:antialiased">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:none;overflow:hidden">
          
          <!-- Author Header -->
          <tr>
            <td style="padding:0 0 32px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48" style="vertical-align:top">
                    ${authorAvatar ? `
                    <div style="width:40px;height:40px;border-radius:20px;overflow:hidden;background-color:#FF6719">
                      <img src="${authorAvatar}" alt="${writerName}" width="40" height="40" style="display:block;object-fit:cover" />
                    </div>` : `
                    <div style="width:40px;height:40px;border-radius:20px;background-color:#FF6719;display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:700;font-size:16px;text-align:center;line-height:40px">
                      ${writerName?.charAt(0).toUpperCase()}
                    </div>`}
                  </td>
                  <td style="padding-left:12px;vertical-align:middle">
                    <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a1a">${writerName} <span style="font-weight:400;color:#6b6b6b">shared a new story</span></p>
                    <p style="margin:2px 0 0;font-size:13px;color:#6b6b6b">
                      ${publishedAt || ''} ${publishedAt ? '•' : ''} ${readTime || 5} min read
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:0 0 24px">
              <h1 style="margin:0;font-size:36px;font-weight:700;color:#111111;line-height:1.2;font-family:'Lora', serif;letter-spacing:-0.02em">${postTitle}</h1>
            </td>
          </tr>

          <!-- Subtitle -->
          ${postSubtitle ? `
          <tr>
            <td style="padding:0 0 32px">
              <p style="margin:0;font-size:20px;line-height:1.5;color:#6b6b6b;font-weight:400">${postSubtitle}</p>
            </td>
          </tr>` : ''}

          <!-- Featured Image (16:9 Landscape) -->
          ${featuredImage ? `
          <tr>
            <td style="padding:0 0 40px">
              <div style="width:100%;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background-color:#f5f5f5">
                <img src="${featuredImage}" alt="${postTitle}" width="600" style="width:100%;height:auto;display:block;object-fit:cover" />
              </div>
            </td>
          </tr>` : ''}

          <!-- Content Preview -->
          ${contentPreview ? `
          <tr>
            <td style="padding:0 0 48px">
              <div style="font-size:18px;line-height:1.8;color:#1a1a1a;white-space:pre-wrap">
                ${contentPreview}
              </div>
              <div style="margin-top:24px">
                <a href="${postUrl || `${SITE_URL}/diaries`}" style="display:inline-block;color:#FF6719;text-decoration:none;font-weight:700;font-size:18px">
                  Read Full Post →
                </a>
              </div>
            </td>
          </tr>` : ''}

          <!-- Footer/Brand -->
          <tr>
            <td style="padding:48px 0 40px;border-top:1px solid #f0f0f0;text-align:center">
              <p style="margin:0;font-size:14px;color:#111111;font-weight:700;letter-spacing:1px;text-transform:uppercase">Student Diaries</p>
              <p style="margin:4px 0 32px;font-size:13px;color:#6b6b6b">The PPSU Chronicles</p>
              
              <p style="margin:0;font-size:12px;color:#999999;line-height:1.6">
                You're receiving this because you're subscribed to ${writerName}'s diary.<br>
                ${unsubscribeUrl ? `<a href="${unsubscribeUrl}" style="color:#666666;text-decoration:underline;margin-top:8px;display:inline-block">Unsubscribe</a>` : ''}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  return await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });
}
