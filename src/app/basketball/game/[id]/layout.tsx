import type { Metadata } from 'next';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const params = await props.params;
    const db = getAdminDb();
    if (!db) return { title: 'Game Detail | PPSU Basketball' };

    try {
        const docSnap = await db.collection('basketball_games').doc(params.id).get();
        if (!docSnap.exists) return { title: 'Game Not Found | PPSU Basketball' };

        const game = docSnap.data();
        let title = 'Basketball Game | PPSU Chronicles';
        let description = 'Follow the latest PPSU basketball game live stats, scores, and play-by-play.';

        if (game?.homeTeamId && game?.awayTeamId) {
            const hSnap = await db.collection('basketball_teams').doc(game.homeTeamId).get();
            const aSnap = await db.collection('basketball_teams').doc(game.awayTeamId).get();

            const home = hSnap.data()?.name || 'Home';
            const away = aSnap.data()?.name || 'Away';

            title = `${away} vs ${home} | PPSU Basketball`;
            description = `Live score and updates for ${away} vs ${home}. Catch all the action right here on PPSU Chronicles.`;
        }

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                type: 'website',
            }
        };
    } catch {
        return { title: 'Game Detail | PPSU Basketball' };
    }
}

export default async function GameLayout({
    children,
    params: paramsPromise,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const params = await paramsPromise;
    // Generate JSON-LD for SportsEvent
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        'name': 'PPSU Basketball Game',
        'sport': 'Basketball',
        'url': `https://www.theppsuchronicles.com/basketball/game/${params.id}`,
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
