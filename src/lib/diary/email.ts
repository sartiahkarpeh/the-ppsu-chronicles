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
    const { featuredImage, contentPreview } = params;
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
<body style="margin:0;padding:0;background-color:#fafafa;color:#1a1a1a;-webkit-font-smoothing:antialiased">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #f0f0f0;border-radius:12px;overflow:hidden">
          
          <!-- Featured Image -->
          ${featuredImage ? `
          <tr>
            <td>
              <img src="${featuredImage}" alt="${postTitle}" style="width:100%;height:300px;object-fit:cover;display:block" />
            </td>
          </tr>` : ''}

          <!-- Post Header -->
          <tr>
            <td style="padding:40px 40px 24px">
              <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:1.5px;color:#FF6719;text-transform:uppercase">Fresh from the community</p>
              <h1 style="margin:0 0 16px;font-size:32px;font-weight:700;color:#111111;line-height:1.2;font-family:'Lora', serif">${postTitle}</h1>
              <p style="margin:0;font-size:15px;color:#666666;line-height:1.5">By <strong>${writerName}</strong> • ${readTime || 5} min read</p>
            </td>
          </tr>

          <!-- Summary/Subtitle -->
          ${postSubtitle ? `
          <tr>
            <td style="padding:0 40px 24px">
              <p style="margin:0;font-size:18px;line-height:1.6;color:#444444;font-style:italic;font-weight:500">"${postSubtitle}"</p>
            </td>
          </tr>` : ''}

          <!-- Content Preview -->
          ${contentPreview ? `
          <tr>
            <td style="padding:0 40px 32px">
              <div style="font-size:16px;line-height:1.7;color:#333333;margin-bottom:24px">
                ${contentPreview}
                <div style="margin-top:16px;font-weight:600;color:#FF6719">...</div>
              </div>
            </td>
          </tr>` : ''}

          <!-- Action -->
          <tr>
            <td style="padding:0 40px 48px">
              <a href="${postUrl || `${SITE_URL}/diaries`}" style="display:inline-block;background-color:#FF6719;color:#ffffff;padding:18px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 12px rgba(255,103,25,0.2)">
                Read Full Post
              </a>
            </td>
          </tr>

          <!-- Footer/Brand -->
          <tr>
            <td style="padding:40px;background-color:#fafafa;border-top:1px solid #f0f0f0;text-align:center">
              <p style="margin:0;font-size:14px;color:#111111;font-weight:600">Student Diaries</p>
              <p style="margin:4px 0 24px;font-size:13px;color:#6b6b6b">The PPSU Chronicles</p>
              
              <div style="height:1px;background-color:#e5e5e5;width:60px;margin:0 auto 24px"></div>

              <p style="margin:0;font-size:12px;color:#999999;line-height:1.6">
                You're receiving this because you're subscribed to our student circle.<br>
                ${unsubscribeUrl ? `<a href="${unsubscribeUrl}" style="color:#666666;text-decoration:underline">Unsubscribe from these updates</a>` : ''}
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
