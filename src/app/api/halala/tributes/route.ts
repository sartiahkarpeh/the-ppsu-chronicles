import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const MAX_MESSAGE = 1500;
const MAX_IMAGES = 5;

// Strip control chars (except tab and newline) and collapse excessive whitespace.
function clean(input: string): string {
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '')
    .replace(/[ \t]{3,}/g, '  ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

const baseFields = {
  name: z.string().trim().min(1, 'Please enter your name.').max(60),
  message: z
    .string()
    .trim()
    .min(3, 'Please write a short message.')
    .max(MAX_MESSAGE, `Please keep your message under ${MAX_MESSAGE} characters.`),
  country: z.string().trim().max(60).optional().default(''),
  images: z.array(z.string().url()).max(MAX_IMAGES).optional().default([]),
};

const createSchema = z.object({
  ...baseFields,
  // Honeypot — must stay empty. Bots tend to fill every field.
  website: z.string().max(0).optional().default(''),
});

const updateSchema = z.object({
  ...baseFields,
  id: z.string().min(1),
  editToken: z.string().min(1),
});

export type Tribute = {
  id: string;
  name: string;
  country: string;
  message: string;
  images: string[];
  createdAt: string;
  updatedAt?: string;
};

function mapTribute(id: string, data: FirebaseFirestore.DocumentData): Tribute {
  return {
    id,
    name: data.name || 'Anonymous',
    country: data.country || '',
    message: data.message || '',
    images: Array.isArray(data.images) ? data.images : [],
    createdAt:
      data.createdAt ||
      data.timestamp?.toDate?.().toISOString() ||
      new Date().toISOString(),
    updatedAt: data.updatedAt || undefined,
  };
}

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

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message || 'Please check your entry.';
      return NextResponse.json({ error: first }, { status: 400 });
    }

    const { name, message, country, images } = parsed.data;

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: 'The tribute wall is temporarily unavailable. Please try again soon.' },
        { status: 503 }
      );
    }

    // Secret token that lets the original author edit later (stored on their device).
    const editToken = randomUUID();
    const createdAt = new Date().toISOString();
    const doc = {
      name: clean(name),
      country: clean(country || ''),
      message: clean(message),
      images: images.slice(0, MAX_IMAGES),
      status: 'published' as const,
      editToken,
      createdAt,
      timestamp: FieldValue.serverTimestamp(),
    };

    const ref = await db.collection('halala_tributes').add(doc);

    return NextResponse.json({
      success: true,
      // editToken is returned ONLY here, so the author's browser can store it.
      editToken,
      tribute: mapTribute(ref.id, doc),
    });
  } catch (error) {
    console.error('Error saving Halala tribute:', error);
    return NextResponse.json(
      { error: 'Something went wrong while saving your tribute. Please try again.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message || 'Please check your entry.';
      return NextResponse.json({ error: first }, { status: 400 });
    }

    const { id, editToken, name, message, country, images } = parsed.data;

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: 'The tribute wall is temporarily unavailable. Please try again soon.' },
        { status: 503 }
      );
    }

    const ref = db.collection('halala_tributes').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'This tribute no longer exists.' }, { status: 404 });
    }

    // Only the author (holding the secret token) may edit.
    if (snap.data()?.editToken !== editToken) {
      return NextResponse.json(
        { error: 'You can only edit a tribute you posted from this device.' },
        { status: 403 }
      );
    }

    const updatedAt = new Date().toISOString();
    const update = {
      name: clean(name),
      country: clean(country || ''),
      message: clean(message),
      images: images.slice(0, MAX_IMAGES),
      updatedAt,
    };
    await ref.update(update);

    return NextResponse.json({
      success: true,
      tribute: mapTribute(id, { ...snap.data(), ...update }),
    });
  } catch (error) {
    console.error('Error updating Halala tribute:', error);
    return NextResponse.json(
      { error: 'Something went wrong while saving your changes. Please try again.' },
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
      .map((d) => mapTribute(d.id, d.data()));

    return NextResponse.json({ tributes });
  } catch (error) {
    console.error('Error fetching Halala tributes:', error);
    return NextResponse.json({ tributes: [] });
  }
}
