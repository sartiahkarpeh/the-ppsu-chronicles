import type { Metadata } from 'next';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const params = await props.params;
    const db = getAdminDb();
    if (!db) return { title: 'Team Detail | PPSU Basketball' };

    try {
        const docSnap = await db.collection('basketball_teams').doc(params.id).get();
        if (!docSnap.exists) return { title: 'Team Not Found | PPSU Basketball' };

        const team = docSnap.data();
        const title = `${team?.name || 'Team'} | PPSU Basketball`;
        const description = `Follow the ${team?.name || 'team'} roster, schedule, and season stats on the PPSU Chronicles.`;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                images: team?.logo ? [{ url: team.logo }] : [],
                type: 'profile',
            }
        };
    } catch {
        return { title: 'Team Detail | PPSU Basketball' };
    }
}

export default async function TeamLayout({
    children,
    params: paramsPromise,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const params = await paramsPromise;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SportsTeam',
        'sport': 'Basketball',
        'url': `https://www.theppsuchronicles.com/basketball/team/${params.id}`,
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
