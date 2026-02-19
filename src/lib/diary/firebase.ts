// src/lib/diary/firebase.ts
// All Firestore CRUD operations for diary collections

import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
    query, where, orderBy, limit, startAfter, increment, onSnapshot,
    serverTimestamp, Timestamp, DocumentData, QueryDocumentSnapshot,
    writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/config';
import type {
    DiaryProfile, DiaryPost, DiaryFollow, DiaryLike,
    DiaryComment, DiaryNotification, DiaryReport, DiaryBookmark,
    DiarySubscription,
} from '@/types/diary';

// ─── Collections ───────────────────────────────────────────────
const PROFILES = 'diary_profiles';
const POSTS = 'diary_posts';
const FOLLOWS = 'diary_follows';
const LIKES = 'diary_likes';
const COMMENTS = 'diary_comments';
const NOTIFICATIONS = 'diary_notifications';
const REPORTS = 'diary_reports';
const BOOKMARKS = 'diary_bookmarks';
const SUBSCRIPTIONS = 'diary_subscriptions';

// ─── Profiles ──────────────────────────────────────────────────
export async function getProfile(userId: string): Promise<DiaryProfile | null> {
    const snap = await getDoc(doc(db, PROFILES, userId));
    return snap.exists() ? ({ userId: snap.id, ...snap.data() } as DiaryProfile) : null;
}

export async function createProfile(profile: DiaryProfile): Promise<void> {
    await setDoc(doc(db, PROFILES, profile.userId), {
        ...profile,
        createdAt: serverTimestamp(),
    });
}

export async function updateProfile(userId: string, data: Partial<DiaryProfile>): Promise<void> {
    await updateDoc(doc(db, PROFILES, userId), data as DocumentData);
}

export async function getWriters(limitCount: number = 20): Promise<DiaryProfile[]> {
    const q = query(
        collection(db, PROFILES),
        where('role', '==', 'writer'),
        orderBy('followersCount', 'desc'),
        limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ userId: d.id, ...d.data() } as DiaryProfile));
}

// ─── Posts ──────────────────────────────────────────────────────
export async function createPost(post: Omit<DiaryPost, 'postId'>): Promise<string> {
    const docRef = await addDoc(collection(db, POSTS), {
        ...post,
        updatedAt: serverTimestamp(),
    });
    // Set postId to match document ID
    await updateDoc(docRef, { postId: docRef.id });
    return docRef.id;
}

export async function updatePost(postId: string, data: Partial<DiaryPost>): Promise<void> {
    await updateDoc(doc(db, POSTS, postId), {
        ...data,
        updatedAt: serverTimestamp(),
    } as DocumentData);
}

export async function deletePost(postId: string): Promise<void> {
    await deleteDoc(doc(db, POSTS, postId));
}

export async function getPost(postId: string): Promise<DiaryPost | null> {
    const snap = await getDoc(doc(db, POSTS, postId));
    return snap.exists() ? ({ postId: snap.id, ...snap.data() } as DiaryPost) : null;
}

export async function getAllPosts(limitCount: number = 100): Promise<DiaryPost[]> {
    const q = query(
        collection(db, POSTS),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ postId: d.id, ...d.data() } as DiaryPost));
}

export async function getPublishedPosts(
    limitCount: number = 20,
    lastDoc?: QueryDocumentSnapshot
): Promise<{ posts: DiaryPost[]; lastVisible: QueryDocumentSnapshot | null }> {
    let q = query(
        collection(db, POSTS),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
    );
    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snap = await getDocs(q);
    const posts = snap.docs.map(d => ({ postId: d.id, ...d.data() } as DiaryPost));
    const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    return { posts, lastVisible };
}

export async function getPostsByAuthor(
    authorId: string,
    status?: 'draft' | 'published' | 'pending_review'
): Promise<DiaryPost[]> {
    let q;
    if (status) {
        q = query(
            collection(db, POSTS),
            where('authorId', '==', authorId),
            where('status', '==', status),
            orderBy('updatedAt', 'desc')
        );
    } else {
        q = query(
            collection(db, POSTS),
            where('authorId', '==', authorId),
            orderBy('updatedAt', 'desc')
        );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ postId: d.id, ...d.data() } as DiaryPost));
}

export async function getPostsByTag(tag: string, limitCount: number = 20): Promise<DiaryPost[]> {
    const q = query(
        collection(db, POSTS),
        where('status', '==', 'published'),
        where('tags', 'array-contains', tag),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ postId: d.id, ...d.data() } as DiaryPost));
}

export async function getTrendingPosts(limitCount: number = 10): Promise<DiaryPost[]> {
    // Get posts from last 7 days sorted by views + likes
    const sevenDaysAgo = Timestamp.fromDate(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const q = query(
        collection(db, POSTS),
        where('status', '==', 'published'),
        where('publishedAt', '>=', sevenDaysAgo),
        orderBy('publishedAt', 'desc'),
        limit(50)
    );
    const snap = await getDocs(q);
    const posts = snap.docs.map(d => ({ postId: d.id, ...d.data() } as DiaryPost));
    // Sort by engagement score (views + likes * 2)
    posts.sort((a, b) => (b.viewsCount + b.likesCount * 2) - (a.viewsCount + a.likesCount * 2));
    return posts.slice(0, limitCount);
}

export async function incrementPostViews(postId: string): Promise<void> {
    await updateDoc(doc(db, POSTS, postId), {
        viewsCount: increment(1),
    });
}

// ─── Follows ───────────────────────────────────────────────────
export async function followWriter(followerId: string, followingId: string): Promise<void> {
    const followId = `${followerId}_${followingId}`;
    const batch = writeBatch(db);

    batch.set(doc(db, FOLLOWS, followId), {
        id: followId,
        followerId,
        followingId,
        createdAt: serverTimestamp(),
    });
    batch.update(doc(db, PROFILES, followingId), { followersCount: increment(1) });
    batch.update(doc(db, PROFILES, followerId), { followingCount: increment(1) });

    await batch.commit();
}

export async function unfollowWriter(followerId: string, followingId: string): Promise<void> {
    const followId = `${followerId}_${followingId}`;
    const batch = writeBatch(db);

    batch.delete(doc(db, FOLLOWS, followId));
    batch.update(doc(db, PROFILES, followingId), { followersCount: increment(-1) });
    batch.update(doc(db, PROFILES, followerId), { followingCount: increment(-1) });

    await batch.commit();
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const followId = `${followerId}_${followingId}`;
    const snap = await getDoc(doc(db, FOLLOWS, followId));
    return snap.exists();
}

export async function getFollowingIds(userId: string): Promise<string[]> {
    const q = query(collection(db, FOLLOWS), where('followerId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data().followingId);
}

export async function getFollowedPosts(userId: string, limitCount: number = 20): Promise<DiaryPost[]> {
    const followingIds = await getFollowingIds(userId);
    if (followingIds.length === 0) return [];

    // Firestore 'in' queries support up to 30 items
    const chunks = [];
    for (let i = 0; i < followingIds.length; i += 30) {
        chunks.push(followingIds.slice(i, i + 30));
    }

    const allPosts: DiaryPost[] = [];
    for (const chunk of chunks) {
        const q = query(
            collection(db, POSTS),
            where('authorId', 'in', chunk),
            where('status', '==', 'published'),
            orderBy('publishedAt', 'desc'),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        allPosts.push(...snap.docs.map(d => ({ postId: d.id, ...d.data() } as DiaryPost)));
    }

    // Sort all results by publishedAt desc
    allPosts.sort((a, b) => {
        const aTime = a.publishedAt?.toMillis() || 0;
        const bTime = b.publishedAt?.toMillis() || 0;
        return bTime - aTime;
    });
    return allPosts.slice(0, limitCount);
}

// ─── Likes ─────────────────────────────────────────────────────
export async function likePost(postId: string, userId: string): Promise<void> {
    const likeId = `${userId}_${postId}`;
    const batch = writeBatch(db);
    batch.set(doc(db, LIKES, likeId), {
        id: likeId,
        postId,
        userId,
        createdAt: serverTimestamp(),
    });
    batch.update(doc(db, POSTS, postId), { likesCount: increment(1) });
    await batch.commit();
}

export async function unlikePost(postId: string, userId: string): Promise<void> {
    const likeId = `${userId}_${postId}`;
    const batch = writeBatch(db);
    batch.delete(doc(db, LIKES, likeId));
    batch.update(doc(db, POSTS, postId), { likesCount: increment(-1) });
    await batch.commit();
}

export async function hasLiked(postId: string, userId: string): Promise<boolean> {
    const likeId = `${userId}_${postId}`;
    const snap = await getDoc(doc(db, LIKES, likeId));
    return snap.exists();
}

// ─── Comments ──────────────────────────────────────────────────
export async function addComment(comment: Omit<DiaryComment, 'id' | 'createdAt' | 'isDeleted'>): Promise<string> {
    const docRef = await addDoc(collection(db, COMMENTS), {
        ...comment,
        isDeleted: false,
        createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, POSTS, comment.postId), { commentsCount: increment(1) });
    return docRef.id;
}

export async function getComments(postId: string): Promise<DiaryComment[]> {
    const q = query(
        collection(db, COMMENTS),
        where('postId', '==', postId),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as DiaryComment));
}

export async function deleteComment(commentId: string, postId: string): Promise<void> {
    await updateDoc(doc(db, COMMENTS, commentId), { isDeleted: true });
    await updateDoc(doc(db, POSTS, postId), { commentsCount: increment(-1) });
}

// ─── Bookmarks ─────────────────────────────────────────────────
export async function bookmarkPost(postId: string, userId: string): Promise<void> {
    const bookmarkId = `${userId}_${postId}`;
    await setDoc(doc(db, BOOKMARKS, bookmarkId), {
        id: bookmarkId,
        postId,
        userId,
        createdAt: serverTimestamp(),
    });
}

export async function removeBookmark(postId: string, userId: string): Promise<void> {
    const bookmarkId = `${userId}_${postId}`;
    await deleteDoc(doc(db, BOOKMARKS, bookmarkId));
}

export async function isBookmarked(postId: string, userId: string): Promise<boolean> {
    const bookmarkId = `${userId}_${postId}`;
    const snap = await getDoc(doc(db, BOOKMARKS, bookmarkId));
    return snap.exists();
}

export async function getBookmarkedPosts(userId: string): Promise<DiaryPost[]> {
    const q = query(collection(db, BOOKMARKS), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const postIds = snap.docs.map(d => d.data().postId);

    const posts: DiaryPost[] = [];
    for (const pid of postIds) {
        const post = await getPost(pid);
        if (post && post.status === 'published') posts.push(post);
    }
    return posts;
}

// ─── Subscriptions ─────────────────────────────────────────────
export async function subscribeToWriter(sub: Omit<DiarySubscription, 'id' | 'subscribedAt' | 'isActive'>): Promise<string> {
    // Check if subscription already exists
    const q = query(
        collection(db, SUBSCRIPTIONS),
        where('subscriberId', '==', sub.subscriberId),
        where('writerId', '==', sub.writerId)
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
        // Reactivate if inactive
        const existingDoc = existing.docs[0];
        await updateDoc(existingDoc.ref, { isActive: true });
        return existingDoc.id;
    }

    const docRef = await addDoc(collection(db, SUBSCRIPTIONS), {
        ...sub,
        isActive: true,
        subscribedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function unsubscribeFromWriter(subscriptionId: string): Promise<void> {
    await updateDoc(doc(db, SUBSCRIPTIONS, subscriptionId), { isActive: false });
}

export async function getSubscription(subscriberId: string, writerId: string): Promise<DiarySubscription | null> {
    const q = query(
        collection(db, SUBSCRIPTIONS),
        where('subscriberId', '==', subscriberId),
        where('writerId', '==', writerId),
        where('isActive', '==', true)
    );
    const snap = await getDocs(q);
    return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as DiarySubscription);
}

export async function getWriterSubscribers(writerId: string): Promise<DiarySubscription[]> {
    const q = query(
        collection(db, SUBSCRIPTIONS),
        where('writerId', '==', writerId),
        where('isActive', '==', true)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as DiarySubscription));
}

// ─── Notifications ─────────────────────────────────────────────
export async function createNotification(notif: Omit<DiaryNotification, 'id' | 'createdAt' | 'isRead'>): Promise<void> {
    await addDoc(collection(db, NOTIFICATIONS), {
        ...notif,
        isRead: false,
        createdAt: serverTimestamp(),
    });
}

export function subscribeToNotifications(
    userId: string,
    callback: (notifications: DiaryNotification[]) => void
): () => void {
    const q = query(
        collection(db, NOTIFICATIONS),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(20)
    );
    return onSnapshot(q, snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as DiaryNotification)));
    });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
    const q = query(
        collection(db, NOTIFICATIONS),
        where('recipientId', '==', userId),
        where('isRead', '==', false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
    await batch.commit();
}

// ─── Reports ───────────────────────────────────────────────────
export async function reportPost(report: Omit<DiaryReport, 'id' | 'createdAt' | 'isResolved'>): Promise<void> {
    await addDoc(collection(db, REPORTS), {
        ...report,
        isResolved: false,
        createdAt: serverTimestamp(),
    });
}

// ─── File Upload ───────────────────────────────────────────────
export async function uploadDiaryImage(
    file: File,
    path: string
): Promise<string> {
    const storageRef = ref(storage, `diary/${path}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}
