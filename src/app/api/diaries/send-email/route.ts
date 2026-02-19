import { NextRequest, NextResponse } from 'next/server';
import { sendDiaryEmail } from '@/lib/diary/email';

export async function POST(req: NextRequest) {
  try {
    const params = await req.json();

    if (!params.to) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const { data, error } = await sendDiaryEmail(params);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

