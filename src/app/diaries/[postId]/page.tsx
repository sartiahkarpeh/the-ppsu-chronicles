import { Metadata } from 'next';
import { notFound } from 'next/navigation';
export const revalidate = 60;
import { getPostAdmin, getProfileAdmin } from '@/lib/diary/admin';
import DiaryPostClient from '@/components/diary/DiaryPostClient';
import { generateExcerpt } from '@/lib/diary/utils';

interface Props {
    params: Promise<{ postId: string }>;
}

// Generate dynamic metadata for SEO and social sharing
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { postId } = await params;
    const post = await getPostAdmin(postId);

    if (!post || post.status !== 'published') {
        return {
            title: 'Post Not Found - Student Diaries',
        };
    }

    const title = post.title;
    const description = post.subtitle || generateExcerpt(post.content || '', 160);
    const imageUrl = post.coverImage || 'https://www.theppsuchronicles.com/ppsu.png';
    const baseUrl = 'https://www.theppsuchronicles.com';
    const postUrl = `${baseUrl}/diaries/${postId}`;

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            url: postUrl,
            siteName: 'The PPSU Chronicles',
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
            locale: 'en_US',
            type: 'article',
            publishedTime: post.publishedAt instanceof Date ? post.publishedAt.toISOString() : undefined,
            authors: [post.authorName || 'Anonymous'],
        },
        twitter: {
            card: 'summary_large_image',
            title: title,
            description: description,
            images: [imageUrl],
            creator: '@PPSUChronicles',
            site: '@PPSUChronicles',
        },
    };
}

export default async function Page({ params }: Props) {
    const { postId } = await params;
    const post = await getPostAdmin(postId);

    if (!post) {
        notFound();
    }

    const author = await getProfileAdmin(post.authorId);

    // Serialize data for client component
    const serializedPost = {
        ...post,
        createdAt: (post as any).createdAt?.toISOString(),
        updatedAt: (post as any).updatedAt?.toISOString(),
        publishedAt: (post as any).publishedAt?.toISOString(),
    };

    const serializedAuthor = author ? {
        ...author,
        createdAt: (author as any).createdAt?.toISOString(),
    } : null;

    return (
        <DiaryPostClient
            postId={postId}
            initialPost={serializedPost}
            initialAuthor={serializedAuthor}
        />
    );
}
