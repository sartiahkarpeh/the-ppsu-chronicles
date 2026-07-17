import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Strip control chars (except tab and newline) and collapse excessive whitespace.
function clean(input: string): string {
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '')
    .replace(/[ \t]{3,}/g, '  ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

const tributeSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name.').max(60),
  message: z
    .string()
    .trim()
    .min(3, 'Please write a short message.')
    .max(800, 'Please keep your message under 800 characters.'),
  country: z.string().trim().max(60).optional().default(''),
  // Honeypot — must stay empty. Bots tend to fill every field.
  website: z.string().max(0).optional().default(''),
});

export type Tribute = {
  id: string;
  name: string;
  country: string;
  message: string;
  createdAt: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    // Honeypot triggered — silently accept without storing so bots get no signal.
    if (typeof body.website === 'string' && body.website.length > 0) {
      return NextResponse.json({ success: true, tribute: null });
    }

    const parsed = tributeSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message || 'Please check your entry.';
      return NextResponse.json({ error: first }, { status: 400 });
    }

    const { name, message, country } = parsed.data;

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: 'The tribute wall is temporarily unavailable. Please try again soon.' },
        { status: 503 }
      );
    }

    const createdAt = new Date().toISOString();
    const doc = {
      name: clean(name),
      country: clean(country || ''),
      message: clean(message),
      status: 'published' as const,
      createdAt,
      timestamp: FieldValue.serverTimestamp(),
    };

    const ref = await db.collection('halala_tributes').add(doc);

    const tribute: Tribute = {
      id: ref.id,
      name: doc.name,
      country: doc.country,
      message: doc.message,
      createdAt,
    };

    return NextResponse.json({ success: true, tribute });
  } catch (error) {
    console.error('Error saving Halala tribute:', error);
    return NextResponse.json(
      { error: 'Something went wrong while saving your tribute. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ tributes: [] });
    }

    // Single-field orderBy (createdAt) needs only the automatic index; filter
    // status in code to avoid requiring a composite index.
    const snapshot = await db
      .collection('halala_tributes')
      .orderBy('createdAt', 'desc')
      .limit(300)
      .get();

    const tributes: Tribute[] = snapshot.docs
      .filter((d) => (d.data().status || 'published') === 'published')
      .slice(0, 200)
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || 'Anonymous',
          country: data.country || '',
          message: data.message || '',
          createdAt:
            data.createdAt ||
            data.timestamp?.toDate?.().toISOString() ||
            new Date().toISOString(),
        };
      });

    return NextResponse.json({ tributes });
  } catch (error) {
    console.error('Error fetching Halala tributes:', error);
    return NextResponse.json({ tributes: [] });
  }
}
