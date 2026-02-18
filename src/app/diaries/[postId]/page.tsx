import { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
    const siteUrl = 'https://www.theppsuchronicles.com';
    const postUrl = `${siteUrl}/diaries/${postId}`;

    // Using Next.js image optimization to ensure the thumbnail is under 300KB for WhatsApp
    // 800px width is sufficient for a high-quality link preview
    const optimizedImageUrl = `${siteUrl}/_next/image?url=${encodeURIComponent(imageUrl)}&w=800&q=70`;

    return {
        title: `${title} | Student Diaries`,
        description,
        metadataBase: new URL(siteUrl),
        alternates: {
            canonical: `/diaries/${postId}`,
        },
        openGraph: {
            title,
            description,
            url: postUrl,
            siteName: 'The PPSU Chronicles',
            images: [
                {
                    url: optimizedImageUrl,
                    secureUrl: optimizedImageUrl,
                    width: 800,
                    height: 420,
                    alt: title,
                    type: 'image/jpeg',
                },
                {
                    url: `${siteUrl}/logo1.jpg`, // Fallback smaller image
                    width: 300,
                    height: 300,
                }
            ],
            locale: 'en_US',
            type: 'article',
            publishedTime: post.publishedAt instanceof Date ? post.publishedAt.toISOString() : undefined,
            authors: [post.authorName],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [optimizedImageUrl],
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
