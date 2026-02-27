import type { Metadata } from 'next';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const params = await props.params;
    const db = getAdminDb();
    if (!db) return { title: 'Player Profile | PPSU Basketball' };

    try {
        const docSnap = await db.collection('basketball_players').doc(params.id).get();
        if (!docSnap.exists) return { title: 'Player Not Found | PPSU Basketball' };

        const player = docSnap.data();
        const title = `${player?.name || 'Player'} #${player?.number || ''} | PPSU Basketball`;
        const description = `Explore the profile and stats for ${player?.name || 'the player'}. Find out more about their performance on the court.`;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                images: player?.headshot ? [{ url: player.headshot }] : [],
                type: 'profile',
            }
        };
    } catch {
        return { title: 'Player Profile | PPSU Basketball' };
    }
}

export default async function PlayerLayout({
    children,
    params: paramsPromise,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const params = await paramsPromise;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        'jobTitle': 'Basketball Player',
        'url': `https://www.theppsuchronicles.com/basketball/player/${params.id}`,
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {children}
        </>
    );
}
