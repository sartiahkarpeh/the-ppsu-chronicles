import { NextRequest, NextResponse } from 'next/server';
import { getPostAdmin, getProfileAdmin } from '@/lib/diary/admin';

/**
 * Image proxy for diary post cover images.
 * Provides a clean, simple URL for social media crawlers (WhatsApp, Facebook, etc.)
 * that redirects to the actual Firebase Storage image.
 * 
 * Usage: /api/og/diary/image?postId=xxx or /api/og/diary/image?writerId=xxx
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const writerId = searchParams.get('writerId');

    let imageUrl: string | null = null;

    if (postId) {
        const post = await getPostAdmin(postId);
        if (post?.coverImage) {
            imageUrl = post.coverImage;
        }
    } else if (writerId) {
        const profile = await getProfileAdmin(writerId);
        if (profile?.avatar) {
            imageUrl = profile.avatar;
        }
    }

    // Fallback to default image
    if (!imageUrl) {
        return NextResponse.redirect(new URL('/ppsu.png', request.url));
    }

    // Redirect to the actual image — this avoids encoding issues with & in Firebase URLs
    return NextResponse.redirect(imageUrl, { status: 302 });
}
