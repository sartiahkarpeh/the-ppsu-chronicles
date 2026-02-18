// src/types/diary.ts
// TypeScript interfaces for all diary-related Firestore collections

import { Timestamp } from 'firebase/firestore';

export interface DiaryProfile {
    userId: string;
    displayName: string;
    avatar: string;
    bio: string;
    program: string;
    year: string;
    universityEmail: string;
    role: 'writer' | 'reader';
    isApproved: boolean;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    createdAt: Timestamp;
}

export interface DiaryPost {
    postId: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    title: string;
    subtitle: string;
    content: string;
    coverImage: string;
    tags: string[];
    status: 'draft' | 'published' | 'pending_review';
    publishedAt: Timestamp | null;
    updatedAt: Timestamp;
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    readTime: number;
}

export interface DiarySubscription {
    id: string;
    subscriberId: string;
    subscriberEmail: string;
    subscriberName: string;
    writerId: string;
    writerName: string;
    subscribedAt: Timestamp;
    isActive: boolean;
}

export interface DiaryFollow {
    id: string;
    followerId: string;
    followingId: string;
    createdAt: Timestamp;
}

export interface DiaryLike {
    id: string;
    postId: string;
    userId: string;
    createdAt: Timestamp;
}

export interface DiaryComment {
    id: string;
    postId: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    text: string;
    createdAt: Timestamp;
    isDeleted: boolean;
}

export interface DiaryNotification {
    id: string;
    recipientId: string;
    type: 'new_post' | 'new_follower' | 'new_comment' | 'new_like';
    message: string;
    link: string;
    isRead: boolean;
    createdAt: Timestamp;
}

export interface DiaryReport {
    id: string;
    postId: string;
    reportedBy: string;
    reason: string;
    description?: string;
    createdAt: Timestamp;
    isResolved: boolean;
}

export interface DiaryBookmark {
    id: string;
    postId: string;
    userId: string;
    createdAt: Timestamp;
}

// Pre-defined tags
export const DIARY_TAGS = [
    'Personal',
    'Poetry',
    'Opinion',
    'Campus Life',
    'Mental Health',
    'Motivation',
    'Travel',
    'Culture',
    'Technology',
    'Sports',
    'Love & Relationships',
    'Humor',
    'Academic',
    'Creative Writing',
    'Photography',
] as const;

export type DiaryTag = (typeof DIARY_TAGS)[number];
