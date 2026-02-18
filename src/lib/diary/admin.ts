import { getAdminDb } from '@/lib/firebaseAdmin';
import type { DiaryPost, DiaryProfile } from '@/types/diary';

export async function getPostAdmin(postId: string): Promise<DiaryPost | null> {
    const db = getAdminDb();
    if (!db) return null;

    const docSnap = await db.collection('diary_posts').doc(postId).get();
    if (!docSnap.exists) return null;

    const data = docSnap.data();
    return {
        postId: docSnap.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || null,
        updatedAt: data?.updatedAt?.toDate() || null,
        publishedAt: data?.publishedAt?.toDate() || null,
    } as any;
}

export async function getProfileAdmin(userId: string): Promise<DiaryProfile | null> {
    const db = getAdminDb();
    if (!db) return null;

    const docSnap = await db.collection('diary_profiles').doc(userId).get();
    if (!docSnap.exists) return null;

    const data = docSnap.data();
    return {
        userId: docSnap.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || null,
    } as any;
}
